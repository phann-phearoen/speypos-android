const { Service } = require('node-windows');
const path = require('path');
const fs = require('fs-extra');

// --- Configuration ---
// __dirname is the directory of the current script (i.e., /scripts)
const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.join(projectRoot, 'speypos-local');
const serviceScriptPath = path.join(backendDir, 'src', 'index.js');
const backendPublicDir = path.join(backendDir, 'public');

function log(message) {
  console.log(`[UNINSTALL] ${message}`);
}

// --- Service Configuration ---
const svc = new Service({
  name: 'SpeyPOS Local Server',
  description: 'The primary backend service for the SpeyPOS application.',
  script: serviceScriptPath,
});

// --- Uninstall Steps ---
svc.on('uninstall', () => {
  log('Service uninstalled successfully.');
  
  // Remove the copied frontend assets
  try {
    log(`Removing frontend assets directory: ${backendPublicDir}`);
    fs.removeSync(backendPublicDir);
    log('Directory removed successfully.');
    log('Uninstallation complete.');
  } catch (error) {
    console.error(`[UNINSTALL] Error removing directory: ${backendPublicDir}`);
    console.error(error);
  }
});

svc.on('notuninstalled', () => {
  log('Service was not uninstalled (might not exist).');
});

svc.on('error', (err) => {
  console.error('[UNINSTALL] Service error:', err);
});

log('Uninstalling service...');
svc.uninstall();
