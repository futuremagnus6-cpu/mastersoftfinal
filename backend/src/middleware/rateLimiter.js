/**
 * ─── Tiered Rate Limiter ───────────────────────────────────────
 *
 *  Provides configurable rate-limit middleware for four tiers:
 *
 *   1. Auth IP       — Per-IP limits on authentication routes
 *   2. Auth Account  — Per-account (email/phone) limits with
 *                      exponential backoff instead of hard lockout
 *   3. Public        — Moderate limits on public endpoints
 *   4. API           — Looser limits on authenticated user actions
 *
 *  All thresholds are configurable via:
 *    - Environment variables (highest priority)
 *    - PlatformConfig document in MongoDB (dynamic, runtime)
 *    - In-code defaults (lowest priority)
 *
 * ─── Exponential Backoff ───────────────────────────────────────
 *
 *  For auth routes, a per-account counter tracks cumulative failed
 *  attempts until a successful authentication resets it.  The
 *  `max` value for the account-based limiter shrinks exponentially
 *  with each failure:
 *
 *      max = max(1, floor(baseMax / backoffFactor ^ failedAttempts))
 *
 *  Example with baseMax=5, factor=2:
 *    0 fails → 5 attempts allowed per window
 *    1 fail  → 2 attempts
 *    2 fails → 1 attempt
 *    3+ fails → 1 attempt (floor)
 *
 *  A successful authentication resets the failure counter.
 * ───────────────────────────────────────────────────────────────
 */

const rateLimit = require('express-rate-limit');
const PlatformConfig = require('../models/PlatformConfig');

// ═══════════════════════════════════════════════════════════════
//  Defaults (lowest-priority fallback)
// ═══════════════════════════════════════════════════════════════

const DEFAULTS = Object.freeze({
  // Auth — IP
  authIpMax: 10,
  authIpWindowMs: 15 * 60 * 1000, // 15 minutes
  // Auth — Account
  authAccountBaseMax: 5,
  authAccountBackoffFactor: 2,
  authAccountWindowMs: 15 * 60 * 1000, // 15 minutes
  // Public
  publicMax: 30,
  publicWindowMs: 15 * 60 * 1000,
  // API (authenticated)
  apiMax: 100,
  apiWindowMs: 15 * 60 * 1000,
});

/**
 * Build a config object from environment variables (highest priority).
 * Falls back to code defaults if a var is not set or unparseable.
 */
function envOverrides() {
  return {
    authIpMax:
      maybeInt(process.env.AUTH_RATE_LIMIT_IP_MAX) ?? DEFAULTS.authIpMax,
    authIpWindowMs:
      maybeInt(process.env.AUTH_RATE_LIMIT_IP_WINDOW_MS) ?? DEFAULTS.authIpWindowMs,
    authAccountBaseMax:
      maybeInt(process.env.AUTH_RATE_LIMIT_ACCOUNT_BASE_MAX) ?? DEFAULTS.authAccountBaseMax,
    authAccountBackoffFactor:
      maybeFloat(process.env.AUTH_RATE_LIMIT_ACCOUNT_BACKOFF_FACTOR) ??
      DEFAULTS.authAccountBackoffFactor,
    authAccountWindowMs:
      maybeInt(process.env.AUTH_RATE_LIMIT_ACCOUNT_WINDOW_MS) ??
      DEFAULTS.authAccountWindowMs,
    publicMax:
      maybeInt(process.env.PUBLIC_RATE_LIMIT_MAX) ?? DEFAULTS.publicMax,
    publicWindowMs:
      maybeInt(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS) ?? DEFAULTS.publicWindowMs,
    apiMax: maybeInt(process.env.API_RATE_LIMIT_MAX) ?? DEFAULTS.apiMax,
    apiWindowMs:
      maybeInt(process.env.API_RATE_LIMIT_WINDOW_MS) ?? DEFAULTS.apiWindowMs,
  };
}

function maybeInt(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}
function maybeFloat(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

// ═══════════════════════════════════════════════════════════════
//  Cached merged config
// ═══════════════════════════════════════════════════════════════

let mergedConfig = { ...DEFAULTS, ...envOverrides() };
let cacheLastUpdated = 0;
const CACHE_TTL_MS = 60_000; // Refresh from DB every 60 s

/**
 * Merge PlatformConfig document fields into the in-memory config.
 * Environment variables always win over DB values.
 */
async function refreshConfig() {
  try {
    const pc = await PlatformConfig.getConfig();
    const dbConfig = {
      authIpMax: pc.authRateLimitIpMax ?? DEFAULTS.authIpMax,
      authIpWindowMs:
        (pc.authRateLimitIpWindow ?? DEFAULTS.authIpWindowMs / 60_000) * 60_000,
      authAccountBaseMax:
        pc.authRateLimitAccountBaseMax ?? DEFAULTS.authAccountBaseMax,
      authAccountBackoffFactor:
        pc.authRateLimitAccountBackoffFactor ?? DEFAULTS.authAccountBackoffFactor,
      authAccountWindowMs:
        (pc.authRateLimitAccountWindow ?? DEFAULTS.authAccountWindowMs / 60_000) *
        60_000,
      publicMax: pc.publicRateLimitMax ?? DEFAULTS.publicMax,
      publicWindowMs:
        (pc.publicRateLimitWindow ?? DEFAULTS.publicWindowMs / 60_000) * 60_000,
      apiMax: pc.apiRateLimitMax ?? DEFAULTS.apiMax,
      apiWindowMs:
        (pc.apiRateLimitWindow ?? DEFAULTS.apiWindowMs / 60_000) * 60_000,
    };
    // Merge: env > db > defaults
    mergedConfig = { ...DEFAULTS, ...dbConfig, ...envOverrides() };
  } catch {
    // DB unreachable — keep existing config as-is
  }
  cacheLastUpdated = Date.now();
}

/**
 * Return the current merged config, refreshing from DB if the cache
 * has expired.
 */
async function getConfig() {
  if (Date.now() - cacheLastUpdated > CACHE_TTL_MS) {
    await refreshConfig();
  }
  return mergedConfig;
}

// Immediate refresh so the first request gets fresh config
refreshConfig();
// Periodic refresh so admin UI changes propagate without restart
setInterval(refreshConfig, CACHE_TTL_MS);

// ═══════════════════════════════════════════════════════════════
//  Per-account failure tracker (exponential-backoff state)
// ═══════════════════════════════════════════════════════════════

const accountFailures = new Map();

// Evict stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // keep 24 h max
  for (const [key, entry] of accountFailures.entries()) {
    if (entry.lastAttemptAt < cutoff) accountFailures.delete(key);
  }
}, 5 * 60_000);

/** Return the cumulative failure count for an account identifier. */
function getFailureCount(identifier) {
  if (!identifier) return 0;
  const entry = accountFailures.get(String(identifier).toLowerCase());
  return entry ? entry.count : 0;
}

/** Increment the failure count. */
function recordFailure(identifier) {
  if (!identifier) return;
  const key = String(identifier).toLowerCase();
  const prev = accountFailures.get(key) || { count: 0, lastAttemptAt: 0 };
  prev.count += 1;
  prev.lastAttemptAt = Date.now();
  accountFailures.set(key, prev);
}

/** Reset (clear) the failure count — called after a successful auth. */
function clearFailures(identifier) {
  if (!identifier) return;
  accountFailures.delete(String(identifier).toLowerCase());
}

// ═══════════════════════════════════════════════════════════════
//  Helper — resolve an account identifier from the request
// ═══════════════════════════════════════════════════════════════

function accountIdentifier(req) {
  return req.body?.email || req.body?.phone || '';
}

// ═══════════════════════════════════════════════════════════════
//  Limiter Factories
// ═══════════════════════════════════════════════════════════════

// ─── 1. Auth IP Limiter ───────────────────────────────────────

/**
 * Stricter per-IP limit for authentication endpoints.
 * Ideal for blocking brute-force attempts from a single IP.
 */
function createAuthIpLimiter() {
  return rateLimit({
    windowMs: DEFAULTS.authIpWindowMs, // placeholder; resolved per-request
    max: async () => (await getConfig()).authIpMax,
    message: {
      success: false,
      message:
        'Too many authentication attempts from this IP. Please try again later.',
      code: 'IP_RATE_LIMITED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown',
  });
}

// ─── 2. Auth Account Limiter ──────────────────────────────────

/**
 * Per-account (email/phone) limiter with exponential backoff.
 *
 * - Only failed requests consume the rate-limit window.
 * - On a successful authentication the failure count resets.
 * - The `max` value shrinks exponentially with each failure.
 */
function createAuthAccountLimiter() {
  return rateLimit({
    windowMs: DEFAULTS.authAccountWindowMs,
    max: async (req) => {
      const cfg = await getConfig();
      const id = accountIdentifier(req);
      const failures = getFailureCount(id);
      return Math.max(
        1,
        Math.floor(
          cfg.authAccountBaseMax / Math.pow(cfg.authAccountBackoffFactor, failures),
        ),
      );
    },
    message: {
      success: false,
      message:
        'Too many attempts for this account. Please wait before trying again.',
      code: 'ACCOUNT_RATE_LIMITED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `auth:account:${accountIdentifier(req).toLowerCase() || req.ip}`,
    /**
     * Only count requests that failed (status >= 400).
     * On success, reset the exponential-backoff counter.
     */
    requestWasSuccessful: (req, res) => {
      const id = accountIdentifier(req);
      if (res.statusCode < 400) {
        if (id) clearFailures(id);
        return true; // don't count this request
      }
      if (id && res.statusCode === 401) recordFailure(id);
      return false; // count the failed request
    },
  });
}

// ─── 3. Public Limiter ────────────────────────────────────────

/** Moderate per-IP limit for public (unauthenticated) endpoints. */
function createPublicLimiter() {
  return rateLimit({
    windowMs: DEFAULTS.publicWindowMs,
    max: async () => (await getConfig()).publicMax,
    message: {
      success: false,
      message: 'Too many requests. Please slow down.',
      code: 'RATE_LIMITED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown',
  });
}

// ─── 4. API Limiter ───────────────────────────────────────────

/**
 * Looser per-user/per-IP limit for authenticated API routes.
 *
 * Automatically skips auth routes (/api/auth/*), health check
 * (/api/health), and contact (/api/contact) since those have
 * dedicated limiters.
 */
function createApiLimiter() {
  return rateLimit({
    windowMs: DEFAULTS.apiWindowMs,
    max: async (req) => {
      // If the user is authenticated, give them a higher limit
      if (req.userId) {
        return (await getConfig()).apiMax;
      }
      // Unauthenticated requests get a lower limit
      return Math.max(20, Math.floor((await getConfig()).apiMax / 2));
    },
    message: {
      success: false,
      message: 'Too many API requests. Please slow down.',
      code: 'API_RATE_LIMITED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.userId?.toString() || req.ip || req.connection.remoteAddress || 'unknown',
    skip: (req) => {
      const path = req.path || req.url || '';
      return (
        path.startsWith('/auth/') ||
        path === '/health' ||
        path.startsWith('/contact') ||
        path.startsWith('/payments/')
      );
    },
  });
}

// ═══════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════

module.exports = {
  createAuthIpLimiter,
  createAuthAccountLimiter,
  createPublicLimiter,
  createApiLimiter,
  getConfig,
  /** Exposed for testing: reset the account-failure store */
  _resetFailures: () => accountFailures.clear(),
};
