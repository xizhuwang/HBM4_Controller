import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import ts from 'typescript';
import { createHash } from 'node:crypto';

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
const { gpuTopics, gpuSources } = await loadTs('../lib/gpu-interview.ts');
const { gpuAnswerChecks } = await loadTs('../lib/gpu-answer-checks.ts');
const { gpuTerms, gpuTopicTerms } = await loadTs('../lib/gpu-glossary.ts');
const { referenceLineNote } = await loadTs('../lib/gpu-line-notes.ts');
const { gpuReferenceTraces } = await loadTs('../lib/gpu-reference-traces.ts');
const traceManifest = JSON.parse(await readFile(new URL('../public/gpu-traces/manifest.json', import.meta.url), 'utf8'));
const sha256 = text => createHash('sha256').update(text).digest('hex');
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

verify(challenges.length === 65, '65 controller, HBM4 system, and GPU RTL labs');
verify(challenges.filter((challenge) => challenge.track === 'gpu').length === 9, 'GPU path contains 9 executable labs');
verify(gpuTopics.length === 8 && gpuTopics.reduce((n, topic) => n + topic.questions.length, 0) === 24, 'GPU interview guide has 8 topics and 24 questions');
verify(gpuTerms.length >= 35 && new Set(gpuTerms.map(item => item.id)).size === gpuTerms.length && gpuTerms.every(item => item.name && item.full && item.meaning.zh && item.meaning.en && item.example.zh && item.example.en), 'GPU glossary is complete, bilingual, and uniquely indexed');
verify(new Set(gpuTopics.map(topic => topic.id)).size === gpuTopics.length, 'GPU topic anchors are unique');
for (const topic of gpuTopics) {
  verify(gpuTopicTerms[topic.id]?.every(id => gpuTerms.some(term => term.id === id)), `${topic.id} glossary terms resolve`);
  verify(gpuAnswerChecks[topic.id]?.length === topic.questions.length && gpuAnswerChecks[topic.id].every(item => item.followup?.zh && item.followup?.en && item.checks.length >= 2 && item.checks.every(check => check.zh && check.en)), `${topic.id} has answer criteria and complete bilingual follow-up answers`);
  verify([topic.title, topic.goal, topic.trap, ...topic.diagram, ...topic.questions.flatMap(item => [item.q, item.answer, item.example, item.followup])].every(item => item?.zh && item?.en), `${topic.id} GPU guide is bilingual with answers, examples, and follow-ups`);
  verify(topic.labs.every(id => challenges.some(item => item.id === id && item.track === 'gpu')), `${topic.id} GPU guide links resolve to RTL exercises`);
  verify(topic.sources.length > 0 && topic.sources.every(index => /^https:\/\//.test(gpuSources[index]?.url ?? '')), `${topic.id} GPU guide has primary-source links`);
}
verify(challenges.filter(item => item.track === 'gpu').every(lab => gpuTopics.some(topic => topic.labs.includes(lab.id))), 'all GPU labs are reachable from the interview guide');
verify(challenges.filter((challenge) => challenge.track === 'hbm').length === 31, 'HBM path contains 31 executable labs');
verify(new Set(challenges.map((challenge) => challenge.id)).size === challenges.length, 'unique challenge ids');
verify(challenges.every((challenge) => !legacyFoundationIds.has(challenge.id)), 'no rtl-interview-lab foundation duplicates');
verify(tracks.every((track) => {
  const orders = challenges.filter((challenge) => challenge.track === track.id).map((challenge) => challenge.order);
  return new Set(orders).size === orders.length && orders.every((order, index) => index === 0 || order >= orders[index - 1]);
}), 'curriculum order is unique and monotonic inside every track');

for (const track of tracks) {
  const labs = challenges.filter((challenge) => challenge.track === track.id);
  verify(labs.length >= 4, `${track.id} has a multi-stage learning path`);
  verify(Boolean(architectures[track.id]?.nodes.length >= 7), `${track.id} has a full controller architecture`);
}

for (const challenge of challenges.filter((item) => !process.argv.includes('--gpu') || item.track === 'gpu')) {
  if (challenge.track === 'gpu') {
    verify(challenge.referenceSolution.split('\n').filter(line => line.trim()).every(line => { const note=referenceLineNote(line,challenge,labSpecs[challenge.id]);return note?.zh && note?.en; }), `${challenge.id} every nonempty reference line has a bilingual explanation`);
    const trace = gpuReferenceTraces[challenge.id];
    verify(Boolean(trace?.notes.length >= 2 && trace.signals.length >= 5), `${challenge.id} reference trace has reading guidance and selected signals`);
    verify(traceManifest[challenge.id]?.contract === sha256(challenge.referenceSolution+'\n'+trace.testbench), `${challenge.id} reference trace matches current RTL and teaching testbench`);
    const savedVcd = await readFile(new URL('../public/gpu-traces/'+challenge.id+'.vcd', import.meta.url), 'utf8');
    verify(savedVcd.includes('$enddefinitions') && traceManifest[challenge.id].vcd === sha256(savedVcd), `${challenge.id} saved reference waveform is intact`);
    const teaching = await simulate(challenge.referenceSolution, trace.testbench);
    verify(teaching.ok, `${challenge.id} teaching timing scenario accepts: ${teaching.ok ? '' : teaching.console}`);
  }
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
    verify(Boolean(reference?.source?.zh && reference?.source?.en && reference?.topics?.zh && reference?.topics?.en && reference?.profile?.zh && reference?.profile?.en), `${challenge.id} has a bilingual HBM4 topic trace`);
    const guide = hbmLearningGuides[challenge.id];
    if (guide) {
      verify(Boolean(guide.plainGoal?.zh && guide.plainGoal?.en && guide.analogy?.zh && guide.analogy?.en && guide.input?.zh && guide.output?.zh), `${challenge.id} starts with a plain-language goal`);
      verify(Boolean(guide.terms?.length >= 3 && guide.terms.every((id) => hbmTerms[id]?.name?.zh && hbmTerms[id]?.meaning?.zh && hbmTerms[id]?.meaning?.en)), `${challenge.id} explains every prerequisite term`);
      verify(Boolean(guide.circuit?.length >= 3 && guide.circuit.every((stage) => stage.label?.zh && stage.detail?.zh && stage.detail?.en)), `${challenge.id} has a circuit flow diagram`);
      verify(Boolean(guide.waveform?.cycles?.length >= 3 && guide.waveform.signals?.length >= 2 && guide.waveform.signals.every((signal) => signal.values.length === guide.waveform.cycles.length)), `${challenge.id} has a complete expected waveform`);
      verify(Boolean(guide.steps?.length >= 3 && guide.steps.every((step) => step.zh && step.en)), `${challenge.id} has incremental coding steps`);
    } else {
      verify(challenge.order >= 14 && detailed.algorithm.length >= 2 && detailed.example.length >= 1, `${challenge.id} has a concise system-contract lesson`);
    }
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

// Real behavioral mutations must compile and be rejected by the regression.
// These exercise common interview bugs rather than just checking an empty starter.
const gpuMutations = [
  ['gpu-masked-simd-alu', 'if(active[i]) case(op)', 'if(1) case(op)', 'inactive lanes incorrectly execute'],
  ['gpu-elastic-pipeline', 'if(ready1) begin', 'if(1) begin', 'overwrite blocked output stage'],
  ['gpu-register-scoreboard', 'next_busy[dst]=1;', 'next_busy[dst]=0;', 'lose new destination allocation'],
  ['gpu-ready-warp-scheduler', 'else if(commit&&found)', 'else if(found)', 'rotate without downstream commit'],
  ['gpu-divergence-sequencer', 'active&predicate', 'predicate', 'reactivate inactive lanes'],
  ['gpu-occupancy-budget', 'if(rb<g)g=rb;', 'if(rb>g)g=rb;', 'ignore register capacity'],
  ['gpu-memory-coalescer', 'active[i]&&!found', 'active[i]', 'duplicate segment transactions'],
  ['gpu-shared-bank-conflicts', 'active[i]&&!duplicate', 'active[i]', 'treat broadcast as conflict'],
  ['gpu-stall-counters', "issue_cycles!={COUNT_WIDTH{1'b1}}", '1', 'counter wraps at saturation'],
];
for (const [id, before, after, name] of gpuMutations) {
  const lab = challenges.find((item) => item.id === id);
  assert.ok(lab.referenceSolution.includes(before), `mutation target exists: ${id}`);
  const result = await simulate(lab.referenceSolution.replace(before, after), lab.testbench);
  verify(!result.ok && result.phase === 'simulate' && result.console.includes('@@FAIL@@'), `${id} catches ${name}`);
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
