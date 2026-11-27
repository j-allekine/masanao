import { spawn } from "node:child_process";

export function openBrowser(url) {
  const browser = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
    stdio: "ignore",
    // rundll32 is a GUI program. Hiding it propagates SW_HIDE to some browsers.
    // The server remains hidden; the user's browser must be shown normally.
    windowsHide: false,
  });
  browser.on("error", (error) => console.error(`Open ${url} in your browser. ${error.message}`));
  return browser;
}
