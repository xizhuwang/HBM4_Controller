import { useEffect, useState } from 'react';
import { Copy, BookOpen, Activity, Code2 } from 'lucide-react';
import type { Challenge, Locale } from '@/lib/challenges';
import { localize } from '@/lib/challenges';
import { labSpecs } from '@/lib/lab-specs';
import { referenceLineNote } from '@/lib/gpu-line-notes';
import { gpuReferenceTraces } from '@/lib/gpu-reference-traces';
import { WaveformViewer } from './waveform-viewer';

export function GpuReferenceGuide({challenge,locale}:{challenge:Challenge;locale:Locale}) {
 const [view,setView]=useState<'code'|'lines'|'timing'>('lines');
 const [vcd,setVcd]=useState('');
 const [traceError,setTraceError]=useState(false);
 const [copied,setCopied]=useState(false);
 const zh=locale==='zh';
 const source=challenge.referenceSolution??'';
 const trace=gpuReferenceTraces[challenge.id];
 useEffect(()=>{
  if(view!=='timing')return;
  const abort=new AbortController();
  fetch(`./gpu-traces/${challenge.id}.vcd`,{signal:abort.signal,cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error('trace');return response.text();}).then(data=>{if(!data.includes('$enddefinitions'))throw new Error('trace');setVcd(data);setTraceError(false);}).catch(error=>{if(error.name!=='AbortError')setTraceError(true);});
  return()=>abort.abort();
 },[challenge.id,view]);
 const copy=async()=>{try{await navigator.clipboard.writeText(source);setCopied(true);}catch{setCopied(false);setView('code');}};
 return <section className="gpu-reference-guide" aria-label={zh?'完整參考解答與教學':'Complete reference solution and explanation'}>
  <header><div><strong>{zh?'參考解答':'Reference solution'}</strong><span>{zh?'隨時可看，不需要先通關。':'Available anytime; no pass required.'}</span></div><button type="button" onClick={copy}><Copy />{copied?(zh?'已複製':'Copied'):(zh?'複製完整程式':'Copy full code')}</button></header>
  <nav aria-label={zh?'參考解答閱讀方式':'Reference views'}><button type="button" aria-pressed={view==='code'} onClick={()=>setView('code')}><Code2 />{zh?'完整程式':'Full code'}</button><button type="button" aria-pressed={view==='lines'} onClick={()=>setView('lines')}><BookOpen />{zh?'逐行解說':'Line by line'}</button><button type="button" aria-pressed={view==='timing'} onClick={()=>setView('timing')}><Activity />{zh?'時序圖':'Timing diagram'}</button></nav>
  {view==='code' && <pre className="gpu-reference-source"><code>{source}</code></pre>}
  {view==='lines' && <ol className="gpu-reference-lines">{source.split('\n').map((line,index)=>line.trim()?<li key={index}><div><span>{index+1}</span><code>{line}</code></div><p>{localize(referenceLineNote(line,challenge,labSpecs[challenge.id])!,locale)}</p></li>:null)}</ol>}
  {view==='timing' && <div className="gpu-reference-timing"><h4>{zh?'先對照這些變化':'What to look for'}</h4><p className="gpu-trace-reading">{zh?'數值以十六進位顯示：a=10、f=15；1ns=1000ps。有 clock 的題目先看上升緣，再核對 valid/ready；純組合題不計拍數。':'Values are hexadecimal: a=10, f=15; 1ns=1000ps. For clocked labs inspect rising edges and valid/ready; combinational labs have no cycle count.'}</p><ul>{trace.notes.map((note,i)=><li key={i}>{localize(note,locale)}</li>)}</ul>{vcd?<WaveformViewer vcd={vcd} locale={locale} preferredSignals={trace.signals} reference />:<p>{traceError?(zh?'波形載入失敗，請重新切換此分頁再試。':'Trace load failed; switch this view and retry.'):(zh?'載入已驗證的參考波形…':'Loading the verified reference trace…')}</p>}</div>}
  <footer>{zh?'查看解答不會改動你的程式。要試跑，可複製後按「返回你的程式」貼上，再執行測試。':'Viewing does not change your code. To try it, copy, return to your RTL, paste, and run the tests.'}</footer>
 </section>;
}
