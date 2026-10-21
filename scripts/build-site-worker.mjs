import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inlineViteAssets } from "./site-html.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const workerOutput = path.join(dist, "server");
const workerInput = path.join(root, "worker/index.js");

await mkdir(workerOutput, { recursive: true });

let document = await readFile(path.join(dist, "index.html"), "utf8");
const scriptPath = document.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1];
const stylesheetPath = document.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/)?.[1];
if (!scriptPath || !stylesheetPath) {
  throw new Error("Vite output did not contain the expected single JavaScript and CSS entrypoints.");
}

const jsPath = path.resolve(dist, `.${scriptPath}`);
const cssPath = path.resolve(dist, `.${stylesheetPath}`);
if (!jsPath.startsWith(`${dist}${path.sep}`) || !cssPath.startsWith(`${dist}${path.sep}`)) {
  throw new Error("Vite emitted an asset outside dist/.");
}

document = inlineViteAssets(
  document,
  await readFile(jsPath, "utf8"),
  await readFile(cssPath, "utf8"),
);

await writeFile(path.join(workerOutput, "site-document.js"), `export default ${JSON.stringify(document)};\n`);
await copyFile(workerInput, path.join(workerOutput, "worker.js"));

for (const entry of await readdir(path.join(root, "server"), { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".js")) {
    await copyFile(path.join(root, "server", entry.name), path.join(workerOutput, entry.name));
  }
}

await writeFile(
  path.join(workerOutput, "index.js"),
  'import worker from "./worker.js";\nimport htmlDocument from "./site-document.js";\n\nexport default {\n  fetch(request, env, ctx) {\n    return worker.fetch(request, env, ctx, htmlDocument);\n  },\n};\n',
);
