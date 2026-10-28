import { useState } from 'react';
import { gpuTerms, gpuTopicTerms } from '@/lib/gpu-glossary';
import { localize, type Locale } from '@/lib/challenges';

export function GpuGlossary({topic,locale}:{topic:string;locale:Locale}) {
 const ids=gpuTopicTerms[topic]??gpuTopicTerms.shader;
 const [selected,setSelected]=useState(ids[0]);
 const [query,setQuery]=useState('');
 const term=gpuTerms.find(item=>item.id===selected)??gpuTerms[0];
 const zh=locale==='zh';
 const filtered=gpuTerms.filter(item=>`${item.name} ${item.full} ${item.meaning.zh} ${item.meaning.en}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <section className="gpu-glossary" aria-label={zh?'白話名詞解釋':'Plain-language glossary'}>
   <h4>{zh?'先認識這些字':'Start with these words'}</h4>
   <div className="gpu-term-chips">{ids.map(id=>{const item=gpuTerms.find(entry=>entry.id===id)!;return <button key={id} type="button" aria-pressed={selected===id} onClick={()=>setSelected(id)}>{item.name}</button>;})}</div>
   <article className="gpu-term-definition"><h5>{term.name}<small>{term.full}</small></h5><p>{localize(term.meaning,locale)}</p><p className="gpu-term-example">{localize(term.example,locale)}</p></article>
   <details className="gpu-all-terms"><summary>{zh?`查其他名詞（${gpuTerms.length} 個）`:`Look up other terms (${gpuTerms.length})`}</summary><input type="search" aria-label={zh?'搜尋名詞':'Search terms'} placeholder={zh?'輸入 LSU、tag、pipeline…':'Search LSU, tag, pipeline…'} value={query} onChange={event=>setQuery(event.target.value)}/><div>{filtered.length?filtered.map(item=><details key={item.id}><summary>{item.name}</summary><p>{localize(item.meaning,locale)}</p><p className="gpu-term-example">{localize(item.example,locale)}</p></details>):<p>{zh?'沒有符合的名詞。':'No matching terms.'}</p>}</div></details>
 </section>;
}
