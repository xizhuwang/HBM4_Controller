import { useState } from 'react';
import type { Locale } from '@/lib/challenges';

const ink = '#263450', muted = '#8592a8', blue = '#4378e8', purple = '#865ac7', pale = '#edf2fc', green = '#2c9779';
function Box({ x,y,w=100,h=52,label,tone='blue' }: { x:number;y:number;w?:number;h?:number;label:string;tone?:string }) {
  return <g><rect x={x} y={y} width={w} height={h} rx="12" fill={tone==='purple'?'#f0eafa':tone==='muted'?'#f0f2f6':pale} stroke={tone==='purple'?'#c9b5e3':'#c8d6ee'} /><text x={x+w/2} y={y+h/2+6} textAnchor="middle" fill={ink} fontSize="17" fontWeight="600">{label}</text></g>;
}
export function GpuConceptVisual({ topic, locale }: { topic:string;locale:Locale }) {
  const zh=locale==='zh';
  const [alternate,setAlternate]=useState(false);
  const [registers,setRegisters]=useState(8);
  const [mask,setMask]=useState(15);
  const [bankView,setBankView]=useState(false);
  const label = (a:string,b:string) => zh?a:b;
  const titles: Record<string,string> = {
    shader:label('指令分流與完成回饋','Instruction paths and completion feedback'), simt:label('一條指令，四個運算 lane','One instruction, four execution lanes'),
    divergence:label('同一群組的兩條分支路徑','Two branch paths in one group'), scoreboard:label('未完成的結果會阻擋相依指令','Pending results block dependent instructions'),
    latency:label('用就緒工作填補等待時間','Fill waiting time with ready work'), occupancy:label('資源上限決定可駐留數量','Resource limits determine residency'),
    memory:label('位址排列改變記憶體交易數','Address patterns change transaction counts'), banks:label('同一個 bank 的不同 word 需要分輪服務','Distinct words in one bank require separate rounds'), bottleneck:label('沿著資料流定位瓶頸','Locate the limiting stage in the flow'),
  };
  const arrow=(d:string,dashed=false) => <path key={d} d={d} fill="none" stroke={muted} strokeWidth="2" strokeDasharray={dashed?'5 5':undefined} markerEnd={`url(#concept-arrow-${topic})`} />;
  const groups=Math.min(4,Math.floor(64/(4*registers)));
  return <figure className="gpu-concept-visual">
    <svg viewBox="0 0 480 250" aria-label={bankView?titles.banks:titles[topic]}>
      <title>{bankView?titles.banks:titles[topic]}</title>
      <defs><marker id={`concept-arrow-${topic}`} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L0 6 L6 3 Z" fill={muted} /></marker></defs>
      {topic==='shader' && <>
        <Box x={12} y={96} w={96} label="Decode" /><Box x={146} y={96} w={100} label="Issue" /><Box x={290} y={36} w={88} label="ALU" tone="purple" /><Box x={290} y={158} w={88} label="LSU" />
        {arrow('M108 122 H140')}{arrow('M246 122 H266 V62 H284')}{arrow('M246 122 H266 V184 H284')}{arrow('M378 62 H424 V117')}{arrow('M378 184 H424 V135')}
        <circle cx="424" cy="126" r="9" fill={green} />{arrow('M424 117 V15 H196 V90',true)}
        <text x="302" y="235" textAnchor="middle" fontSize="16" fill={muted}>LSU → Memory → Writeback</text><text x="210" y="42" fontSize="16" fill={purple}>{label('完成回饋','Completion')}</text>
      </>}
      {topic==='simt' && <>
        <rect x="170" y="12" width="140" height="38" rx="19" fill="#e9e1f6" /><text x="240" y="37" textAnchor="middle" fontSize="18" fontWeight="700" fill={purple}>ADD</text>
        {[0,1,2,3].map(i=>{const on=Boolean(mask&(1<<i));const x=20+i*118;return <g key={i} opacity={on?1:.28}>
          <path d={`M240 50 V67 H${x+43} V83`} fill="none" stroke="#c8b9df" strokeWidth="2" /><rect x={x} y="85" width="86" height="116" rx="14" fill={on?pale:'#f0f2f5'} stroke={on?'#c6d5ee':'#dfe3e9'} />
          <text x={x+43} y="112" textAnchor="middle" fontSize="15" fill={muted}>lane {i}</text><text x={x+43} y="150" textAnchor="middle" fontSize="21" fontWeight="650" fill={ink}>{i+1} + 2</text><text x={x+43} y="184" textAnchor="middle" fontSize="21" fontWeight="700" fill={blue}>{on?i+3:'—'}</text>
        </g>;})}<text x="240" y="236" textAnchor="middle" fontSize="16" fill={muted}>active mask = {mask.toString(2).padStart(4,'0')}</text>
      </>}
      {topic==='divergence' && <>
        {[0,1,2,3].map(i=><circle key={i} cx={48+i*25} cy="40" r="9" fill={i%2===0?purple:blue} />)}<text x="176" y="46" fontSize="17" fill={ink}>active = 1111</text>
        {arrow('M86 58 V90 H140 V111')}{arrow('M86 90 H338 V111')}<Box x={64} y={117} w={150} label="THEN · 0101" tone="purple" /><Box x={266} y={117} w={150} label="ELSE · 1010" />
        {arrow('M139 169 V202 H232')}{arrow('M341 169 V202 H248')}<circle cx="240" cy="202" r="8" fill={green}/><text x="240" y="238" textAnchor="middle" fontSize="17" fill={muted}>{label('不同路徑分次執行，再匯合','Execute paths separately, then reconverge')}</text>
      </>}
      {topic==='scoreboard' && <>
        {[0,1,2,3,4,5,6,7].map(i=><g key={i}><rect x={14+i*58} y="35" width="48" height="66" rx="10" fill={i===2&&!alternate?'#f0e6fa':pale} stroke={i===2&&!alternate?'#b492d6':'#d6dfed'} /><text x={38+i*58} y="62" textAnchor="middle" fontSize="17" fill={ink}>r{i}</text><circle cx={38+i*58} cy="82" r="5" fill={i===2&&!alternate?purple:green}/></g>)}
        <Box x={54} y={145} w={238} label="r3 = r2 + 1" />{arrow('M154 102 V139')}<rect x="320" y="151" width="130" height="40" rx="20" fill={alternate?'#e7f5ef':'#f1e8f9'} /><text x="385" y="177" textAnchor="middle" fontSize="17" fontWeight="650" fill={alternate?green:purple}>{alternate?'READY':'WAIT'}</text>
        <text x="240" y="232" textAnchor="middle" fontSize="17" fill={muted}>{alternate?label('r2 已寫回，相依解除','r2 writeback releases the dependency'):label('r2 的結果尚未完成','r2 result is still pending')}</text>
      </>}
      {topic==='latency' && <>
        <text x="16" y="30" fontSize="16" fill={muted}>{label('時間 →','Time →')}</text>
        {[0,1,2].map(i=><g key={i}><text x="15" y={72+i*57} fontSize="16" fill={ink}>G{i}</text>{[0,1,2,3,4,5].map(j=>{const execute=alternate?(j%3===i):(i===0&&j===0);return <rect key={j} x={60+j*66} y={46+i*57} width="58" height="36" rx="7" fill={execute?[purple,blue,green][i]:'#e9edf3'} stroke={execute?'none':'#dde3ed'}/>;})}</g>)}
        <text x="240" y="242" textAnchor="middle" fontSize="17" fill={muted}>{alternate?label('選擇其他 ready group 發射','Issue another ready group'):label('只等同一個 group，留下空檔','Waiting on one group leaves idle slots')}</text>
      </>}
      {topic==='occupancy' && <>
        <text x="240" y="35" textAnchor="middle" fontSize="17" fill={muted}>{label('4 個 slot · 64 個 registers','4 slots · 64 registers')}</text>
        {[0,1,2,3].map(i=><g key={i}><rect x={20+i*118} y="62" width="86" height="105" rx="14" fill={i<groups?'#ece5f7':'#f0f2f6'} stroke={i<groups?'#c8b1e2':'#dfe4ec'}/><rect x={36+i*118} y="83" width="54" height="8" rx="4" fill={i<groups?purple:'#dfe4ec'}/><rect x={36+i*118} y="101" width="54" height="8" rx="4" fill={i<groups?purple:'#dfe4ec'}/><text x={63+i*118} y="145" textAnchor="middle" fontSize="16" fill={i<groups?purple:muted}>{i<groups?'resident':'free'}</text></g>)}
        <text x="240" y="207" textAnchor="middle" fontSize="25" fontWeight="700" fill={ink}>{groups} / 4 groups</text><text x="240" y="236" textAnchor="middle" fontSize="16" fill={muted}>{label('每 group 4 threads；只看 register 上限','4 threads/group; register bound only')}</text>
      </>}
      {topic==='memory' && !bankView && <>
        {[0,1,2,3].map(i=><g key={i}><rect x={20+i*118} y="23" width="86" height="50" rx="12" fill={pale} stroke="#cbd8ee"/><text x={63+i*118} y="55" textAnchor="middle" fontSize="21" fill={ink}>{alternate?i*16:i*4}</text>{arrow(`M${63+i*118} 73 V112`)}</g>)}
        {alternate?[0,1,2,3].map(i=><Box key={i} x={20+i*118} y={119} w={86} h={57} label={`S${i}`} tone="purple"/>):<Box x={20} y={119} w={440} h={57} label="0 — 15 bytes · Segment 0" tone="purple"/>}
        <text x="240" y="219" textAnchor="middle" fontSize="22" fontWeight="650" fill={purple}>{alternate?'4 transactions':'1 transaction'}</text><text x="240" y="246" textAnchor="middle" fontSize="15" fill={muted}>{label('教學值：4-byte load，16-byte segment','Teaching model: 4-byte loads, 16-byte segments')}</text>
      </>}
      {(topic==='banks' || (topic==='memory' && bankView)) && <>
        {[0,16,0,32].map((address,i)=><g key={i}><rect x={20+i*118} y="22" width="86" height="45" rx="10" fill={pale}/><text x={63+i*118} y="51" textAnchor="middle" fontSize="20" fill={ink}>{address}</text>{arrow(`M${63+i*118} 67 V88 H165 V115`)}</g>)}
        <rect x="20" y="123" width="290" height="65" rx="12" fill="#f1eafa" stroke="#c9b5e3" />
        {[0,4,8].map((word,i)=><g key={word}><rect x={32+i*92} y="136" width="82" height="38" rx="8" fill="#fff"/><text x={73+i*92} y="161" textAnchor="middle" fill={purple} fontSize="18">W{word}</text></g>)}
        {[1,2,3].map((bank,i)=><Box key={bank} x={324+i*50} y={123} w={43} h={65} label={`B${bank}`} tone="muted"/>)}
        <text x="165" y="217" textAnchor="middle" fill={purple} fontSize="20" fontWeight="650">Bank 0 · 3 rounds</text><text x="240" y="246" textAnchor="middle" fill={muted} fontSize="15">{label('4 banks · 4-byte word · 同 word 讀取可 broadcast','4 banks · 4-byte words · Same-word reads broadcast')}</text>
      </>}
      {topic==='bottleneck' && <>
        {['Resident','Ready','Issue','Unit wait'].map((name,i)=><g key={i}><text x="14" y={42+i*53} fontSize="17" fill={ink}>{name}</text><rect x="112" y={22+i*53} width="350" height="24" rx="8" fill="#eef1f6"/><rect x="112" y={22+i*53} width={[350,287,109,179][i]} height="24" rx="8" fill={i===2?purple:i===3?green:blue}/><text x={104+[350,287,109,179][i]} y={39+i*53} textAnchor="end" fontSize="13" fontWeight="650" fill="#fff">{[100,82,31,51][i]}</text></g>)}
        <text x="240" y="246" textAnchor="middle" fontSize="15" fill={muted}>{label('示意：100 個採樣 cycle；ready 82，issue 31','Illustration: 100 sampled cycles; ready 82, issue 31')}</text>
      </>}
    </svg>
    {topic==='simt' && <div className="gpu-visual-controls"><span>{label('切換 lane','Toggle lanes')}</span>{[0,1,2,3].map(i=><button key={i} type="button" aria-pressed={Boolean(mask&(1<<i))} onClick={()=>setMask(mask^(1<<i))}>L{i}</button>)}</div>}
    {['scoreboard','latency','memory'].includes(topic) && <div className="gpu-visual-controls">{!bankView && <button type="button" aria-pressed={alternate} onClick={()=>setAlternate(!alternate)}>{topic==='scoreboard'?label(alternate?'回到等待狀態':'完成 r2 寫回',alternate?'Reset to waiting':'Complete r2 writeback'):topic==='latency'?label(alternate?'只看等待':'加入其他 ready group',alternate?'Show waiting only':'Add ready groups'):label(alternate?'改成連續位址':'改成分散位址',alternate?'Use contiguous addresses':'Scatter addresses')}</button>}{topic==='memory' && <button type="button" onClick={()=>setBankView(!bankView)}>{bankView?label('看位址合併','Show coalescing'):label('看 Bank conflict','Show bank conflicts')}</button>}</div>}
    {topic==='occupancy' && <label className="gpu-register-control"><span>{label('每 thread registers','Registers/thread')} <b>{registers}</b></span><input aria-label={label('每個 thread 使用的暫存器數','Registers used per thread')} type="range" min="4" max="16" value={registers} onChange={event=>setRegisters(Number(event.target.value))}/></label>}
  </figure>;
}
