'use client';

import { useMemo, useState } from 'react';
import { Activity, Download } from 'lucide-react';

type Change = { time: number; value: string };
type Signal = { code: string; name: string; width: number; changes: Change[] };

function parseVcd(vcd: string): Signal[] {
  const lines = vcd.split(/\r?\n/);
  const scopes: string[] = [];
  const signals = new Map<string, Signal>();
  let time = 0;
  let definitions = true;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (definitions) {
      const scope = line.match(/^\$scope\s+\S+\s+(\S+)\s+\$end/);
      if (scope) { scopes.push(scope[1]); continue; }
      if (line.startsWith('$upscope')) { scopes.pop(); continue; }
      const variable = line.match(/^\$var\s+\S+\s+(\d+)\s+(\S+)\s+(.+?)\s+\$end/);
      if (variable) {
        const [, width, code, reference] = variable;
        // Keep the first (top-level) name when the DUT port aliases a TB signal.
        if (!signals.has(code)) signals.set(code, { code, width: Number(width), name: [...scopes, reference.replace(/\s+\[[^\]]+\]$/, '')].join('.'), changes: [] });
        continue;
      }
      if (line.startsWith('$enddefinitions')) definitions = false;
      continue;
    }
    if (line[0] === '#') { time = Number(line.slice(1)); continue; }
    const scalar = line.match(/^([01xz])(.+)$/i);
    if (scalar && signals.has(scalar[2])) signals.get(scalar[2])?.changes.push({ time, value: scalar[1].toLowerCase() });
    const vector = line.match(/^b([01xz]+)\s+(.+)$/i);
    if (vector && signals.has(vector[2])) signals.get(vector[2])?.changes.push({ time, value: vector[1].toLowerCase() });
  }

  const priority = (signal: Signal) => {
    const name = signal.name.toLowerCase();
    if (name.includes('expected')) return 0;
    if (/(\.clk$|clock|rst|reset|flush)/.test(name)) return 1;
    if (/(valid|ready|commit)/.test(name)) return 2;
    if (/(result|tag|mask|active|busy|grant|count|error|done|pulse|control|sum)/.test(name)) return 3;
    if (name.split('.').length === 2 && !/\.(i|j|k|n|x|y|z)$/.test(name)) return 4;
    return 6;
  };
  return [...signals.values()]
    .filter((signal) => signal.changes.length && signal.width <= 128)
    .sort((a, b) => priority(a) - priority(b) || a.name.localeCompare(b.name));
}

function valueAt(changes: Change[], time: number) {
  let value = 'x';
  for (const change of changes) {
    if (change.time > time) break;
    value = change.value;
  }
  return value;
}

export function WaveformViewer({ vcd, locale, preferredSignals, reference = false }: { vcd: string; locale: 'zh' | 'en'; preferredSignals?: string[]; reference?: boolean }) {
  const allSignals = useMemo(() => parseVcd(vcd), [vcd]);
  const [selection, setSelection] = useState<{ vcd: string; codes: string[] } | null>(null);
  const defaults = preferredSignals ? preferredSignals.flatMap(name => allSignals.filter(signal => signal.name === `tb.${name}`)) : allSignals.slice(0, 12);
  const codes = selection?.vcd === vcd ? selection.codes : defaults.map(signal => signal.code);
  const signals = codes.map(code => allSignals.find(signal => signal.code === code)).filter((signal): signal is Signal => Boolean(signal));
  const toggle = (code: string) => setSelection({ vcd, codes: codes.includes(code) ? codes.filter(item => item !== code) : [...codes, code] });
  const download = () => {
    const url = URL.createObjectURL(new Blob([vcd], { type: 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = 'simulation.vcd'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const timescale = vcd.match(/\$timescale\s+([^$]+)\$end/)?.[1].trim() ?? 'VCD tick';
  const maxTime = useMemo(() => { let end=1; for(const match of vcd.matchAll(/^#(\d+)\s*$/gm)) end=Math.max(end,Number(match[1])); return end; }, [vcd]);
  const plotX = 170;
  const plotWidth = 760;
  const rowHeight = 42;
  const height = 38 + signals.length * rowHeight;
  const xFor = (time: number) => plotX + (time / maxTime) * plotWidth;

  if (!allSignals.length) return null;

  return <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-primary" />{reference ? (locale === 'zh' ? '參考解答實際模擬波形' : 'Simulated reference trace') : (locale === 'zh' ? '編譯後波形' : 'Simulation waveform')}</div>
      <p className="text-xs text-muted-foreground">{locale === 'zh' ? '紫色為 expected_*；青色為 DUT／測試訊號' : 'Purple: expected_* · Cyan: DUT/test signals'} · tick = {timescale}</p>
      <button type="button" className="wave-download" onClick={download}><Download />{locale === 'zh' ? '下載 VCD' : 'Download VCD'}</button>
    </div>
    <details className="wave-signal-picker"><summary>{locale === 'zh' ? `選擇訊號（${signals.length}/${allSignals.length}）` : `Select signals (${signals.length}/${allSignals.length})`}</summary><div>{allSignals.map(signal => <label key={signal.code}><input type="checkbox" checked={codes.includes(signal.code)} onChange={() => toggle(signal.code)} /><span>{signal.name.replace(/^tb\./,'')} <small>[{signal.width}]</small></span></label>)}</div></details>
    {!signals.length && <p className="px-4 py-3">{locale === 'zh' ? '請至少勾選一個訊號。' : 'Select at least one signal.'}</p>}
    <div className="overflow-x-auto p-3">
      <svg viewBox={`0 0 950 ${height}`} style={{width:'100%',height:'auto'}} className="min-w-[900px]" aria-label={locale === 'zh' ? '模擬波形圖' : 'Simulation waveform plot'}>
        {Array.from({ length: 11 }, (_, index) => {
          const x = plotX + index * (plotWidth / 10);
          return <g key={index}><line x1={x} x2={x} y1={24} y2={height} stroke="currentColor" className="text-border" strokeWidth="1" /><text x={x} y={15} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">{Math.round((maxTime * index) / 10)}</text></g>;
        })}
        {signals.map((signal, index) => {
          const y = 38 + index * rowHeight;
          const expected = signal.name.toLowerCase().includes('expected');
          const color = expected ? '#8b5cf6' : '#0891b2';
          const shortName = signal.name.replace(/^tb\./, '').replace(/\.(dut|d)\./, '.');
          if (signal.width === 1) {
            const times = [...new Set([0, ...signal.changes.map((change) => change.time), maxTime])].sort((a, b) => a - b);
            let path = '';
            times.forEach((sampleTime, sampleIndex) => {
              const value = valueAt(signal.changes, sampleTime);
              const level = value === '1' ? y : value === '0' ? y + 20 : y + 10;
              const x = xFor(sampleTime);
              if (sampleIndex === 0) path = `M ${x} ${level}`;
              else path += ` H ${x} V ${level}`;
            });
            return <g key={signal.code}><text x="4" y={y + 14} className="fill-foreground font-mono text-[11px]">{shortName.slice(-23)}</text><path d={path} fill="none" stroke={color} strokeWidth="2" /></g>;
          }
          const segments = signal.changes.map((change, changeIndex) => ({ start: change.time, end: signal.changes[changeIndex + 1]?.time ?? maxTime, value: change.value }));
          return <g key={signal.code}><text x="4" y={y + 14} className="fill-foreground font-mono text-[11px]">{shortName.slice(-23)}</text>{segments.map((segment, segmentIndex) => { const x = xFor(segment.start); const width = Math.max(1, xFor(segment.end) - x); return <g key={segmentIndex}><rect x={x} y={y + 2} width={width} height="20" fill="transparent" stroke={color} /><title>{signal.name}: {/[xz]/i.test(segment.value) ? `b${segment.value}` : `0x${BigInt('0b'+segment.value).toString(16)}`} @ {segment.start}</title><text x={x + 3} y={y + 16} className="font-mono text-[9px]" fill={color}>{width > 28 ? (/[xz]/i.test(segment.value) ? `b${segment.value}` : `0x${BigInt('0b'+segment.value).toString(16)}`) : ''}</text></g>;})}</g>;
        })}
      </svg>
    </div>
    <p className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">{reference ? (locale === 'zh' ? '這是已驗收參考解答的模擬結果，不是你的程式執行結果。圖上的時間單位由 VCD 定義。' : 'This is a verified reference simulation, not the execution of your code. Time units come from the VCD.') : (locale === 'zh' ? '波形來自同一次瀏覽器內模擬。若題目的 testbench 提供 expected_* golden 訊號，會一起顯示以協助逐拍比對。' : 'Waveforms come from the same in-browser simulation. When a testbench exposes expected_* golden signals, they appear for cycle-by-cycle comparison.')}</p>
  </section>;
}
