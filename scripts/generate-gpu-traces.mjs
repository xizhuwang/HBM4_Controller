import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import ts from 'typescript';
async function load(path){const source=await readFile(new URL(path,import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));}
const {gpuChallenges}=await load('../lib/gpu-curriculum.ts');
const {gpuReferenceTraces}=await load('../lib/gpu-reference-traces.ts');
const hash=value=>createHash('sha256').update(value).digest('hex');
function simulate(design,testbench){return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./engine-test-worker.mjs',import.meta.url));const timer=setTimeout(()=>{worker.terminate();reject(new Error('trace timeout'));},15000);worker.on('error',error=>{clearTimeout(timer);worker.terminate();reject(error);});worker.on('message',result=>{if(result.type==='TEST_READY')worker.postMessage({type:'SOC_RTL_RUN',requestId:'guide-trace',design,testbench,generation:'2005'});else if(result.type==='SOC_RTL_RESULT'){clearTimeout(timer);worker.terminate();resolve(result);}});});}
const dir=new URL('../public/gpu-traces/',import.meta.url);await mkdir(dir,{recursive:true});const manifest={};
for(const lab of gpuChallenges){const trace=gpuReferenceTraces[lab.id];const result=await simulate(lab.referenceSolution,trace.testbench);if(!result.ok||!result.vcd?.includes('$enddefinitions'))throw new Error(lab.id+': '+result.console);await writeFile(new URL(lab.id+'.vcd',dir),result.vcd);manifest[lab.id]={contract:hash(lab.referenceSolution+'\n'+trace.testbench),vcd:hash(result.vcd)};console.log('Generated verified trace: '+lab.id);}
await writeFile(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');
