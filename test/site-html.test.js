import assert from "node:assert/strict";
import test from "node:test";
import { inlineViteAssets } from "../scripts/site-html.mjs";

test("inlines Vite assets without interpreting replacement tokens in the bundles", () => {
  const document = '<script type="module" crossorigin src="/assets/app.js"></script><link rel="stylesheet" crossorigin href="/assets/app.css">';
  const javascript = 'const marker = "$&"; const closingTag = "</script>";';
  const stylesheet = 'body::before { content: "$&"; }';

  const result = inlineViteAssets(document, javascript, stylesheet);

  assert.equal(
    result,
    `<script type="module">${javascript.replace(/<\/script/gi, "<\\/script")}</script><style>${stylesheet.replace(/<\/style/gi, "<\\/style")}</style>`,
  );
  assert.doesNotMatch(result, /src="\/assets\//);
});
