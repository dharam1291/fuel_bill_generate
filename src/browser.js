const fs = require("fs");
const path = require("path");

function getBrowserLaunchOptions() {
  const candidates = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(process.env.HOME || "", "Library/Caches/ms-playwright"),
  ].filter(Boolean);

  for (const base of candidates) {
    if (!fs.existsSync(base)) continue;
    for (const folder of fs.readdirSync(base)) {
      if (!folder.startsWith("chromium_headless_shell-")) continue;
      const shellDir = path.join(base, folder);
      for (const sub of fs.readdirSync(shellDir)) {
        const executable = path.join(shellDir, sub, "chrome-headless-shell");
        if (fs.existsSync(executable)) {
          return { executablePath: executable, headless: true };
        }
      }
    }
  }

  for (const base of candidates) {
    if (!fs.existsSync(base)) continue;
    for (const folder of fs.readdirSync(base)) {
      if (!folder.startsWith("chromium-")) continue;
      if (folder.includes("headless_shell")) continue;
      const chromeDir = path.join(base, folder);
      for (const sub of fs.readdirSync(chromeDir)) {
        const executable = path.join(chromeDir, sub, "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
        if (fs.existsSync(executable)) {
          return { executablePath: executable, headless: true };
        }
        const chromeBin = path.join(chromeDir, sub, "chrome");
        if (fs.existsSync(chromeBin)) {
          return { executablePath: chromeBin, headless: true };
        }
      }
    }
  }

  return { headless: true, channel: "chrome" };
}

async function waitForForm(page) {
  await page.dispatchEvent("body", "mousemove");
  await page.dispatchEvent("body", "click");
  await page.waitForSelector("#fs-fuel-rate", { timeout: 20000 });
}

module.exports = {
  getBrowserLaunchOptions,
  waitForForm,
};
