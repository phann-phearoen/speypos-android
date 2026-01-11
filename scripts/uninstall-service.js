import Service from 'node-windows';

const svc = new Service({
  name: 'SpeyPOS Local Server',
  script: 'C:\\path\\to\\your\\server.js', // Update this path to your server script
});

svc.on('uninstall', () => {
  console.log('Service uninstalled successfully.');
  console.log(`The service exists: ${svc.exists}`);
});

svc.on('error', (err) => {
  console.error('Error during uninstallation:', err);
});

svc.uninstall();
