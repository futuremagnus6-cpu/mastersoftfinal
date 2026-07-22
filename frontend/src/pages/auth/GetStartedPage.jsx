import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiShield, FiUserPlus, FiLogIn, FiArrowRight,
  FiShoppingBag, FiTrendingUp, FiBarChart2,
  FiCheckCircle, FiStar,
} from 'react-icons/fi';

function FloatingParticles() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][i % 4],
            opacity: 0.15,
          }}
          animate={{
            y: [0, -(15 + (i % 10) * 3), 0],
            opacity: [0.1, 0.4, 0.1],
            scale: [1, 1.3 + (i % 3) * 0.2, 1],
          }}
          transition={{
            duration: 3 + (i % 5) * 2,
            repeat: Infinity,
            delay: (i % 8) * 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingParticles />

      {/* Background gradient orbs */}
      <motion.div
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.07] dark:opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.1, 1], rotate: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.07] dark:opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, -15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="w-full max-w-5xl relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow">
              <FiShield className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">Magnus</span>
              <span className="text-2xl font-light text-gray-400 dark:text-gray-500 ml-1">OS</span>
            </div>
          </Link>
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent">
              Magnus OS
            </span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Your all-in-one business management platform. Choose your path to get started.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
          {/* Sign Up Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              to="/signup"
              className="group block relative h-full"
            >
              <div className="relative h-full p-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-1">
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20 group-hover:shadow-xl group-hover:shadow-primary-500/30 group-hover:scale-110 transition-all duration-300">
                    <FiUserPlus className="w-8 h-8 text-white" />
                  </div>

                  {/* Badge */}
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-4">
                    <FiStar className="w-3 h-3" />
                    14-Day Free Trial
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                    New to Magnus OS? Sign up and start your free trial. No credit card required — get full access to all features instantly.
                  </p>

                  {/* Benefits */}
                  <ul className="space-y-2.5 mb-6">
                    {[
                      'Full access to all features',
                      '14 days completely free',
                      'No credit card needed',
                      'Cancel anytime',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <FiCheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 group-hover:gap-3 transition-all flex items-center gap-2">
                      Get Started Free
                      <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="text-xs text-gray-400">Takes 2 minutes</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Sign In Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              to="/login"
              className="group block relative h-full"
            >
              <div className="relative h-full p-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-violet-500 dark:hover:border-violet-500 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1">
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20 group-hover:shadow-xl group-hover:shadow-violet-500/30 group-hover:scale-110 transition-all duration-300">
                    <FiLogIn className="w-8 h-8 text-white" />
                  </div>

                  {/* Badge */}
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-full text-xs font-medium text-violet-700 dark:text-violet-300 mb-4">
                    <FiShoppingBag className="w-3 h-3" />
                    Returning User
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign In</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                    Already have an account? Sign in to access your dashboard, manage your shops, and continue where you left off.
                  </p>

                  {/* Benefits */}
                  <ul className="space-y-2.5 mb-6">
                    {[
                      'Access your dashboard',
                      'Manage all your shops',
                      'View reports & analytics',
                      'Continue your work',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <FiCheckCircle className="w-4 h-4 text-violet-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 group-hover:gap-3 transition-all flex items-center gap-2">
                      Sign In to Your Account
                      <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="text-xs text-gray-400">Welcome back</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-6 md:gap-10 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
            {[
              { icon: FiShield, text: '256-bit SSL Encrypted' },
              { icon: FiTrendingUp, text: '10,000+ Businesses' },
              { icon: FiBarChart2, text: '99.9% Uptime SLA' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <item.icon className="w-4 h-4 text-primary-500" />
                {item.text}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-6"
        >
          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
