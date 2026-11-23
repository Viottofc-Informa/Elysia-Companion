// Test runner for the webview layer. Runs the two harnesses in order:
//
//   emit_html.js — extracts the REAL webview HTML from the compiled extension
//                  (with a stubbed `vscode` module) and asserts on the emitted
//                  markup and client-side template source.
//   dom_sim.js   — executes that emitted HTML's actual script against a DOM stub
//                  with configurable geometry, including the inline attribute
//                  handlers a browser would evaluate in global scope.
//
// Both write and read tests/emitted.html, hence the ordering. Neither requires the
// VS Code Extension Host, so this runs anywhere Node does.
//
// Usage: npm test
const { spawnSync } = require('child_process');
const path = require('path');

const HARNESSES = [
  { file: 'emit_html.js', label: 'Static checks (emitted HTML)' },
  { file: 'dom_sim.js', label: 'Behavioural checks (DOM simulation)' }
];

let crashed = 0;
let totalPassed = 0;
let totalFailed = 0;

for (const { file, label } of HARNESSES) {
  console.log('\n' + '='.repeat(64));
  console.log(label + '  [' + file + ']');
  console.log('='.repeat(64));

  const result = spawnSync(process.execPath, [path.join(__dirname, file)], {
    encoding: 'utf8',
    cwd: path.join(__dirname, '..')
  });

  const out = (result.stdout || '') + (result.stderr || '');
  process.stdout.write(out);

  if (result.status !== 0) {
    console.error('\n' + file + ' exited with code ' + result.status);
    crashed++;
    continue;
  }

  // Each harness prints its own "TOTAL n/m passed" line. Summarise from those so
  // a harness that reports failures makes `npm test` fail — exiting 0 while
  // printing FAIL would let a broken build through.
  const total = out.match(/TOTAL (\d+)\/(\d+) passed/);
  if (!total) {
    console.error('\n' + file + ': no TOTAL line found — harness did not report results.');
    crashed++;
    continue;
  }
  totalPassed += Number(total[1]);
  totalFailed += Number(total[2]) - Number(total[1]);
}

console.log('\n' + '='.repeat(64));
console.log('TOTAL ' + totalPassed + '/' + (totalPassed + totalFailed) + ' passed');
if (crashed > 0) { console.log(crashed + ' harness(es) crashed.'); }
console.log('='.repeat(64));

process.exit(crashed === 0 && totalFailed === 0 ? 0 : 1);