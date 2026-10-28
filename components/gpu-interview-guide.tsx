import { useState } from 'react';
import { ArrowRight, Cpu, Layers, GitBranch, ListChecks, Timer, Gauge, Database, ChartColumn, ExternalLink } from 'lucide-react';
import { localize, type Locale } from '@/lib/challenges';
import { gpuTopics, gpuSources, gpuLabLabels } from '@/lib/gpu-interview';
import { GpuConceptVisual } from './gpu-concept-visual';
import { gpuAnswerChecks } from '@/lib/gpu-answer-checks';
import { GpuGlossary } from './gpu-glossary';

const topicLabels = ['Shader','SIMD / SIMT','Divergence','Scoreboard','Latency hiding','Occupancy','Memory','Bottlenecks'];
const icons = [Cpu,Layers,GitBranch,ListChecks,Timer,Gauge,Database,ChartColumn];

export function GpuInterviewGuide({ locale, selectedId, onSelect }: { locale: Locale; selectedId: string; onSelect: (id: string) => void }) {
  const zh=locale==='zh';
  const [selected,setSelected]=useState(()=>{
    const id=typeof window!=='undefined'?window.location.hash.replace('#gpu-topic-',''):'';
    return gpuTopics.some(item=>item.id===id)?id:'shader';
  });
  const topic=gpuTopics.find(item=>item.id===selected)!;
  const index=gpuTopics.indexOf(topic);
  const select=(id:string)=>{setSelected(id);const url=new URL(window.location.href);url.hash=`gpu-topic-${id}`;window.history.replaceState(null,'',url);};
  return <section className="gpu-visual-guide" aria-labelledby="gpu-guide-title">
    <header className="gpu-visual-heading"><div><h2 id="gpu-guide-title">GPU</h2><p>{zh?'先看懂電路，再動手實作。':'Understand the circuit. Then build it.'}</p></div><span>08 {zh?'個主題':'TOPICS'}</span></header>
    <nav className="gpu-topic-selector" aria-label={zh?'GPU 主題':'GPU topics'}>{gpuTopics.map((item,i)=>{const Icon=icons[i];return <button key={item.id} type="button" aria-pressed={selected===item.id} aria-controls="gpu-topic-stage" onClick={()=>select(item.id)}><Icon /><span>{zh&&i===7?'瓶頸分析':topicLabels[i]}</span></button>;})}</nav>
    <article className="gpu-topic-stage" id="gpu-topic-stage" key={topic.id}>
      <div className="gpu-stage-top"><span>{String(index+1).padStart(2,'0')}</span><h3>{localize(topic.title,locale)}</h3></div>
      <GpuConceptVisual topic={topic.id} locale={locale} />
      <p className="gpu-topic-goal">{localize(topic.goal,locale)}</p>
      <GpuGlossary key={topic.id} topic={topic.id} locale={locale}/>
      <div className="gpu-practice-row"><span>{zh?'動手做':'PRACTICE'}</span>{topic.labs.map(id=><button key={id} type="button" aria-current={id===selectedId?'true':undefined} onClick={()=>onSelect(id)}>{localize(gpuLabLabels[id],locale)}<ArrowRight /></button>)}</div>
      <div className="gpu-compact-questions"><h4>{zh?'問題與解答':'Questions & answers'}</h4>{topic.questions.map((question,i)=>{
        const assessment=gpuAnswerChecks[topic.id][i];
        return <details key={i} open={i===0}>
          <summary><span>0{i+1}</span><span className="gpu-question-text">{localize(question.q,locale)}</span><span className="gpu-answer-toggle"><span className="when-closed">{zh?'查看答案':'Show answer'}</span><span className="when-open">{zh?'收合答案':'Hide answer'}</span></span></summary>
          <div className="gpu-answer">
            <h5>{zh?'參考答案':'Reference answer'}</h5><p>{localize(question.answer,locale)}</p>
            <div className="gpu-example"><span>{zh?'用例子驗證':'WORKED EXAMPLE'}</span><p>{localize(question.example,locale)}</p></div>
            <div className="gpu-answer-checks"><h5>{zh?'答對的關鍵':'Check your answer'}</h5><ul>{assessment.checks.map((check,j)=><li key={j}>{localize(check,locale)}</li>)}</ul></div>
            <div className="gpu-followup"><h5>{zh?'追問':'Follow-up'}</h5><p className="gpu-followup-question">{localize(question.followup,locale)}</p><h5>{zh?'追問解答':'Follow-up answer'}</h5><p>{localize(assessment.followup,locale)}</p></div>
          </div>
        </details>;
      })}</div>
      <details className="gpu-footnote"><summary>{zh?'常見誤解與參考資料':'Pitfalls & references'}</summary><p>{localize(topic.trap,locale)}</p><div className="gpu-source-links">{topic.sources.map(i=><a key={i} href={gpuSources[i].url} target="_blank" rel="noreferrer">{gpuSources[i].title}<ExternalLink /></a>)}</div><p>{zh?'圖中的 lane、group、bank、segment 是縮小教學值，不代表廠商實作。':'Lane, group, bank and segment sizes shown are reduced teaching values, not vendor implementations.'}</p></details>
    </article>
    <footer className="gpu-next-topic"><span>{zh?'下一個主題':'NEXT TOPIC'}</span><button type="button" onClick={()=>select(gpuTopics[(index+1)%gpuTopics.length].id)}>{localize(gpuTopics[(index+1)%gpuTopics.length].title,locale)}<ArrowRight /></button></footer>
  </section>;
}
