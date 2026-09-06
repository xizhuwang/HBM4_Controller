import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import ts from 'typescript';

async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  if (path.endsWith('challenges.ts')) {
    const extensionSource = await readFile(new URL('../lib/controller-challenges.ts', import.meta.url), 'utf8');
    const extensionJs = ts.transpileModule(extensionSource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const extensionUrl = 'data:text/javascript;base64,' + Buffer.from(extensionJs).toString('base64');
    outputText = outputText.replace("'./controller-challenges'", JSON.stringify(extensionUrl));
  }
  return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
}

const { challenges, tracks } = await loadTs('../lib/challenges.ts');
const { architectures, labContext } = await loadTs('../lib/architectures.ts');
let checks = 0;

function verify(ok, name) {
  assert.ok(ok, name);
  checks++;
  console.log('PASS ' + name);
}

function simulate(design, testbench, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./engine-test-worker.mjs', import.meta.url));
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker timeout'));
    }, timeout);
    worker.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    worker.on('message', (result) => {
      if (result.type === 'TEST_READY') {
        worker.postMessage({ type: 'SOC_RTL_RUN', requestId: 'test', design, testbench, generation: '2005' });
      } else if (result.type === 'SOC_RTL_RESULT') {
        clearTimeout(timer);
        worker.terminate();
        resolve(result);
      }
    });
  });
}

const legacyFoundationIds = new Set([
  'comb-decoder', 'priority-encoder', 'mux-case-default', 'alu-flags', 'edge-detector',
  'saturating-counter', 'shift-register', 'lfsr', 'handshake-stability', 'skid-buffer',
  'sync-fifo', 'async-fifo', 'round-robin-arbiter', 'fixed-priority-arbiter', 'onehot-fsm',
  'pulse-sync', 'reset-synchronizer', 'cdc-toggle', 'gray-counter', 'axi-lite-register',
  'verification-scoreboard-debug', 'sva-handshake-contract', 'uvm-monitor-structure',
  'timing-setup-hold', 'ppa-width-discipline', 'xor-cnf',
]);

verify(challenges.length === 30, '30 advanced controller labs');
verify(new Set(challenges.map((challenge) => challenge.id)).size === challenges.length, 'unique challenge ids');
verify(challenges.every((challenge) => !legacyFoundationIds.has(challenge.id)), 'no rtl-interview-lab foundation duplicates');
verify(new Set(challenges.map((challenge) => challenge.order)).size === challenges.length, 'unique curriculum order');
verify(Math.min(...challenges.map((challenge) => challenge.order)) === 1 && Math.max(...challenges.map((challenge) => challenge.order)) === 30, 'contiguous curriculum order');

for (const track of tracks) {
  const labs = challenges.filter((challenge) => challenge.track === track.id);
  verify(labs.length >= 4, `${track.id} has a multi-stage learning path`);
  verify(Boolean(architectures[track.id]?.nodes.length >= 7), `${track.id} has a full controller architecture`);
}

for (const challenge of challenges) {
  verify(Boolean(challenge.title.zh && challenge.title.en && challenge.description.zh && challenge.description.en), `${challenge.id} bilingual content`);
  verify(Boolean(challenge.specs.length >= 1 && challenge.testGroups.length >= 1 && challenge.hints.length >= 1), `${challenge.id} teaching contract`);
  const context = labContext[challenge.id];
  verify(Boolean(context?.placement.zh && context?.why.length >= 2 && context?.review.length >= 2 && context?.boundary.zh), `${challenge.id} architecture and design-review context`);
  verify(architectures[challenge.track].nodes.some((node) => node.id === context.blockId), `${challenge.id} diagram placement resolves`);
  assert.equal(challenge.judge, 'simulation', `${challenge.id} must remain executable`);
  assert.ok(challenge.referenceSolution, `Missing reference: ${challenge.id}`);
  assert.ok(challenge.testbench, `Missing testbench: ${challenge.id}`);
  const good = await simulate(challenge.referenceSolution, challenge.testbench);
  verify(good.ok, `${challenge.id} reference accepts: ${good.ok ? '' : good.console}`);
  verify(Boolean(good.vcd?.includes('$enddefinitions')), `${challenge.id} emits VCD`);
  const starter = await simulate(challenge.starter, challenge.testbench);
  verify(!starter.ok, `${challenge.id} starter rejected: ${starter.console.slice(-100)}`);
}

const checkTask = challenges[0].testbench.match(/task check;[\s\S]*?endtask/)[0];
for (const value of ["1'bx", "1'bz", "1'b0"]) {
  const result = await simulate('module unused;endmodule', `module tb;${checkTask} initial begin check(${value});$display("@@PASS@@");$finish;end endmodule`);
  verify(!result.ok && result.phase === 'simulate', `four-state checker rejects ${value}`);
}
const bad = await simulate('not verilog!', 'module tb;initial $finish;endmodule');
verify(!bad.ok, 'invalid Verilog rejected');
const watchdog = await simulate('module unused;endmodule', "module tb;reg clk=0;always #5 clk=~clk;initial wait(1'b0);endmodule");
verify(!watchdog.ok && watchdog.console.includes('simulation-time limit reached'), 'simulation-time watchdog');
console.log(`All ${checks} checks passed.`);
