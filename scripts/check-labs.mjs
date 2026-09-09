import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import ts from 'typescript';

const moduleUrls = new Map();

async function compileTsUrl(url) {
  const key = url.href;
  if (moduleUrls.has(key)) return moduleUrls.get(key);
  const source = await readFile(url, 'utf8');
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const imports = [...outputText.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)].map((match) => match[1]);
  for (const specifier of new Set(imports)) {
    const dependency = new URL(specifier.endsWith('.ts') ? specifier : specifier + '.ts', url);
    const dependencyUrl = await compileTsUrl(dependency);
    outputText = outputText.replaceAll(`'${specifier}'`, JSON.stringify(dependencyUrl)).replaceAll(`"${specifier}"`, JSON.stringify(dependencyUrl));
  }
  const compiled = 'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64');
  moduleUrls.set(key, compiled);
  return compiled;
}

async function loadTs(path) {
  return import(await compileTsUrl(new URL(path, import.meta.url)));
}

const { challenges, tracks } = await loadTs('../lib/challenges.ts');
const { architectures, labContext } = await loadTs('../lib/architectures.ts');
const { labSpecs, labReferences, parseModulePorts } = await loadTs('../lib/lab-specs.ts');
const { hbmLearningGuides, hbmTerms } = await loadTs('../lib/hbm-learning-guides.ts');
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

verify(challenges.length === 42, '42 advanced controller labs');
verify(new Set(challenges.map((challenge) => challenge.id)).size === challenges.length, 'unique challenge ids');
verify(challenges.every((challenge) => !legacyFoundationIds.has(challenge.id)), 'no rtl-interview-lab foundation duplicates');
verify(new Set(challenges.map((challenge) => challenge.order)).size === challenges.length, 'unique curriculum order');
verify(Math.min(...challenges.map((challenge) => challenge.order)) === 1 && Math.max(...challenges.map((challenge) => challenge.order)) === challenges.length, 'contiguous curriculum order');

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
  const detailed = labSpecs[challenge.id];
  verify(Boolean(detailed?.purpose.zh && detailed?.purpose.en && detailed?.clocking.zh && detailed?.clocking.en && detailed?.algorithm.length >= 2 && detailed.algorithm.every((rule) => rule.zh && rule.en) && detailed?.example.length >= 1), `${challenge.id} bilingual implementation micro-spec`);
  const parsedPorts = parseModulePorts(challenge.starter);
  verify(parsedPorts.length >= 2, `${challenge.id} module interface parses`);
  verify(parsedPorts.every((port) => detailed.ports[port.name]?.zh && detailed.ports[port.name]?.en), `${challenge.id} every port is documented`);
  verify(Object.keys(detailed.ports).every((name) => parsedPorts.some((port) => port.name === name)), `${challenge.id} spec has no ghost ports`);
  verify(detailed.example.every((step) => step.cycle && step.drive.zh && step.drive.en && step.expect.zh && step.expect.en), `${challenge.id} cycle examples are complete`);
  verify(!parsedPorts.some((port) => port.name === 'clk') || detailed.priority.length >= 1, `${challenge.id} sequential priority is explicit`);
  if (challenge.track === 'hbm') {
    const reference = labReferences[challenge.id];
    verify(Boolean(reference?.source?.zh?.includes('JESD270-4A') && reference?.source?.en?.includes('JESD270-4A') && reference?.topics?.zh && reference?.topics?.en && reference?.profile?.zh && reference?.profile?.en), `${challenge.id} has a bilingual HBM4 spec trace`);
    const guide = hbmLearningGuides[challenge.id];
    verify(Boolean(guide?.plainGoal?.zh && guide?.plainGoal?.en && guide?.analogy?.zh && guide?.analogy?.en && guide?.input?.zh && guide?.output?.zh), `${challenge.id} starts with a plain-language goal`);
    verify(Boolean(guide?.terms?.length >= 3 && guide.terms.every((id) => hbmTerms[id]?.name?.zh && hbmTerms[id]?.meaning?.zh && hbmTerms[id]?.meaning?.en)), `${challenge.id} explains every prerequisite term`);
    verify(Boolean(guide?.circuit?.length >= 3 && guide.circuit.every((stage) => stage.label?.zh && stage.detail?.zh && stage.detail?.en)), `${challenge.id} has a circuit flow diagram`);
    verify(Boolean(guide?.waveform?.cycles?.length >= 3 && guide.waveform.signals?.length >= 2 && guide.waveform.signals.every((signal) => signal.values.length === guide.waveform.cycles.length)), `${challenge.id} has a complete expected waveform`);
    verify(Boolean(guide?.steps?.length >= 3 && guide.steps.every((step) => step.zh && step.en)), `${challenge.id} has incremental coding steps`);
  }
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
