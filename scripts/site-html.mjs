export function inlineViteAssets(document, javascript, stylesheet) {
  const script = document.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
  const style = document.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);

  if (!script || !style) {
    throw new Error("Vite output did not contain the expected single JavaScript and CSS entrypoints.");
  }

  const safeJavascript = javascript.replace(/<\/script/gi, "<\\/script");
  const safeStylesheet = stylesheet.replace(/<\/style/gi, "<\\/style");

  return document
    .replace(script[0], () => `<script type="module">${safeJavascript}</script>`)
    .replace(style[0], () => `<style>${safeStylesheet}</style>`);
}
