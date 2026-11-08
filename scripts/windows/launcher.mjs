import { fork, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const dataDirectory = join(process.env.LOCALAPPDATA, "Masanao", "Data");
const pipeId = createHash("sha256").update(dataDirectory.toLowerCase()).digest("hex");
const pipe = `\\\\.\\pipe\\Masanao-${pipeId}`;
const url = "http://localhost:3000";

function openBrowser() {
  const browser = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
    stdio: "ignore",
    windowsHide: true,
  });
  browser.on("error", (error) => console.error(`Open ${url} in your browser. ${error.message}`));
}

async function askRunningInstance(action) {
  const connection = createConnection(pipe);
  try {
    await once(connection, "connect");
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  connection.setTimeout(65_000, () => connection.destroy(new Error("Masanao is busy. Try again shortly.")));
  let result = "";
  connection.setEncoding("utf8");
  connection.on("data", (chunk) => { result += chunk; });
  connection.write(`${action}\n`);
  await once(connection, "end");
  if (result !== "ok") throw new Error(result || "Masanao stopped responding. Try again.");
  return true;
}

async function reserveControlPipe(onCommand) {
  const control = createServer((connection) => {
    connection.setTimeout(65_000, () => connection.destroy());
    connection.on("error", () => connection.destroy());
    connection.once("data", (data) => onCommand(data.toString().trim(), connection));
  });
  control.listen(pipe);
  await once(control, "listening");
  return control;
}

async function listenOnLoopback(server, host) {
  server.listen(3000, host);
  try {
    await once(server, "listening");
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      throw new Error("Port 3000 is in use. Close the other app or run the development copy on port 3001.");
    }
    throw error;
  }
}

async function reserveIPv6Loopback() {
  const connections = new Set();
  const server = createServer((client) => {
    const backend = createConnection(3000, "127.0.0.1");
    connections.add(client);
    client.on("error", () => backend.destroy());
    backend.on("error", () => client.destroy());
    client.on("close", () => {
      connections.delete(client);
      backend.destroy();
    });
    backend.on("close", () => client.destroy());
    client.pipe(backend).pipe(client);
  });
  try {
    await listenOnLoopback(server, "::1");
  } catch (error) {
    if (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL") return;
    throw error;
  }
  return () => {
    for (const client of connections) client.destroy();
    server.close();
  };
}

async function launch(open) {
  if (existsSync(join(root, "updating"))) throw new Error("Masanao setup is running. Finish setup and try again.");
  let child;
  let childExit;
  let ready = false;
  let stopRequested = false;
  let shutdownTimer;
  let closeIPv6;
  const stopConnections = [];
  let control;

  function stop() {
    if (stopRequested) return;
    stopRequested = true;
    if (!child) return;
    if (child.connected) child.send("stop", () => {});
    shutdownTimer = setTimeout(() => child.kill(), 15_000);
  }

  try {
    control = await reserveControlPipe((action, connection) => {
      if (action === "stop") {
        stopConnections.push(connection);
        stop();
      } else if (action === "open") {
        if (stopRequested) connection.end("Masanao is shutting down. Try again shortly.");
        else if (ready) {
          openBrowser();
          connection.end("ok");
        } else {
          connection.end("Masanao is still starting. Try again shortly.");
        }
      } else if (action === "status" && ready && !stopRequested) {
        connection.end("ok");
      } else {
        connection.end("Unknown Masanao launcher command.");
      }
    });
  } catch (error) {
    if (error.code !== "EADDRINUSE") throw error;
    await askRunningInstance(open ? "open" : "status");
    return;
  }

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    if (existsSync(join(root, "updating"))) throw new Error("Masanao setup is running. Finish setup and try again.");
    // Reserve both addresses that browsers may choose for localhost.
    closeIPv6 = await reserveIPv6Loopback();
    const probe = createServer();
    await listenOnLoopback(probe, "127.0.0.1");
    await new Promise((resolve) => probe.close(resolve));
    const { prepareDatabase, runtimeEnvironment } = await import("./local-data.mjs");
    const env = runtimeEnvironment(dataDirectory, url);
    await prepareDatabase(root, dataDirectory, env);
    if (stopRequested) return;
    child = fork(join(root, "scripts", "windows", "next-process.cjs"), ["3000"], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "inherit", "ipc"],
      windowsHide: true,
    });
    childExit = once(child, "exit");
    let startupOutput = "";
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      if (ready) return;
      startupOutput = (startupOutput + chunk).slice(-4096);
      if (startupOutput.includes("Ready in")) {
        ready = true;
        if (open && !stopRequested) openBrowser();
      }
    });
    const [code] = await childExit;
    if (!stopRequested) throw new Error(`Masanao server stopped (exit code ${code ?? "unknown"}).`);
  } finally {
    clearTimeout(shutdownTimer);
    closeIPv6?.();
    for (const connection of stopConnections) connection.end("ok");
    control.close();
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

async function main() {
  const command = process.argv[2] ?? "start";
  if (command === "stop") {
    await askRunningInstance("stop");
    return;
  }
  if (command === "create-admin") {
    const control = await reserveControlPipe((_, connection) => connection.end("Masanao account setup is running. Try again shortly."));
    try {
      if (existsSync(join(root, "updating"))) throw new Error("Finish installing Masanao first.");
      const { createFirstAdmin, prepareDatabase, runtimeEnvironment } = await import("./local-data.mjs");
      const env = runtimeEnvironment(dataDirectory, url);
      await prepareDatabase(root, dataDirectory, env);
      await createFirstAdmin(dataDirectory, JSON.parse(readFileSync(0, "utf8")));
      console.log("The first administrator account was created.");
    } finally {
      control.close();
    }
    return;
  }
  if (command !== "start" && command !== "start-test") throw new Error("Unknown Masanao command.");
  await launch(command === "start");
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
