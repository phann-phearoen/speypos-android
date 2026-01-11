import { Service } from 'node-windows';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.join(projectRoot, 'speypos-local');
const frontendDir = path.join(projectRoot, 'speypos-pwa');
const frontendBuildDir = path.join(frontendDir, 'dist');
const backendPublicDir = path.join(backendDir, 'public');
const serviceScriptPath = path.join(backendDir, 'src', 'index.js');

// --- Helper Functions ---
function log(message) {
  console.log(`[DEPLOY] ${message}`);
}

function execute(command, cwd) {
  log(`Executing: ${command} in ${cwd}`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    log(`SUCCESS: ${command}`);
  } catch (error) {
    console.error(`[DEPLOY] ERROR: Failed to execute '${command}'.`);
    console.error(error);
    process.exit(1); // Exit with error
  }
}

// --- Deployment Steps ---
try {
  // 1. Install frontend dependencies
  execute('npm install', frontendDir);

  // 2. Build the frontend application
  execute('npm run build', frontendDir);

  // 3. Copy frontend build to backend public directory
  log(`Removing old public directory: ${backendPublicDir}`);
  fs.removeSync(backendPublicDir);
  log(`Copying ${frontendBuildDir} to ${backendPublicDir}`);
  fs.copySync(frontendBuildDir, backendPublicDir);
  log('Frontend assets copied successfully.');

  // 4. Install backend dependencies
  execute('npm install', backendDir);

  // 5. Configure and install the Windows Service
  log('Configuring Windows service...');
  const svc = new Service({
    name: 'SpeyPOS Local Server',
    description: 'The primary backend service for the SpeyPOS application.',
    script: serviceScriptPath,
    nodeOptions: ['--harmony', '--max-old-space-size=256'],
    env: {
      name: 'NODE_ENV',
      value: 'production',
    },
  });

  svc.on('install', () => {
    log('Service installed successfully.');
    svc.start();
    log('Service started.');
    log('Deployment complete! SpeyPOS should be accessible at http://localhost:8080');
  });

  svc.on('alreadyinstalled', () => {
    log('Service is already installed. Restarting service...');
    svc.restart();
  });
  
  svc.on('restart', () => {
    log('Service restarted.');
    log('Deployment complete! SpeyPOS should be accessible at http://localhost:8080');
  });

  svc.on('error', (err) => {
    console.error('[DEPLOY] Service error:', err);
    process.exit(1);
  });

  log('Installing service...');
  svc.install();

} catch (error) {
  console.error('[DEPLOY] A critical error occurred during deployment:');
  console.error(error);
  process.exit(1);
}