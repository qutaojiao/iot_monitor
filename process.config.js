module.exports = {
  apps: [{
    name: 'IoT Monitor',
    script: 'app.js',

    args: '',
    instances: 1,
    autorestart: true,
    watch: true,
    ignore_watch: ['node_modules', 'uploads', 'public/css/*.css'],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
