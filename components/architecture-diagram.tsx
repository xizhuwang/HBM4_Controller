import { architectures, boundaryLegend } from '@/lib/architectures';
import { localize, type Locale, type TrackId } from '@/lib/challenges';

export function ArchitectureDiagram({ track, activeBlock, locale, compact = false }: { track: TrackId; activeBlock: string; locale: Locale; compact?: boolean }) {
  const architecture = architectures[track];
  if (track === 'gpu') {
    const positions: Record<string, [number, number]> = { decode: [20,130], scheduler: [230,130], registers: [440,130], alu: [650,35], lsu: [650,200], memory: [860,275], writeback: [860,110], scoreboard: [230,310], telemetry: [20,310] };
    const drawing = <div className="architecture-scroll gpu-architecture"><svg viewBox="0 0 1080 430" style={{minWidth:940}} aria-label={localize(architecture.title,locale)}>
      <title>{localize(architecture.title,locale)}</title><desc>{locale === 'zh' ? 'Register read 後分為 ALU 與 LSU。LSU 接記憶體，結果到 writeback；完成訊號回到 scoreboard 與 register file。虛線為控制回饋。' : 'Register read branches to ALU and LSU. The LSU accesses memory; results reach writeback. Completion feeds the scoreboard and register file. Dashed lines are feedback.'}</desc>
      <defs><marker id="gpu-flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" className="architecture-arrowhead" /></marker></defs>
      {['M190 160 H224','M400 160 H434','M610 160 H630 V65 H644','M610 160 H630 V230 H644','M820 65 H840 V140 H854','M820 230 H840 V305 H854','M945 275 V176'].map(path => <path key={path} d={path} fill="none" className="architecture-link" markerEnd="url(#gpu-flow-arrow)" />)}
      {['M1030 140 H1050 V398 H315 V376','M315 310 V196','M945 110 V15 H525 V124'].map(path => <path key={path} d={path} fill="none" className="architecture-link" strokeDasharray="6 5" markerEnd="url(#gpu-flow-arrow)" />)}
      {architecture.nodes.map(item => { const [x,y]=positions[item.id]; const active=item.id===activeBlock; const parts=localize(item.label,locale).split(' / '); return <g key={item.id} className="architecture-node" data-kind={item.kind} data-active={active||undefined}>
        <rect x={x} y={y} width="170" height="60" rx="8" /><text x={x+85} y={y+25} textAnchor="middle"><tspan x={x+85}>{parts[0]}</tspan><tspan x={x+85} dy="18">{parts.slice(1).join(' / ')}</tspan></text>
        {active && <text x={x+85} y={y+79} textAnchor="middle" className="you-are-here">▲ {locale==='zh'?'本題位置':'THIS LAB'}</text>}
      </g>; })}
      <text x="20" y="420" className="gpu-diagram-caption">{locale==='zh' ? '實線：資料／指令路徑　虛線：完成與相依回饋　Counters：觀測，非串接 stage' : 'Solid: data/instructions · Dashed: completion/dependency feedback · Counters observe, not a serial stage'}</text>
    </svg></div>;
    if (compact) return <details className="gpu-architecture-toggle"><summary>{locale==='zh' ? '展開 Shader 資料流與控制回饋圖' : 'Expand shader dataflow and control feedback'}</summary>{drawing}</details>;
    return <div className="architecture-figure"><div className="architecture-heading"><div><h3>{localize(architecture.title,locale)}</h3><p>{localize(architecture.subtitle,locale)}</p></div></div>{drawing}</div>;
  }
  const nodeWidth = compact ? 172 : 194;
  const gap = compact ? 40 : 48;
  const width = architecture.nodes.length * nodeWidth + (architecture.nodes.length - 1) * gap;
  const height = compact ? 108 : 138;
  const centerY = compact ? 47 : 52;
  const boxHeight = compact ? 58 : 66;

  return (
    <div className="architecture-figure">
      {!compact && <div className="architecture-heading"><div><h3>{localize(architecture.title, locale)}</h3><p>{localize(architecture.subtitle, locale)}</p></div><div className="architecture-legend">{(['digital', 'boundary', 'analog'] as const).map((kind) => <span key={kind} data-kind={kind}><i />{localize(boundaryLegend[kind], locale)}</span>)}</div></div>}
      <div className="architecture-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: width }} aria-label={`${localize(architecture.title, locale)} — ${localize(architecture.subtitle, locale)}`}>
          <title>{localize(architecture.title, locale)}</title>
          <desc>{localize(architecture.subtitle, locale)}</desc>
          <defs><marker id={`arrow-${track}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" className="architecture-arrowhead" /></marker></defs>
          {architecture.nodes.slice(0, -1).map((_, index) => {
            const x1 = index * (nodeWidth + gap) + nodeWidth;
            const x2 = (index + 1) * (nodeWidth + gap);
            return <line key={index} x1={x1} y1={centerY} x2={x2 - 6} y2={centerY} className="architecture-link" markerEnd={`url(#arrow-${track})`} />;
          })}
          {architecture.nodes.map((item, index) => {
            const x = index * (nodeWidth + gap);
            const active = item.id === activeBlock;
            return <g key={item.id} className="architecture-node" data-kind={item.kind} data-active={active || undefined}>
              <rect x={x} y={18} width={nodeWidth} height={boxHeight} rx="8" />
              <text x={x + nodeWidth / 2} y={compact ? 43 : 47} textAnchor="middle"><tspan x={x + nodeWidth / 2}>{localize(item.label, locale).split(' / ')[0]}</tspan><tspan x={x + nodeWidth / 2} dy="18">{localize(item.label, locale).split(' / ').slice(1).join(' / ')}</tspan></text>
              {active && <text x={x + nodeWidth / 2} y={compact ? 101 : 118} textAnchor="middle" className="you-are-here">▲ {locale === 'zh' ? '本題位置' : 'THIS LAB'}</text>}
            </g>;
          })}
        </svg>
      </div>
    </div>
  );
}
