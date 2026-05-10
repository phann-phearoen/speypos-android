import puppeteer from "puppeteer";
import { logger } from "../../utils/logger.js";
import path from "path";
import fs from "fs";
import { paths } from "../../config/paths.js";

function getExecutablePath() {
  const chromePath = paths.puppeteerChromeDir;
  if (!fs.existsSync(chromePath)) {
    if (process.env.PRINTER_NAME === "CONSOLE") {
      logger.info(
        "Puppeteer cache directory not found. Falling back to local default Chromium."
      );
      return null;
    }
    logger.error("Puppeteer cache directory not found at:", chromePath);
    return null;
  }

  const platformDirs = fs.readdirSync(chromePath);
  const platformDir = platformDirs.find((f) => f.match(/win(32|64)-/)); // Match win32 or win64

  if (!platformDir) {
    logger.error(
      "Platform-specific Chrome directory not found in:",
      chromePath
    );
    return null;
  }

  // The platformDir is a subdirectory of chromePath, e.g., 'win64-143.0.7499.192'
  // Inside it, the chrome-win directory is named 'chrome-win64' or 'chrome-win32'
  const platformDirPath = path.join(chromePath, platformDir);
  const chromeWinDirs = fs.readdirSync(platformDirPath);
  const chromeWinDir = chromeWinDirs.find((d) => d.startsWith("chrome-win"));
  if (!chromeWinDir) {
    logger.error("chrome-win directory not found in:", platformDirPath);
    return null;
  }

  const exePath = path.join(platformDirPath, chromeWinDir, "chrome.exe");
  if (!fs.existsSync(exePath)) {
    logger.error("chrome.exe not found at:", exePath);
    return null;
  }

  logger.info(`Found bundled Chrome executable at: ${exePath}`);
  return exePath;
}

let browserPromise = null;

export async function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser();
  }

  try {
    const browser = await browserPromise;

    await browser.version(); // This will throw if the browser is disconnected
    return browser;
  } catch (error) {
    logger.warn(
      "Puppeteer browser instance was disconnected. Relaunching a new instance."
    );
    browserPromise = launchBrowser();
    return await browserPromise;
  }
}

async function launchBrowser() {
  const executablePath = getExecutablePath();
  if (!executablePath && process.env.PRINTER_NAME !== "CONSOLE") {
    throw new Error(
      "Could not find bundled Chrome executable. Make sure it was installed during deployment."
    );
  }

  const launchOptions = {
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  } else {
    launchOptions.channel = "chrome";
  }

  return await puppeteer.launch(launchOptions);
}

export async function warmUpBrowser() {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  await page.close();
  logger.info("Puppeteer browser warmed up and ready for PDF generation.");
}

export async function closeBrowser() {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      await browser.close();
      logger.info("Puppeteer browser instance closed.");
    } catch (error) {
      logger.error("Error closing Puppeteer browser instance:", error);
    }
    browserPromise = null;
  }
}
