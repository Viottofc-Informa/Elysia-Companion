// Behavioural harness for the model selector. Runs the extension's REAL emitted
// webview JS against a DOM stub with CONFIGURABLE geometry, so viewport-dependent
// tooltip placement is actually exercised rather than assumed. Not shipped.
//
// Earlier revision of this harness used a fixed 1200x800 viewport and a fixed
// anchor rect, which could not fail on the narrow-panel and short-viewport
// placement bugs. Geometry is now a parameter.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'emitted.html'), 'utf8');
const SCRIPT = html.match(/<script>([\s\S]*?)<\/script>/)[1];

/** Fresh sandbox per scenario, so tests cannot leak state into each other. */
function boot(opts) {
  opts = opts || {};
  const geom = Object.assign(
    { innerWidth: 1200, innerHeight: 800, anchorTop: 300, anchorRight: 560 },
    opts.geometry || {}
  );
  const tipSize = Object.assign({ width: 300, height: 120 }, opts.tipSize || {});

  const els = {};
  function makeEl(id) {
    // Tooltip width honours the real CSS rule `max-width: min(320px, calc(100vw - 16px))`.
    // Without this the stub would report a 300px tooltip in a 250px panel and the
    // clamp could never be exercised.
    const cssMaxWidth = Math.min(320, geom.innerWidth - 16);
    const isTip = id === 'modelTooltip';
    const el = {
      id, innerHTML: '', textContent: '', style: {},
      offsetHeight: isTip ? tipSize.height : 62,
      offsetWidth: isTip ? Math.max(1, Math.min(tipSize.width, cssMaxWidth)) : 560,
      classes: new Set(),
      contains: () => false,
      querySelectorAll: () => [],
      appendChild() {}
    };
    el.classList = {
      add: (c) => el.classes.add(c),
      remove: (c) => el.classes.delete(c),
      contains: (c) => el.classes.has(c)
    };
    el.getBoundingClientRect = () => ({
      top: geom.anchorTop, bottom: geom.anchorTop + 40,
      left: geom.anchorRight - 20, right: geom.anchorRight,
      width: 20, height: 40
    });
    return el;
  }

  // Populate every element the webview script reaches for.
  ['modelLoading', 'modelList', 'modelCurrent', 'modelDropdown', 'currentModelName',
   'modelTooltip', 'modelFooter', 'oldModelDisplay', 'newModelDisplay',
   'confirmOverlay', 'compressionValue', 'anchor'].forEach((id) => { els[id] = makeEl(id); });

  const listeners = [];
  const doc = {
    getElementById: (id) => els[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (evt, fn, capture) => listeners.push({ evt, fn, capture }),
    body: { appendChild() {} }
  };
  const posted = [];
  const sandbox = {
    document: doc,
    innerWidth: geom.innerWidth,
    innerHeight: geom.innerHeight,
    addEventListener() {},
    console,
    acquireVsCodeApi: () => ({ postMessage: (m) => posted.push(m), setState() {}, getState() {} }),
    setTimeout: () => 0
  };
  vm.createContext(sandbox);
  // In a browser `window` IS the global object; mirror that so the script's
  // `window.foo = ...` assignments are visible to its own bare `foo()` calls.
  new vm.Script('globalThis.window = globalThis;').runInContext(sandbox);
  new vm.Script(SCRIPT).runInContext(sandbox);

  return { w: sandbox, els, doc, listeners, posted, geom };
}

const results = [];
function check(name, fn) {
  try {
    const r = fn();
    results.push({ name, pass: r === true, detail: typeof r === 'string' ? r : '' });
  } catch (e) {
    results.push({ name, pass: false, detail: 'THREW: ' + e.message });
  }
}

const MODELS = ['kimi-k2.7-code', 'kimi-k3', 'zai.glm-5.3', 'gpt-5.6-luna', 'gpt-5.3-codex',
  'gpt-5-4', 'gpt-5-4-mini', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'deepseek-v4',
  'deepseek-v4.1-flash', 'minimax-m2.5', 'gpt-6.1-sol'];
const ACTIVE = 'deepseek-v4.1-flash';

// ---------- rendering ----------
check('webview script executes', () => { const b = boot(); return typeof b.w.displayModels === 'function'; });

check('all 13 rows render with a metadata line', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  const lines = (b.els.modelList.innerHTML.match(/model-item-meta/g) || []).length;
  return lines === 13 || 'only ' + lines + ' metadata lines';
});

check('active row carries the badge', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  return /model-item-badge">active/.test(b.els.modelList.innerHTML);
});

check('footer shown when models exist', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  return b.els.modelFooter.style.display === 'block';
});

check('footer hidden when the list fails to load', () => {
  const b = boot();
  b.w.displayModels([], 'unknown');
  return b.els.modelFooter.style.display === 'none' || 'footer cited a source with no data';
});

// ---------- prototype-key ids (review finding 1) ----------
['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__', 'toLocaleString'].forEach((id) => {
  check('prototype-key id "' + id + '" degrades to name-only', () => {
    const b = boot();
    b.w.displayModels([id, 'kimi-k3'], 'kimi-k3');
    const h = b.els.modelList.innerHTML;
    if (/undefined/.test(h)) { return 'rendered literal "undefined"'; }
    const seg = h.slice(h.indexOf('>' + id + '<') - 200, h.indexOf('>' + id + '<') + 200);
    if (/model-info-btn/.test(seg)) { return 'showed info button for uncatalogued id'; }
    // hovering must not throw
    b.w.showModelTip(b.els.modelList, 0);
    return true;
  });
});

// ---------- handler injection (review finding 2) ----------
['evil\'--', 'x\');alert(1);//', 'a\\', 'ML\nid', 'quote"id', 'amp&id'].forEach((id) => {
  check('hostile id ' + JSON.stringify(id) + ' cannot break out of the handler', () => {
    const b = boot();
    b.w.displayModels([id], 'other');
    const h = b.els.modelList.innerHTML;
    const m = h.match(/onclick="([^"]*)"/);
    if (!m) { return 'no onclick emitted'; }
    // The handler body must be valid JS once the attribute is parsed. Indices are
    // used, so no id text should appear inside the handler at all.
    if (m[1].includes(id) || /[^a-zA-Z0-9_.[\]()\s"=]/.test(m[1].replace(/^selectModel\(availableModels\[\d+\]\)$/, ''))) {
      return 'handler still interpolates the id: ' + m[1];
    }
    // The handler must carry only a bare integer index — no id text, no variable
    // reference that could be out of scope in the global inline-handler context.
    return /^selectModelByIndex\(\d+\)$/.test(m[1]) || 'unexpected handler shape: ' + m[1];
  });
});

check('selectModel still reaches the right id through the index', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  // index 1 is kimi-k3
  b.w.selectModel(b.w.availableModels ? b.w.availableModels[1] : MODELS[1]);
  return b.els.newModelDisplay.textContent === 'kimi-k3';
});

// ---------- tooltip placement across geometry (review findings 3 and 4) ----------
function tipBox(b, index) {
  b.w.showModelTip(b.els.anchor || {}, index === undefined ? 1 : index);
  const t = parseInt(b.els.modelTooltip.style.top, 10);
  const l = parseInt(b.els.modelTooltip.style.left, 10);
  return { top: t, left: l, bottom: t + b.els.modelTooltip.offsetHeight, right: l + b.els.modelTooltip.offsetWidth };
}

[[1200, 800], [600, 800], [400, 700], [320, 600], [280, 500], [250, 400]].forEach(([w, h]) => {
  check('tooltip stays inside viewport at ' + w + 'x' + h, () => {
    const b = boot({ geometry: { innerWidth: w, innerHeight: h } });
    b.w.displayModels(MODELS, ACTIVE);
    const box = tipBox(b, 1);
    if (box.left < 0) { return 'left=' + box.left + ' (off-screen left)'; }
    if (box.right > w) { return 'right=' + box.right + ' exceeds width ' + w; }
    if (box.top < 0) { return 'top=' + box.top; }
    if (box.bottom > h) { return 'bottom=' + box.bottom + ' exceeds height ' + h; }
    return true;
  });
});

[[340, 300], [380, 300], [420, 300], [900, 300]].forEach(([h, anchorTop]) => {
  check('tooltip does not cover its anchor (h=' + h + ', anchorTop=' + anchorTop + ')', () => {
    const b = boot({
      geometry: { innerHeight: h, anchorTop },
      tipSize: { width: 300, height: 195 }
    });
    b.w.displayModels(MODELS, ACTIVE);
    const box = tipBox(b, 1);
    const anchorBottom = anchorTop + 40;
    // Overlap = tooltip bottom below anchor top AND tooltip top above anchor bottom
    const overlaps = box.bottom > anchorTop && box.top < anchorBottom;
    return !overlaps || 'tooltip box ' + JSON.stringify(box) + ' overlaps anchor ' + anchorTop + '-' + anchorBottom;
  });
});

check('tooltip flips above when there is no room below', () => {
  const b = boot({ geometry: { innerHeight: 400, anchorTop: 340 }, tipSize: { width: 300, height: 120 } });
  b.w.displayModels(MODELS, ACTIVE);
  const box = tipBox(b, 1);
  return box.bottom <= 340 || 'did not flip: bottom=' + box.bottom;
});

// ---------- tooltip content ----------
check('flat model tooltip shows single input/output rows', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  b.w.showModelTip(b.els.anchor, MODELS.indexOf('kimi-k3'));
  const h = b.els.modelTooltip.innerHTML;
  return (/Kimi K3/.test(h) && /1,048,576 tokens/.test(h) && /\$3\.30 \/ 1M tokens/.test(h))
    || 'missing expected content';
});

check('tiered model tooltip shows BOTH price ranges', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  b.w.showModelTip(b.els.anchor, MODELS.indexOf('claude-haiku-5-5'));
  const h = b.els.modelTooltip.innerHTML;
  return (/up to 100K prompt/.test(h) && /over 100K prompt/.test(h)) || 'tier range missing';
});

check('unknown model: hovering its index is a no-op', () => {
  const b = boot();
  b.w.displayModels(['nope-not-real'], 'x');
  b.w.showModelTip(b.els.anchor, 0);
  return !b.els.modelTooltip.classes.has('open') || 'opened tooltip for uncatalogued model';
});

check('hideModelTip closes', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  b.w.showModelTip(b.els.anchor, 1);
  b.w.hideModelTip();
  return !b.els.modelTooltip.classes.has('open');
});

check('scroll listener registered in capture phase', () => {
  const b = boot();
  return b.listeners.some((l) => l.evt === 'scroll' && l.capture === true);
});

// ---------- model change flow ----------
check('selecting the active model opens no dialog', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  b.w.selectModel(ACTIVE);
  return !b.els.confirmOverlay.classes.has('open');
});

check('selecting another model opens the dialog with old/new', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  b.w.selectModel('kimi-k3');
  return (b.els.confirmOverlay.classes.has('open')
    && b.els.oldModelDisplay.textContent === ACTIVE
    && b.els.newModelDisplay.textContent === 'kimi-k3') || 'dialog state wrong';
});

check('confirming posts changeModel to the extension', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  b.w.selectModel('kimi-k3');
  b.w.confirmModelChange();
  return b.posted.some((m) => m.command === 'changeModel' && m.model === 'kimi-k3') || 'no changeModel message';
});

// ---------- inline attribute handlers (the class of bug that shipped) ----------
// The checks above call window.selectModel() DIRECTLY, which bypasses the inline
// attribute the browser actually evaluates. A browser compiles an inline handler
// with the GLOBAL object as its scope chain, so anything declared with let/const
// inside the IIFE is invisible to it. These checks extract the real attribute text
// and evaluate it in global scope, which is the only way to catch that.
function clickRow(b, rowIndex) {
  const rendered = b.els.modelList.innerHTML;
  const onclicks = [...rendered.matchAll(/onclick="([^"]*)"/g)]
    .map((m) => m[1])
    .filter((h) => !/stopPropagation/.test(h));
  const handler = onclicks[rowIndex];
  if (!handler) { return { ok: false, err: 'no onclick for row ' + rowIndex }; }
  try {
    new vm.Script(handler + ';').runInContext(b.w);
    return { ok: true, handler };
  } catch (e) {
    return { ok: false, err: e.message, handler };
  }
}

check('row onclick evaluates in GLOBAL scope without throwing', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  const r = clickRow(b, 0);
  return r.ok || r.err + '  [handler: ' + r.handler + ']';
});

check('clicking a non-active row opens the confirmation dialog', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  b.els.confirmOverlay.classes.delete('open');
  const r = clickRow(b, 1);                       // index 1 = kimi-k3
  if (!r.ok) { return r.err; }
  return b.els.confirmOverlay.classes.has('open') || 'dialog did not open';
});

check('clicking a row resolves the CORRECT model id', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  const r = clickRow(b, 1);
  if (!r.ok) { return r.err; }
  return b.els.newModelDisplay.textContent === 'kimi-k3'
    || 'dialog shows "' + b.els.newModelDisplay.textContent + '", expected kimi-k3';
});

check('clicking the active row opens no dialog', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  b.els.confirmOverlay.classes.delete('open');
  const activeIndex = MODELS.indexOf(ACTIVE);
  const r = clickRow(b, activeIndex);
  if (!r.ok) { return r.err; }
  return !b.els.confirmOverlay.classes.has('open') || 'dialog opened for the active model';
});

check('every row onclick is global-scope safe', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  const bad = [];
  for (let i = 0; i < MODELS.length; i++) {
    const r = clickRow(b, i);
    if (!r.ok) { bad.push(i + ':' + r.err); }
  }
  return bad.length === 0 || 'rows failing: ' + bad.join(', ');
});

check('full click-through: click then confirm posts changeModel', () => {
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  const r = clickRow(b, 1);
  if (!r.ok) { return r.err; }
  b.w.confirmModelChange();
  return b.posted.some((m) => m.command === 'changeModel' && m.model === 'kimi-k3')
    || 'no changeModel message posted';
});

check('the info-button stopPropagation handler evaluates', () => {
  // A browser compiles an inline handler as function(event){...}, so `event` is an
  // implicit PARAMETER (not the legacy window.event). Evaluate it the same way —
  // wrapping in a function with an `event` parameter — rather than at global scope,
  // where `event` would be undefined and the test would fail for the wrong reason.
  const b = boot();
  b.w.displayModels(MODELS, ACTIVE);
  const handler = (b.els.modelList.innerHTML.match(/onclick="([^"]*stopPropagation[^"]*)"/) || [])[1];
  if (!handler) { return 'no stopPropagation handler emitted'; }
  let stopped = false;
  const fakeEvent = { stopPropagation() { stopped = true; } };
  try {
    const fn = new vm.Script('(function(event){ ' + handler + ' })').runInContext(b.w);
    fn(fakeEvent);
    return stopped || 'handler ran but did not stop propagation';
  } catch (e) {
    return e.message + '  [handler: ' + handler + ']';
  }
});

// ---------- report ----------
console.log('RESULT');
results.forEach((r) => console.log((r.pass ? 'PASS' : 'FAIL') + ' | ' + r.name + (r.detail ? ' | ' + r.detail : '')));
const failed = results.filter((r) => !r.pass);
console.log('TOTAL ' + (results.length - failed.length) + '/' + results.length + ' passed');