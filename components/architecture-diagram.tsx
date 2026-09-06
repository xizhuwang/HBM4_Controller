import { architectures, boundaryLegend } from '@/lib/architectures';
import { localize, type Locale, type TrackId } from '@/lib/challenges';

export function ArchitectureDiagram({ track, activeBlock, locale, compact = false }: { track: TrackId; activeBlock: string; locale: Locale; compact?: boolean }) {
  const architecture = architectures[track];
  const nodeWidth = 142;
  const gap = 34;
  const width = architecture.nodes.length * nodeWidth + (architecture.nodes.length - 1) * gap;
  const height = compact ? 86 : 116;

  return (
    <div className="architecture-figure">
      {!compact && <div className="architecture-heading"><div><h3>{localize(architecture.title, locale)}</h3><p>{localize(architecture.subtitle, locale)}</p></div><div className="architecture-legend">{(['digital', 'boundary', 'analog'] as const).map((kind) => <span key={kind} data-kind={kind}><i />{localize(boundaryLegend[kind], locale)}</span>)}</div></div>}
      <div className="architecture-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} aria-label={`${localize(architecture.title, locale)} — ${localize(architecture.subtitle, locale)}`}>
          <title>{localize(architecture.title, locale)}</title>
          <desc>{localize(architecture.subtitle, locale)}</desc>
          <defs><marker id={`arrow-${track}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" className="architecture-arrowhead" /></marker></defs>
          {architecture.nodes.slice(0, -1).map((_, index) => {
            const x1 = index * (nodeWidth + gap) + nodeWidth;
            const x2 = (index + 1) * (nodeWidth + gap);
            return <line key={index} x1={x1} y1={43} x2={x2 - 6} y2={43} className="architecture-link" markerEnd={`url(#arrow-${track})`} />;
          })}
          {architecture.nodes.map((item, index) => {
            const x = index * (nodeWidth + gap);
            const active = item.id === activeBlock;
            return <g key={item.id} className="architecture-node" data-kind={item.kind} data-active={active || undefined}>
              <rect x={x} y={18} width={nodeWidth} height={50} rx="6" />
              <text x={x + nodeWidth / 2} y={39} textAnchor="middle"><tspan x={x + nodeWidth / 2}>{localize(item.label, locale).split(' / ')[0]}</tspan><tspan x={x + nodeWidth / 2} dy="15">{localize(item.label, locale).split(' / ').slice(1).join(' / ')}</tspan></text>
              {active && <text x={x + nodeWidth / 2} y={84} textAnchor="middle" className="you-are-here">▲ {locale === 'zh' ? '本題位置' : 'THIS LAB'}</text>}
            </g>;
          })}
        </svg>
      </div>
    </div>
  );
}
