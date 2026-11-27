import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { openBrowser } from "../scripts/windows/open-browser.mjs";

test("the real browser subprocess receives a visible-window startup setting", { skip: process.platform !== "win32" }, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "masanao-browser-launch-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const source = join(directory, "BrowserProbe.cs");
  const capture = join(directory, "startup.txt");
  // A GUI executable replaces the URL handler and records the actual Windows
  // startup flags received from Node. No real browser or console is opened.
  writeFileSync(source, `
    using System; using System.IO; using System.Runtime.InteropServices;
    class BrowserProbe {
      [StructLayout(LayoutKind.Sequential)] struct Startup {
        public uint cb; public IntPtr reserved, desktop, title;
        public uint x, y, width, height, charsX, charsY, fill, flags;
        public ushort show, reservedSize;
        public IntPtr reservedData, input, output, error;
      }
      [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern void GetStartupInfoW(out Startup info);
      static void Main(string[] args) {
        Startup info; GetStartupInfoW(out info);
        File.WriteAllText(Environment.GetEnvironmentVariable("MASANAO_BROWSER_PROBE"),
          info.flags + ";" + info.show + ";" + string.Join(" ", args));
      }
    }
  `);
  const compiled = spawnSync(join(process.env.WINDIR, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"), [
    "/nologo", "/target:winexe", `/out:${join(directory, "rundll32.exe")}`, source,
  ], { windowsHide: true, encoding: "utf8" });
  assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
  const previousDirectory = process.cwd();
  const previousCapture = process.env.MASANAO_BROWSER_PROBE;
  let child;
  try {
    process.chdir(directory);
    process.env.MASANAO_BROWSER_PROBE = capture;
    child = openBrowser("http://localhost:3000");
  } finally {
    process.chdir(previousDirectory);
    if (previousCapture === undefined) delete process.env.MASANAO_BROWSER_PROBE;
    else process.env.MASANAO_BROWSER_PROBE = previousCapture;
  }
  assert.equal((await once(child, "exit"))[0], 0);
  const [flags, show, argumentsText] = readFileSync(capture, "utf8").split(";");
  assert.equal(argumentsText, "url.dll,FileProtocolHandler http://localhost:3000");
  assert.equal((Number(flags) & 1) !== 0 && Number(show) === 0, false,
    "The browser inherited SW_HIDE and can start invisibly");
});
