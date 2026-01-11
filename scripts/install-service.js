import Service from 'node-windows';

const svc = new Service({
  name: 'SpeyPOS Local Server',
  description: 'SpeyPOS local server for local POS backend',
  script: 'C:\\path\\to\\your\\server.js', // Update this path to your server script

  nodeOptions: [ '--max-old-space-size=256' ], // Optional: Increase memory limit if needed

  env: {
    name: 'NODE_ENV',
    value: 'production'
  }
});

svc.on('install', () => {
  console.log('Service installed successfully.');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed.');
});

svc.on('error', (err) => {
  console.error('Error during installation:', err);
});

svc.install();
