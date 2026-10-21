import http from "node:http";
import worker from "../dist/server/index.js";

const host = "127.0.0.1";
const { process } = globalThis;
const port = Number(process.env.PORT ?? 4175);

const server = http.createServer(async (incoming, outgoing) => {
  try {
    const request = new globalThis.Request(`http://${host}:${port}${incoming.url ?? "/"}`, {
      method: incoming.method,
    });
    const response = await worker.fetch(request, {}, {});
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(globalThis.Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    outgoing.end("Preview request failed.");
  }
});

server.listen(port, host, () => {
  process.stdout.write(`JobMatch Lab Site preview is ready at http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
