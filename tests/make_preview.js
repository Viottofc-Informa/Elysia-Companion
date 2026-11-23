// Builds a standalone browser preview from the REAL emitted webview HTML, so the
// preview cannot drift from what the extension ships. Injects a fixed model list
// and forces the dropdown open. Output: ../mockups/model_selector_preview.html
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'emitted.html');
let html = fs.readFileSync(src, 'utf8');

const MODELS = ['kimi-k2.7-code', 'kimi-k3', 'zai.glm-5.3', 'gpt-5.6-luna', 'gpt-5.3-codex',
  'gpt-5-4', 'gpt-5-4-mini', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'deepseek-v4',
  'deepseek-v4.1-flash', 'minimax-m2.5', 'gpt-6.1-sol'];
const ACTIVE = 'deepseek-v4.1-flash';

// Stub the VS Code bridge, then render and open the dropdown on load.
const harness = `
<script>
  window.acquireVsCodeApi = function () {
    return { postMessage: function(){}, setState: function(){}, getState: function(){} };
  };
</script>`;

const boot = `
<script>
  (function () {
    // Give the panel real dimensions, since the preview has no editor to size it.
    document.body.style.padding = '24px';
    var box = document.querySelector('.container');
    if (box) { box.style.maxWidth = '600px'; box.style.margin = '0 auto'; }

    window.displayModels(${JSON.stringify(MODELS)}, ${JSON.stringify(ACTIVE)});
    window.toggleModelDropdown();
  })();
</script>`;

// acquireVsCodeApi must exist before the panel script runs, so inject the stub
// immediately before the original script block; append the boot script at the end.
html = html.replace('<script>\n        (function() {', harness + '\n    <script>\n        (function() {');
html = html.replace('</body>', boot + '\n</body>');

const outDir = path.join(__dirname, '..', 'mockups');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'model_selector_preview.html');
fs.writeFileSync(outFile, html, 'utf8');

console.log('wrote ' + outFile);
console.log('bytes ' + html.length);
console.log('models injected: ' + MODELS.length + ', active: ' + ACTIVE);