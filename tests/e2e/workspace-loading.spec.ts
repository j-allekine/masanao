import { createServer, request as upstreamRequest } from "node:http";
import { connect, type AddressInfo, type Socket } from "node:net";
import { expect, test } from "@playwright/test";

test("real streamed Items fallback retains one shell and the saved sidebar before completion", async ({ page, context }, info) => {
  test.setTimeout(90_000);
  const origin = process.env.BETTER_AUTH_URL!;
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin },
  })).status()).toBe(200);
  await context.addCookies([{ name: "sidebar_state", value: "false", url: origin }]);
  await page.setViewportSize({ width: 1024, height: 768 });

  // Forward real HTML/assets. Hold only the upstream bytes after its completed
  // Suspense fallback, so no synthetic loading markup or app test hook is needed.
  let release = () => {};
  let observed!: () => void;
  let rejectShell!: (error: Error) => void;
  const shellSent = new Promise<void>((resolve, reject) => { observed = resolve; rejectShell = reject; });
  const proxy = createServer((request, response) => {
    const upstream = upstreamRequest(new URL(request.url!, origin), {
      method: request.method,
      headers: { ...request.headers, host: new URL(origin).host, "accept-encoding": "identity" },
    }, (incoming) => {
      const headers = { ...incoming.headers };
      delete headers["content-length"];
      delete headers["transfer-encoding"];
      response.writeHead(incoming.statusCode!, headers);
      if (request.url !== "/items" || !incoming.headers["content-type"]?.includes("text/html")) {
        incoming.pipe(response);
        return;
      }
      let prefix = Buffer.alloc(0);
      let pending: Buffer[] = [];
      let held = false;
      let released = false;
      let ended = false;
      release = () => {
        released = true;
        for (const chunk of pending) response.write(chunk);
        pending = [];
        if (ended) response.end();
      };
      incoming.on("data", (chunk: Buffer) => {
        if (released) { response.write(chunk); return; }
        if (held) { pending.push(chunk); return; }
        prefix = Buffer.concat([prefix, chunk]);
        const html = prefix.toString("utf8");
        const heading = /Loading (?:<!-- -->)?Items/.exec(html);
        const boundary = heading ? html.indexOf("<!--/$-->", heading.index) : -1;
        if (boundary < 0) return;
        const split = Buffer.byteLength(html.slice(0, boundary + "<!--/$-->".length));
        response.write(prefix.subarray(0, split));
        pending.push(prefix.subarray(split));
        prefix = Buffer.alloc(0);
        held = true;
        observed();
      });
      incoming.on("end", () => {
        ended = true;
        if (!held) {
          response.end(prefix);
          rejectShell(new Error("Upstream Items response did not contain its real loading fallback boundary"));
        } else if (released) response.end();
      });
    });
    upstream.on("error", error => { rejectShell(error); response.destroy(error); });
    request.pipe(upstream);
  });
  // Dev hydration also needs its real HMR websocket, forwarded unchanged.
  const upgrades = new Set<Socket>();
  const clients = new Set<Socket>();
  proxy.on("connection", socket => { clients.add(socket); socket.on("close", () => clients.delete(socket)); });
  proxy.on("upgrade", (request, socket, head) => {
    const target = new URL(origin);
    const upstream = connect(Number(target.port), "127.0.0.1", () => {
      const headers = Object.entries({ ...request.headers, host: target.host }).map(([name, value]) => `${name}: ${value}`).join("\r\n");
      upstream.write(`${request.method} ${request.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
      upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upgrades.add(upstream);
    upstream.on("error", () => socket.destroy());
    upstream.on("close", () => { upgrades.delete(upstream); socket.destroy(); });
    socket.on("error", () => upstream.destroy());
    socket.on("close", () => upstream.destroy());
  });
  await new Promise<void>(resolve => proxy.listen(0, "127.0.0.1", resolve));
  try {
    const port = (proxy.address() as AddressInfo).port;
    await Promise.all([page.goto(`http://localhost:${port}/items`, { waitUntil: "commit" }), shellSent]);
    await expect(page.getByRole("heading", { level: 1, name: "Loading Items", exact: true })).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('[data-slot="workspace-header"]')).toHaveCount(1);
    await expect(page.locator('[data-slot="sidebar"][data-state]')).toHaveAttribute("data-state", "collapsed");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("items-real-loading.png"), animations: "disabled" });
    release();
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Items", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Loading Items", exact: true })).toHaveCount(0);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator('[data-slot="sidebar"][data-state]')).toHaveAttribute("data-state", "collapsed");
  } finally {
    release();
    for (const socket of upgrades) socket.destroy();
    for (const socket of clients) socket.destroy();
    proxy.closeAllConnections();
    await new Promise<void>(resolve => proxy.close(() => resolve()));
  }
});
