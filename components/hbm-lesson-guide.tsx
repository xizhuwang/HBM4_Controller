'use client';

import { useMemo, useState } from 'react';
import { Activity, ArrowRight, BookOpen, CircuitBoard, Code2, Lightbulb, Route } from 'lucide-react';

import { ArchitectureDiagram } from '@/components/architecture-diagram';
import { labContext } from '@/lib/architectures';
import { hbmLearningGuides, hbmTerms, type HbmWaveSignal } from '@/lib/hbm-learning-guides';
import { localize, type Challenge, type Locale } from '@/lib/challenges';

function TimingDiagram({ cycles, signals, caption, locale }: { cycles: string[]; signals: HbmWaveSignal[]; caption: string; locale: Locale }) {
  const labelWidth = 138;
  const cycleWidth = 112;
  const rowHeight = 54;
  const width = labelWidth + cycles.length * cycleWidth;
  const height = 42 + signals.length * rowHeight;

  return (
    <div className="teaching-wave-wrap">
      <svg className="teaching-wave" viewBox={`0 0 ${width} ${height}`} aria-label={caption}>
        <title>{locale === 'zh' ? '預期邏輯波形' : 'Expected logic waveform'}</title>
        <desc>{caption}</desc>
        {cycles.map((cycle, index) => <g key={cycle}><text x={labelWidth + index * cycleWidth + cycleWidth / 2} y="24" textAnchor="middle" className="wave-cycle">{cycle}</text><line x1={labelWidth + index * cycleWidth} y1="32" x2={labelWidth + index * cycleWidth} y2={height} className="wave-grid" /></g>)}
        {signals.map((signal, row) => {
          const top = 40 + row * rowHeight;
          if (signal.kind === 'bus') return <g key={signal.name}><text x="8" y={top + 24} className="wave-label">{signal.name}</text>{signal.values.map((value, index) => <g key={`${signal.name}-${index}`}><rect x={labelWidth + index * cycleWidth + 3} y={top + 6} width={cycleWidth - 6} height="30" rx="4" className="wave-bus" /><text x={labelWidth + index * cycleWidth + cycleWidth / 2} y={top + 26} textAnchor="middle" className="wave-value">{value}</text></g>)}</g>;
          const points: string[] = [];
          signal.values.forEach((value, index) => {
            const x0 = labelWidth + index * cycleWidth;
            const x1 = x0 + cycleWidth;
            const y = top + (value === '1' ? 8 : 34);
            if (index === 0) points.push(`M${x0},${y}`);
            else points.push(`V${y}`);
            points.push(`H${x1}`);
          });
          return <g key={signal.name}><text x="8" y={top + 25} className="wave-label">{signal.name}</text><line x1={labelWidth} y1={top + 34} x2={width} y2={top + 34} className="wave-rail" /><path d={points.join(' ')} className="wave-bit" />{signal.values.map((value, index) => <text key={`${signal.name}-v-${index}`} x={labelWidth + index * cycleWidth + 9} y={top + (value === '1' ? 20 : 31)} className="wave-bit-value">{value}</text>)}</g>;
        })}
      </svg>
    </div>
  );
}

function AddressExplorer({ locale }: { locale: Locale }) {
  const [hex, setHex] = useState('A55AA');
  const value = useMemo(() => Number.parseInt(hex || '0', 16) & 0xfffff, [hex]);
  const fields = [
    { key: 'row', bits: '[19:12]', value: (value >>> 12) & 0xff },
    { key: 'channel', bits: '[11:9]', value: (value >>> 9) & 0x7 },
    { key: 'PC', bits: '[8]', value: (value >>> 8) & 0x1 },
    { key: 'BG', bits: '[7:6]', value: (value >>> 6) & 0x3 },
    { key: 'bank', bits: '[5:4]', value: (value >>> 4) & 0x3 },
    { key: 'column', bits: '[3:0]', value: value & 0xf },
  ];
  const update = (raw: string) => setHex(raw.replace(/[^0-9a-f]/gi, '').slice(0, 5).toUpperCase());

  return (
    <section className="address-explorer">
      <div className="teaching-section-heading"><Route /><div><span>{locale === 'zh' ? '第一題專用互動圖' : 'Interactive view for lab 1'}</span><h4>{locale === 'zh' ? '親手改一個位址，看六組輸出怎麼變' : 'Change one address and watch all six outputs'}</h4></div></div>
      <label className="hex-input"><span>{locale === 'zh' ? '20-bit 位址（十六進位）' : '20-bit address (hex)'}</span><div><b>0x</b><input value={hex} onChange={(event) => update(event.target.value)} inputMode="text" aria-label={locale === 'zh' ? '20-bit 十六進位位址' : '20-bit hexadecimal address'} /></div></label>
      <div className="address-ribbon" aria-label={locale === 'zh' ? '位址位元切割圖' : 'Address bit-slice diagram'}>{fields.map((field) => <div key={field.key} data-field={field.key.toLowerCase()}><span>{field.key}</span><b>{field.bits}</b><strong>{field.value.toString(16).toUpperCase()}</strong></div>)}</div>
      <div className="decode-equation" aria-live="polite"><code>{`20'h${value.toString(16).toUpperCase().padStart(5, '0')}`}</code><ArrowRight />{fields.map((field) => <span key={field.key}><b>{field.key}</b> = {field.value}</span>)}</div>
      <p>{locale === 'zh' ? '觀察重點：這些輸出不是計算出來的，而是 addr 的不同導線直接接出去，所以不需要 clk。' : 'Key idea: these outputs are not calculated; they are direct slices of addr, so no clock is required.'}</p>
    </section>
  );
}

export function HbmLessonGuide({ challenge, locale }: { challenge: Challenge; locale: Locale }) {
  const guide = hbmLearningGuides[challenge.id];
  const context = labContext[challenge.id];
  if (!guide || !context) return null;

  return (
    <section className="hbm-lesson-guide">
      <section className="plain-goal">
        <div className="teaching-eyebrow"><Lightbulb />{locale === 'zh' ? '先不用寫 Code：先回答「我要做什麼？」' : 'Before coding: what exactly are we building?'}</div>
        <h3>{localize(guide.plainGoal, locale)}</h3>
        <p><b>{locale === 'zh' ? '生活比喻：' : 'Analogy: '}</b>{localize(guide.analogy, locale)}</p>
        <div className="io-explainer"><article><span>INPUT</span><p>{localize(guide.input, locale)}</p></article><ArrowRight /><article><span>OUTPUT</span><p>{localize(guide.output, locale)}</p></article></div>
      </section>

      <section className="teaching-block">
        <div className="teaching-section-heading"><BookOpen /><div><span>{locale === 'zh' ? '名詞先修' : 'Vocabulary first'}</span><h4>{locale === 'zh' ? '本題出現的詞，先用白話看懂' : 'Plain-language terms used in this lab'}</h4></div></div>
        <div className="term-grid">{guide.terms.map((termId) => { const term = hbmTerms[termId]; return <article key={termId}><strong>{localize(term.name, locale)}</strong><p>{localize(term.meaning, locale)}</p></article>; })}</div>
      </section>

      <section className="teaching-block">
        <div className="teaching-section-heading"><Route /><div><span>{locale === 'zh' ? '整體架構圖' : 'System architecture'}</span><h4>{locale === 'zh' ? '先看它位於 Controller 哪一段' : 'Locate this circuit inside the controller'}</h4></div></div>
        <ArchitectureDiagram track="hbm" activeBlock={context.blockId} locale={locale} />
        <p className="diagram-note">{localize(context.placement, locale)}</p>
      </section>

      {challenge.id === 'hbm-pseudo-channel-map' && <AddressExplorer locale={locale} />}

      <section className="teaching-block">
        <div className="teaching-section-heading"><CircuitBoard /><div><span>{locale === 'zh' ? '電路方塊圖' : 'Circuit block diagram'}</span><h4>{locale === 'zh' ? '資料從左往右走；每個方塊就是你要寫的一小段 RTL' : 'Data moves left to right; each block becomes a small piece of RTL'}</h4></div></div>
        <div className="circuit-flow">{guide.circuit.map((stage, index) => <div className="circuit-flow-item" key={`${challenge.id}-${index}`}><article><strong>{localize(stage.label, locale)}</strong><p>{localize(stage.detail, locale)}</p></article>{index < guide.circuit.length - 1 && <ArrowRight aria-hidden="true" />}</div>)}</div>
      </section>

      <section className="teaching-block">
        <div className="teaching-section-heading"><Activity /><div><span>{locale === 'zh' ? '預期波形圖' : 'Expected waveform'}</span><h4>{locale === 'zh' ? '先知道正確電路應該怎麼動，再開始寫' : 'See the required behavior before writing RTL'}</h4></div></div>
        <p className="diagram-note">{localize(guide.waveform.caption, locale)}</p>
        <TimingDiagram cycles={guide.waveform.cycles} signals={guide.waveform.signals} caption={localize(guide.waveform.caption, locale)} locale={locale} />
      </section>

      <section className="teaching-block coding-recipe">
        <div className="teaching-section-heading"><Code2 /><div><span>{locale === 'zh' ? '動手順序' : 'Coding recipe'}</span><h4>{locale === 'zh' ? '不要一次寫完整題；照這些小步驟做' : 'Do not solve everything at once; follow these small steps'}</h4></div></div>
        <ol>{guide.steps.map((step, index) => <li key={index}><span>{index + 1}</span><p>{localize(step, locale)}</p></li>)}</ol>
        <div className="ready-check"><Activity /><p>{locale === 'zh' ? '能用自己的話說出 input、output 與上面波形後，再往下讀正式 Micro-Spec。' : 'Continue to the formal micro-spec only after you can explain the input, output, and waveform in your own words.'}</p></div>
      </section>
    </section>
  );
}
