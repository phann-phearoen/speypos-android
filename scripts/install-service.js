const { Service } = require('node-windows');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const process = require('process');

// --- Configuration ---
// __dirname is the directory of the current script (i.e., /scripts)
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
async function deploy() {
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

    // 5. Install Puppeteer browser
    log('Installing Puppeteer browser...');
    execute('npx puppeteer browsers install chrome --path data/puppeteer', backendDir);
    log('Puppeteer browser installed successfully.');

    // 6. Configure and install the Windows Service
    log('Configuring Windows service...');
    const svc = new Service({
      name: 'SpeyPOS Local Server',
      description: 'The primary backend service for the SpeyPOS application.',
      script: serviceScriptPath,
      nodeOptions: ['--harmony', '--max-old-space-size=2048'],
      // Add the working directory
      cwd: backendDir,
      env: {
        name: 'NODE_ENV',
        value: 'production',
      },
    });

    const installService = () => new Promise((resolve, reject) => {
      svc.on('install', () => {
        log('Service installed successfully.');
        svc.start();
        log('Service started.');
        log('Deployment complete!');
        resolve();
      });

      svc.on('alreadyinstalled', () => {
        log('Service is already installed. Restarting service...');
        svc.restart();
      });
      
      svc.on('restart', () => {
        log('Service restarted.');
        log('Deployment complete!');
        resolve();
      });

      svc.on('error', (err) => {
        console.error('[DEPLOY] Service error:', err);
        reject(err);
      });

      log('Installing service...');
      svc.install();
    });

    await installService();

  } catch (error) {
    console.error('[DEPLOY] A critical error occurred during deployment:');
    console.error(error);
    process.exit(1);
  }
}

deploy();
