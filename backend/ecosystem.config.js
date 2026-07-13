// ════════════════════════════════════════════════════════════════
// PM2 Ecosystem Configuration
// ════════════════════════════════════════════════════════════════
// Used for Hostinger VPS deployments.
// Hostinger Managed Node.js hosting uses its own process manager
// (you can ignore this file for Managed hosting).
//
// Commands:
//   pm2 start backend/ecosystem.config.js     # Start the app
//   pm2 save                                  # Save process list
//   pm2 startup                               # Auto-start on reboot
//   pm2 logs magnus-backend                   # View logs
//   pm2 restart backend/ecosystem.config.js   # Restart
// ════════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: 'magnus-backend',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_file: './backend/.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
      kill_timeout: 5000,
    },
  ],
};
