const fs = require('fs');
const path = require('path');

// Fallback cerdas: Baca port kustom dari .env.local / .env jika ada
let port = process.env.PORT || '3000';
try {
  const envLocalPath = path.join(__dirname, '.env.local');
  const envPath = path.join(__dirname, '.env');
  const targetEnv = fs.existsSync(envLocalPath) ? envLocalPath : (fs.existsSync(envPath) ? envPath : null);
  if (targetEnv) {
    const content = fs.readFileSync(targetEnv, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [k, ...v] = trimmed.split('=');
        if (k && k.trim() === 'PORT' && v.length > 0) {
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (val) port = val;
        }
      }
    });
  }
} catch (_) {}

module.exports = {
  apps: [
    {
      name: 'pick-your-photo',
      script: 'node_modules/next/dist/bin/next',
      args: `start -p ${port}`,
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: port
      },
      max_memory_restart: '500M',
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      time: true
    }
  ]
};
