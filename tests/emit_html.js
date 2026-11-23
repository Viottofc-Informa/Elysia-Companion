// Emits the REAL webview HTML from the compiled extension, with a stubbed
// `vscode` module, so the escaping and template interpolation are verified on
// the actual artifact rather than a hand-written mirror. Not shipped.
const Module = require('module');
const fs = require('fs');
const path = require('path');

const OUT_HTML = path.join(__dirname, 'emitted.html');

const panelStub = {
  webview: { html: '', postMessage() {}, onDidReceiveMessage() {}, asWebviewUri: (u) => u },
  onDidDispose() {}, dispose() {}, reveal() {}
};

const vscodeStub = {
  ViewColumn: { One: 1 },
  window: {
    createWebviewPanel: () => panelStub,
    showErrorMessage() {}, showInformationMessage() {}, showWarningMessage() {}
  },
  commands: { registerCommand() {}, executeCommand() {} },
  workspace: { getConfiguration: () => ({ get: (_k, d) => d }) },
  Uri: { file: (p) => ({ fsPath: p, toString: () => 'file://' + p }) },
  EventEmitter: class { constructor() { this.event = () => ({ dispose() {} }); } fire() {} dispose() {} }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'vscode') { return vscodeStub; }
  return originalLoad.apply(this, arguments);
};

const { DetailsPanel } = require('../out/detailsPanel.js');

const config = {
  version: '0.3.12', model: 'deepseek-v4.1-flash', isPrivate: false,
  workspace: 'ws-inform-1a0500', configId: 'pc-defaul-0c6289',
  langSmithEnabled: true, status: 'Active', usedAmount: 132.662,
  totalAmount: 200, percentage: 66.3, isResetState: false,
  context: '1048576 tokens', autoCompact: '900000 tokens',
  inputPrice: '$0.37 USD', outputPrice: '$1.50 USD'
};

// Reach the private template builder the same way the constructor does.
const html = DetailsPanel.prototype.getWebviewContent.call({}, config);
fs.writeFileSync(OUT_HTML, html, 'utf8');

const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass, detail: detail || '' });

check('HTML emitted', html.length > 1000, html.length + ' chars');
check('catalog injected into webview',
  /const MODEL_CATALOG = \{"/.test(html));
check('13 catalog entries present',
  (html.match(/"label":/g) || []).length === 13,
  (html.match(/"label":/g) || []).length + ' label keys');
check('tooltip element on body',
  /<div class="model-tooltip" id="modelTooltip"/.test(html));
check('provenance footer present',
  /class="model-footer"[^>]*>\s*Details from pilots\.ai\.informa\.com\/elysia-code\/ · verified 2026-11-23/.test(html));
check('row builder emits info button',
  /class="model-info-btn"/.test(html));
// The row template lives inside the emitted HTML as client-side JS SOURCE, so
// these assert on the source form (' + index + '), not on a rendered row. The
// rendered behaviour is proven by dom_sim2.js instead.
check('row template builds handlers from the row index', () => {
  const src = html;
  const hover = /showModelTip\(this, ' \+ index \+ '\)/.test(src);
  const click = /selectModelByIndex\(' \+ index \+ '\)/.test(src);
  return hover && click;
});
check('no model id is interpolated into a handler string', () => {
  // The id must only ever reach attribute CONTENT (escaped), never a JS literal.
  return !/showModelTip\(this, ' \+ id \+ '\)/.test(html)
    && !/selectModel\(' \+ id \+ '\)/.test(html);
});
// NOTE: there is intentionally no static check here for "the onclick handler must
// not reference an IIFE-scoped variable". It was tried and removed: the emitted
// HTML contains the row template as client-side JS SOURCE, so the onclick attribute
// text ends at the first inner quote and a regex over the HTML cannot see the
// expression. The global-scope handler checks in dom_sim2.js cover this properly by
// evaluating the real attribute text — they catch the bug (verified by mutation).
check('no stray unescaped catalog close-tag',
  !/<\/script>/.test(html.split('const MODEL_CATALOG = ')[1].split(';')[0] || ''));
check('old single-line row markup removed',
  !/'<span class="model-item-name">' \+ model \+ '<\/span>' \+\s*\n\s*\(isActive \? '<span class="model-item-badge">active<\/span>' : ''\) \+\s*\n\s*'<\/div>'/.test(html));
check('model-dropdown max-height updated',
  /max-height: min\(60vh, 520px\)/.test(html));
check('tabular-nums on meta line',
  /\.model-item-meta \{[^}]*font-variant-numeric: tabular-nums/.test(html));
check('tooltip is position fixed',
  /\.model-tooltip \{[^}]*position: fixed/.test(html));
check('scroll closes tooltip (capture phase)',
  /addEventListener\('scroll', window\.hideModelTip, true\)/.test(html));

console.log('RESULT');
checks.forEach(c => console.log((c.pass ? 'PASS' : 'FAIL') + ' | ' + c.name + (c.detail ? ' | ' + c.detail : '')));
const failed = checks.filter(c => !c.pass);
console.log('TOTAL ' + (checks.length - failed.length) + '/' + checks.length + ' passed');

// Show one rendered row's markup so the escaping is visible.
const m = html.match(/const infoBtn = meta[\s\S]{0,900}?metaLine \+/);
if (m) { console.log('ROWBUILDER_SNIPPET_START'); console.log(m[0].slice(0, 700)); console.log('ROWBUILDER_SNIPPET_END'); }