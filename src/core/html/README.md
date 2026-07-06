# HTML Frontend Layout

The Rabbithole page is still served as one self-contained HTML document, but
the source is split by responsibility:

- `canvas.js` assembles the document and owns the public `buildCanvasHtml(...)`
  API.
- `styles.js` contains the inline stylesheet.
- `shell.js` contains the static DOM shell.
- `client-script.js` assembles the browser runtime.
- `client/*.js` are ordered browser-runtime chunks. They are concatenated into
  one `<script>` tag, so shared variables/functions intentionally live in the
  same browser scope.

Behavior-preserving rules:

- Do not introduce backticks or `${...}` into runtime chunks.
- Keep client-code string escapes doubled (`"\\n"`, `/\\s+/`) because the chunk
  strings are still evaluated once before reaching the browser.
- Verify by generating final HTML, extracting `<script>`, and running
  `node --check` on that extracted script.
