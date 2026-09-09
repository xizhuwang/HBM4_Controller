import { ArrowRight, BookMarked, Braces, Clock3, ListOrdered, ShieldCheck, TableProperties } from 'lucide-react';

import { localize, type Challenge, type Locale } from '@/lib/challenges';
import { labReferences, labSpecs, parseModulePorts } from '@/lib/lab-specs';

const labels = {
  zh: { title: '實作前必讀 Micro-Spec', purpose: '你要做的電路', reference: '規格追溯', clocking: 'Clock / Reset 合約', ports: '介面定義', signal: '訊號', direction: '方向', width: '位寬', meaning: '精確語意', algorithm: '逐步行為規則', priority: '同拍事件優先順序', timing: '逐拍範例', cycle: '時間', drive: '輸入／前置狀態', expect: '必須觀察到', assumptions: '範圍與假設', start: '讀完 SPEC，開始寫 RTL' },
  en: { title: 'Required micro-spec', purpose: 'Circuit you are building', reference: 'Specification trace', clocking: 'Clock / reset contract', ports: 'Interface definition', signal: 'Signal', direction: 'Dir', width: 'Width', meaning: 'Exact semantics', algorithm: 'Ordered behavior rules', priority: 'Same-cycle event priority', timing: 'Cycle example', cycle: 'Time', drive: 'Inputs / prior state', expect: 'Required observation', assumptions: 'Scope and assumptions', start: 'Spec understood — start RTL' },
};

export function LabSpecSheet({ challenge, locale, onStart }: { challenge: Challenge; locale: Locale; onStart: () => void }) {
  const item = labSpecs[challenge.id];
  const reference = labReferences[challenge.id];
  const text = labels[locale];
  const ports = parseModulePorts(challenge.starter);

  return (
    <section className="spec-sheet">
      <header className="spec-hero">
        <div><span><Braces />{text.title}</span><h3>{text.purpose}</h3><p>{localize(item.purpose, locale)}</p></div>
        <button type="button" onClick={onStart}>{text.start}<ArrowRight /></button>
      </header>

      {reference && <div className="spec-reference"><BookMarked /><div><span>{text.reference}</span><strong>{localize(reference.source, locale)}</strong><p>{localize(reference.topics, locale)}</p><small>{localize(reference.profile, locale)}</small></div></div>}

      <div className="spec-section clock-contract"><h3><Clock3 />{text.clocking}</h3><p>{localize(item.clocking, locale)}</p></div>

      <div className="spec-section"><h3><TableProperties />{text.ports}</h3><div className="spec-table-wrap"><table className="port-table"><thead><tr><th>{text.signal}</th><th>{text.direction}</th><th>{text.width}</th><th>{text.meaning}</th></tr></thead><tbody>{ports.map((port) => <tr key={port.name}><td><code>{port.name}</code></td><td><span className={`direction ${port.direction}`}>{port.direction}</span></td><td><code>{port.width}</code></td><td>{localize(item.ports[port.name], locale)}</td></tr>)}</tbody></table></div></div>

      <div className="spec-two-column">
        <div className="spec-section"><h3><ListOrdered />{text.algorithm}</h3><ol className="algorithm-list">{item.algorithm.map((rule, index) => <li key={index}><span>{index + 1}</span><p>{localize(rule, locale)}</p></li>)}</ol></div>
        <div className="spec-section priority-section"><h3><ShieldCheck />{text.priority}</h3>{item.priority.length ? <ol>{item.priority.map((rule, index) => <li key={index}><b>{index + 1}</b>{localize(rule, locale)}</li>)}</ol> : <p>{locale === 'zh' ? '此題沒有跨拍狀態；所有輸出完全由本拍輸入決定。' : 'This lab has no sequential state; outputs depend only on current inputs.'}</p>}</div>
      </div>

      <div className="spec-section"><h3><Clock3 />{text.timing}</h3><div className="spec-table-wrap"><table className="timing-table"><thead><tr><th>{text.cycle}</th><th>{text.drive}</th><th>{text.expect}</th></tr></thead><tbody>{item.example.map((step, index) => <tr key={`${step.cycle}-${index}`}><td><code>{step.cycle}</code></td><td>{localize(step.drive, locale)}</td><td>{localize(step.expect, locale)}</td></tr>)}</tbody></table></div></div>

      {item.assumptions.length > 0 && <div className="spec-section assumptions"><h3>{text.assumptions}</h3><ul>{item.assumptions.map((note, index) => <li key={index}>{localize(note, locale)}</li>)}</ul></div>}

      <footer className="spec-start"><p>{locale === 'zh' ? '完成條件：你的 RTL 必須同時符合介面表、規則順序、逐拍範例與右側驗收條件。Testbench 只負責檢查，不應成為題目規格。' : 'Completion means satisfying the interface table, ordered rules, cycle example, and acceptance criteria. The testbench checks the contract; it is not the specification.'}</p><button type="button" onClick={onStart}>{text.start}<ArrowRight /></button></footer>
    </section>
  );
}
