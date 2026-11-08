const nextCli = require.resolve("next/dist/bin/next");

function shutdown() {
  if (!process.emit("SIGTERM", "SIGTERM")) process.exit(0);
}

process.on("message", (message) => {
  if (message === "stop") shutdown();
});
process.on("disconnect", shutdown);

process.argv = [process.execPath, nextCli, "start", "--hostname", "127.0.0.1", "--port", process.argv[2]];
require(nextCli);
