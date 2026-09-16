'use client';
/* eslint-disable next/no-img-element -- Shared mascot art is hosted by the sibling static Academy and selected dynamically from shared progress. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, BookOpen, Boxes, Check, CheckCircle2, ChevronRight, Circle, Clock3,
  Code2, Coins, Cpu, ExternalLink, FileCode2, Gauge, GraduationCap, Languages,
  Lightbulb, LoaderCircle, Map, Play, RotateCcw, ScrollText, Search, ShieldAlert,
  Sparkles, TerminalSquare, TestTube2, Trophy, X, XCircle,
} from 'lucide-react';

import { ArchitectureDiagram } from '@/components/architecture-diagram';
import { LabSpecSheet } from '@/components/lab-spec-sheet';
import { RtlEditor } from '@/components/rtl-editor';
import { WaveformViewer } from '@/components/waveform-viewer';
import { labContext } from '@/lib/architectures';
import { challenges, difficultyLabel, localize, tracks, type Locale, type TrackId } from '@/lib/challenges';

type Result = { ok: boolean; phase: string; console: string; elapsedMs?: number };
type AreaResult = { total: number; referenceTotal: number | null; elapsedMs: number };
type ViewMode = 'spec' | 'lab' | 'architecture' | 'review';

const storageKeys = { locale: 'controller-academy:v2:locale', solved: 'controller-academy:v2:solved', code: 'controller-academy:v2:solutions' };
const sharedKeys = {
  socEarned: 'academy-shared:v1:soc-earned',
  hbmEarned: 'academy-shared:v1:hbm-earned',
  gender: 'soc-rtl-lab:mascot-gender',
  profession: 'soc-rtl-lab:mascot-profession',
  equipment: 'soc-rtl-lab:equipment-inventory',
  equippedEquipmentUid: 'soc-rtl-lab:equipped-equipment-uid',
  consumables: 'soc-rtl-lab:consumables',
  elementLevels: 'soc-rtl-lab:element-levels',
  element: 'soc-rtl-lab:equipped-element',
  equipmentSpend: 'soc-rtl-lab:equipment-spend',
  enhancementSpend: 'soc-rtl-lab:enhancement-spend',
  consumableSpend: 'soc-rtl-lab:consumable-spend',
  elementSpend: 'soc-rtl-lab:element-spend',
  resaleCredits: 'soc-rtl-lab:resale-credits',
  dailyProgress: 'soc-rtl-lab:daily-progress',
};

type SharedProfession = 'novice' | 'cpu' | 'soc' | 'dft' | 'timing';
type SharedGender = 'masculine' | 'feminine';
type SharedElement = 'fire' | 'water' | 'wind' | 'earth';
type SharedElementLoadout = SharedElement | 'four-roots' | 'none';
type SharedEquipmentId = 'cpuBlade' | 'cpuShield' | 'socQuiver' | 'socCompass' | 'dftLantern' | 'dftProbe' | 'timingGrimoire' | 'lowPowerCharm';
type SharedEquipment = { uid: string; id: SharedEquipmentId; stars: number };
type SharedConsumables = { visor: number; crystal: number; drone: number; hammer: number };
type SharedProfile = {
  wallet: number; socEarned: number; gender: SharedGender; profession: SharedProfession;
  element: SharedElementLoadout; equipment: SharedEquipment[]; equippedEquipmentUid: string;
  elementLevels: Record<SharedElement, number>; consumables: SharedConsumables;
};

const professionNames: Record<SharedProfession, { zh: string; en: string }> = {
  novice: { zh: '邏輯學徒', en: 'Logic Apprentice' }, cpu: { zh: '電子劍士', en: 'Electronic Swordsman' },
  soc: { zh: '電子弓箭手', en: 'Electronic Archer' }, dft: { zh: '電子補師', en: 'Electronic Healer' },
  timing: { zh: '電子魔法師', en: 'Electronic Mage' },
};
const equipmentCatalog: Record<SharedEquipmentId, { profession: SharedProfession; icon: string; zh: string; en: string }> = {
  cpuBlade: { profession: 'cpu', icon: '⚔️', zh: 'Forwarding 光刃', en: 'Forwarding Blade' },
  cpuShield: { profession: 'cpu', icon: '🛡️', zh: 'Pipeline 護盾', en: 'Pipeline Shield' },
  socQuiver: { profession: 'soc', icon: '🏹', zh: 'AXI 箭匣', en: 'AXI Quiver' },
  socCompass: { profession: 'soc', icon: '🧭', zh: 'Interconnect 羅盤', en: 'Interconnect Compass' },
  dftLantern: { profession: 'dft', icon: '🏮', zh: 'Scan 診斷燈', en: 'Scan Diagnostic Lantern' },
  dftProbe: { profession: 'dft', icon: '🔎', zh: 'Fault 探針', en: 'Fault Probe' },
  timingGrimoire: { profession: 'timing', icon: '📖', zh: 'STA 魔導書', en: 'STA Grimoire' },
  lowPowerCharm: { profession: 'timing', icon: '🌙', zh: 'Low-Power 月墜', en: 'Low-Power Moon Charm' },
};
const elementCatalog: Record<SharedElement, { icon: string; zh: string; en: string }> = {
  fire: { icon: '🔥', zh: '火', en: 'Fire' }, water: { icon: '💧', zh: '水', en: 'Water' },
  wind: { icon: '🌪️', zh: '風', en: 'Wind' }, earth: { icon: '🪨', zh: '土', en: 'Earth' },
};
const consumableNames: Record<keyof SharedConsumables, { icon: string; zh: string; en: string }> = {
  visor: { icon: '🥽', zh: 'Debug 護目鏡', en: 'Debug Visor' }, crystal: { icon: '💎', zh: 'Timing 水晶', en: 'Timing Crystal' },
  drone: { icon: '🤖', zh: '晶片夥伴', en: 'Chip Companion' }, hammer: { icon: '🔨', zh: '鍛造鐵鎚', en: 'Forge Hammer' },
};
const storage = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* keep session usable */ } },
};

const copy = {
  zh: {
    product: 'HBM4 Controller & System Academy', subtitle: 'Controller → PHY → RAS → Repair → Package → Performance', search: '搜尋 HBM4 題目', curriculum: '完整 HBM4 路徑', all: '全部', progress: '完成進度',
    spec: '圖解教學與 SPEC', lab: 'RTL 工作台', architecture: '架構總覽', review: 'Design Review', run: '執行 Regression', running: '模擬中…', synth: 'Generic Synthesis', reset: '重設 Starter',
    why: '為什麼一定要做', placement: '它在 Controller 哪裡', boundary: '數位／類比邊界', requirements: '可執行規格', tests: '驗收條件', hints: '分層提示',
    result: 'Regression Console', waiting: '修改 RTL 後執行 regression；編譯、錯誤與波形會留在這裡。', passed: '功能 Regression 通過', failed: '尚未通過',
    evidence: '你必須能提出的證據', questions: '資深工程師應能回答', next: '下一題', source: 'GitHub', local: '程式與進度只存在此瀏覽器；禁止貼公司或 NDA RTL。',
    scope: '這些是公開、縮小但可執行的數位控制與介面合約。封裝／SI 題只做 budget ownership，不取代 PHY、package、SI/PI 或 silicon sign-off；產品參數必須追溯到合法取得的標準、PHY 合約與 speed bin。', ref: '通過後檢視 Reference', hideRef: '返回你的 RTL', empty: '找不到符合條件的題目。', cells: 'generic cells',
  },
  en: {
    product: 'HBM4 Controller & System Academy', subtitle: 'Controller → PHY → RAS → Repair → Package → Performance', search: 'Search HBM4 labs', curriculum: 'Complete HBM4 path', all: 'All', progress: 'Progress',
    spec: 'Visual lesson & spec', lab: 'RTL Workbench', architecture: 'Architecture overview', review: 'Design Review', run: 'Run Regression', running: 'Simulating…', synth: 'Generic Synthesis', reset: 'Reset Starter',
    why: 'Why this block exists', placement: 'Where it sits', boundary: 'Digital / analog boundary', requirements: 'Executable requirements', tests: 'Acceptance tests', hints: 'Layered hints',
    result: 'Regression Console', waiting: 'Edit the RTL and run regression. Compile errors, failures, and waveforms stay here.', passed: 'Functional regression passed', failed: 'Not passed',
    evidence: 'Evidence you must produce', questions: 'Questions an experienced owner must answer', next: 'Next lab', source: 'GitHub', local: 'Code and progress remain in this browser. Never paste company or NDA RTL.',
    scope: 'These are public, reduced, executable digital controls and interface contracts. Package/SI labs teach budget ownership and do not replace PHY, package, SI/PI, or silicon signoff. Product parameters must trace to licensed standards, the PHY contract, and the selected speed bin.', ref: 'View Reference after pass', hideRef: 'Back to your RTL', empty: 'No matching lab.', cells: 'generic cells',
  },
};

function rank(points: number) {
  if (points >= 3800) return 'Controller Integrator';
  if (points >= 2200) return 'Scheduler Owner';
  if (points >= 1000) return 'Timing Owner';
  return 'Block Designer';
}

const hbmStages = [
  { id: 'organization', zh: '01 組織與位址', en: '01 Organization', labs: ['hbm-pseudo-channel-map', 'hbm-bank-state-table'] },
  { id: 'command', zh: '02 命令與提交', en: '02 Command commit', labs: ['hbm-dual-command-gate', 'hbm-ca-parity'] },
  { id: 'timing', zh: '03 完整時序', en: '03 Full timing', labs: ['hbm-row-timing-scoreboard', 'hbm-bankgroup-tccd', 'hbm-activate-window', 'hbm-rw-turnaround'] },
  { id: 'scheduling', zh: '04 階層排程', en: '04 Scheduling', labs: ['hbm-hierarchical-arbiter'] },
  { id: 'maintenance', zh: '05 Refresh／RFM', en: '05 Refresh/RFM', labs: ['hbm-refresh-credit', 'hbm-refresh-domain', 'hbm-rfm-counter', 'hbm-drfm-sequencer'] },
  { id: 'config', zh: '06 設定與電源', en: '06 Config/power', labs: ['hbm-mrs-quiesce', 'hbm-power-state'] },
  { id: 'integration', zh: '07 Stack 整合', en: '07 Stack integration', labs: ['hbm-stack-dispatch', 'hbm-channel-capstone'] },
  { id: 'pins', zh: '08 Pin Interface', en: '08 Pin interface', labs: ['hbm-pin-ownership', 'hbm-command-pin-adapter'] },
  { id: 'phy', zh: '09 DQ／DQS PHY', en: '09 DQ/DQS PHY', labs: ['hbm-write-phy-shim', 'hbm-read-phy-capture'] },
  { id: 'training', zh: '10 Training', en: '10 Training', labs: ['hbm-training-sweep'] },
  { id: 'ras', zh: '11 DBI／RAS／ECC', en: '11 DBI/RAS/ECC', labs: ['hbm-dbi-codec', 'hbm-data-parity-ras', 'hbm-ecc-severity'] },
  { id: 'repair', zh: '12 Repair／DFT', en: '12 Repair/DFT', labs: ['hbm-lane-repair-map', 'hbm-ieee1500-wrapper'] },
  { id: 'package', zh: '13 封裝與熱', en: '13 Package/thermal', labs: ['hbm-package-budget', 'hbm-thermal-throttle'] },
  { id: 'performance', zh: '14 效能與 PIM', en: '14 Performance/PIM', labs: ['hbm-bandwidth-window', 'hbm-pim-qos-arbiter'] },
];

function readNumber(key: string) {
  const value = Number(localStorage.getItem(key) ?? '0');
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function parseSolved(raw: string | null) {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && challenges.some((item) => item.id === id))
      : [];
  } catch {
    return [];
  }
}

function readSharedProfile(hbmEarned: number) {
  let dailyCredits = 0;
  let equipment: SharedEquipment[] = [];
  let consumables: SharedConsumables = { visor: 0, crystal: 0, drone: 0, hammer: 0 };
  let elementLevels: Record<SharedElement, number> = { fire: 0, water: 0, wind: 0, earth: 0 };
  try {
    const daily = JSON.parse(localStorage.getItem(sharedKeys.dailyProgress) ?? '{}') as { rewardCredits?: unknown };
    dailyCredits = Math.max(0, Number(daily.rewardCredits) || 0);
    const rawEquipment: unknown = JSON.parse(localStorage.getItem(sharedKeys.equipment) ?? '[]');
    if (Array.isArray(rawEquipment)) equipment = rawEquipment.filter((item): item is SharedEquipment => Boolean(item && typeof item === 'object' && typeof item.uid === 'string' && typeof item.id === 'string' && item.id in equipmentCatalog)).map((item) => ({ ...item, stars: Math.max(0, Number(item.stars) || 0) }));
    const rawConsumables = JSON.parse(localStorage.getItem(sharedKeys.consumables) ?? '{}') as Partial<Record<keyof SharedConsumables, unknown>>;
    consumables = Object.fromEntries((Object.keys(consumables) as (keyof SharedConsumables)[]).map((id) => [id, Math.max(0, Number(rawConsumables[id]) || 0)])) as SharedConsumables;
    const rawElements = JSON.parse(localStorage.getItem(sharedKeys.elementLevels) ?? '{}') as Partial<Record<SharedElement, unknown>>;
    elementLevels = Object.fromEntries((Object.keys(elementLevels) as SharedElement[]).map((id) => [id, Math.max(0, Number(rawElements[id]) || 0)])) as Record<SharedElement, number>;
  } catch { /* malformed legacy data is ignored, never overwritten */ }
  const socEarned = readNumber(sharedKeys.socEarned);
  const spent = readNumber(sharedKeys.equipmentSpend) + readNumber(sharedKeys.enhancementSpend) + readNumber(sharedKeys.consumableSpend) + readNumber(sharedKeys.elementSpend);
  const wallet = Math.max(0, socEarned + hbmEarned - spent + readNumber(sharedKeys.resaleCredits) + dailyCredits);
  const rawGender = localStorage.getItem(sharedKeys.gender);
  const rawProfession = localStorage.getItem(sharedKeys.profession);
  const rawElement = localStorage.getItem(sharedKeys.element);
  return {
    wallet,
    socEarned,
    gender: rawGender === 'feminine' ? 'feminine' : 'masculine',
    profession: rawProfession && rawProfession in professionNames ? rawProfession as SharedProfession : 'novice',
    element: rawElement && (rawElement === 'none' || rawElement === 'four-roots' || rawElement in elementCatalog) ? rawElement as SharedElementLoadout : 'none',
    equipment,
    equippedEquipmentUid: localStorage.getItem(sharedKeys.equippedEquipmentUid) ?? '',
    elementLevels,
    consumables,
  } satisfies SharedProfile;
}

function mascotImage(profile: SharedProfile) {
  const profession = profile.gender === 'masculine' && profile.profession === 'soc' ? 'soc-v2' : profile.profession;
  return `https://xizhuwang.github.io/rtl-interview-lab/mascot/penguin-${profile.gender}-${profession}.png`;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('zh');
  const [selectedId, setSelectedId] = useState('hbm-pseudo-channel-map');
  const [track, setTrack] = useState<TrackId | 'all'>('hbm');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('spec');
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [solved, setSolved] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [showReference, setShowReference] = useState(false);
  const [waveform, setWaveform] = useState('');
  const [area, setArea] = useState<AreaResult | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [sharedProfile, setSharedProfile] = useState<SharedProfile>({ wallet: 0, socEarned: 0, gender: 'masculine', profession: 'novice', element: 'none', equipment: [], equippedEquipmentUid: '', elementLevels: { fire: 0, water: 0, wind: 0, earth: 0 }, consumables: { visor: 0, crystal: 0, drone: 0, hammer: 0 } });
  const [backpackOpen, setBackpackOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingRun = useRef<string | null>(null);
  const pendingSynth = useRef<string | null>(null);
  const loaded = useRef(false);

  const current = challenges.find((challenge) => challenge.id === selectedId) ?? challenges[0];
  const context = labContext[current.id];
  const text = copy[locale];
  const code = solutions[current.id] ?? current.starter;
  const points = challenges.filter((challenge) => solved.includes(challenge.id)).reduce((sum, challenge) => sum + challenge.points, 0);
  const filtered = useMemo(() => challenges.filter((challenge) => {
    const matchesTrack = track === 'all' || challenge.track === track;
    const haystack = `${challenge.id} ${challenge.title.zh} ${challenge.title.en} ${challenge.description.zh} ${challenge.description.en}`.toLowerCase();
    return matchesTrack && haystack.includes(query.trim().toLowerCase());
  }), [query, track]);
  const currentIndex = challenges.findIndex((challenge) => challenge.id === current.id);
  const nextChallenge = challenges[(currentIndex + 1) % challenges.length];
  const equippedItem = sharedProfile.equipment.find((item) => item.uid === sharedProfile.equippedEquipmentUid);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedLocale = storage.get(storageKeys.locale);
      const savedSolved = storage.get(storageKeys.solved);
      const savedCode = storage.get(storageKeys.code);
      if (savedLocale) { try { const parsed = JSON.parse(savedLocale); if (parsed === 'zh' || parsed === 'en') setLocale(parsed); } catch { /* ignore */ } }
      const restoredSolved = parseSolved(savedSolved);
      if (savedSolved) setSolved(restoredSolved);
      if (savedCode) { try { const parsed: unknown = JSON.parse(savedCode); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) setSolutions(parsed as Record<string, string>); } catch { /* ignore */ } }
      loaded.current = true;
      const earned = challenges.filter((challenge) => restoredSolved.includes(challenge.id)).reduce((sum, challenge) => sum + challenge.points, 0);
      localStorage.setItem(sharedKeys.hbmEarned, String(earned));
      setSharedProfile(readSharedProfile(earned));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(sharedKeys.hbmEarned, String(points));
    setSharedProfile(readSharedProfile(points));
  }, [points]);

  useEffect(() => {
    const syncProfile = () => setSharedProfile(readSharedProfile(points));
    window.addEventListener('storage', syncProfile);
    window.addEventListener('focus', syncProfile);
    return () => { window.removeEventListener('storage', syncProfile); window.removeEventListener('focus', syncProfile); };
  }, [points]);

  useEffect(() => { if (loaded.current) storage.set(storageKeys.locale, locale); document.documentElement.lang = locale === 'zh' ? 'zh-Hant-TW' : 'en'; }, [locale]);
  useEffect(() => {
    if (engineReady) return;
    const timer = window.setInterval(() => iframeRef.current?.contentWindow?.postMessage({ type: 'SOC_RTL_ENGINE_PING' }, window.location.origin), 700);
    return () => window.clearInterval(timer);
  }, [engineReady]);

  const markSolved = useCallback((id: string) => {
    setSolved((previous) => { if (previous.includes(id)) return previous; const next = [...previous, id]; storage.set(storageKeys.solved, next); return next; });
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'SOC_RTL_ENGINE_READY') { setEngineReady(true); return; }
      if (event.data?.type === 'SOC_RTL_RESULT' && event.data.requestId === pendingRun.current) {
        pendingRun.current = null; setRunning(false);
        const next = { ok: Boolean(event.data.ok), phase: String(event.data.phase), console: String(event.data.console ?? ''), elapsedMs: Number(event.data.elapsedMs ?? 0) };
        setResult(next); setWaveform(String(event.data.vcd ?? '')); if (next.ok) markSolved(current.id);
      }
      if (event.data?.type === 'SOC_RTL_SYNTH_RESULT' && event.data.requestId === pendingSynth.current) {
        pendingSynth.current = null; setSynthesizing(false);
        if (event.data.ok) setArea({ total: Number(event.data.total ?? 0), referenceTotal: event.data.referenceTotal == null ? null : Number(event.data.referenceTotal), elapsedMs: Number(event.data.elapsedMs ?? 0) });
        else setResult({ ok: false, phase: 'synthesis', console: String(event.data.console ?? 'Synthesis failed') });
      }
    };
    window.addEventListener('message', handler); return () => window.removeEventListener('message', handler);
  }, [current.id, markSolved]);

  const selectChallenge = (id: string) => {
    setSelectedId(id); setResult(null); setWaveform(''); setArea(null); setHintCount(0); setShowReference(false); setView('spec');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const updateCode = (value: string) => {
    setSolutions((previous) => { const next = { ...previous, [current.id]: value }; storage.set(storageKeys.code, next); return next; });
    setResult(null); setWaveform(''); setArea(null); setShowReference(false);
  };
  const run = () => {
    if (!engineReady || !current.testbench || !iframeRef.current?.contentWindow) return;
    const requestId = `run-${Date.now()}`; pendingRun.current = requestId; setRunning(true); setResult(null); setWaveform('');
    iframeRef.current.contentWindow.postMessage({ type: 'SOC_RTL_RUN', requestId, design: code, testbench: current.testbench, generation: '2005' }, window.location.origin);
  };
  const synthesize = () => {
    if (!engineReady || !iframeRef.current?.contentWindow) return;
    const requestId = `synth-${Date.now()}`; pendingSynth.current = requestId; setSynthesizing(true); setArea(null);
    iframeRef.current.contentWindow.postMessage({ type: 'SOC_RTL_SYNTH', requestId, design: code, reference: current.referenceSolution ?? '', generation: '2005' }, window.location.origin);
  };
  const equipSharedItem = (uid: string) => {
    const item = sharedProfile.equipment.find((candidate) => candidate.uid === uid);
    if (item && equipmentCatalog[item.id].profession !== sharedProfile.profession) return;
    localStorage.setItem(sharedKeys.equippedEquipmentUid, uid);
    setSharedProfile(readSharedProfile(points));
  };
  const equipSharedElement = (element: SharedElementLoadout) => {
    const owned = element === 'none' || (element === 'four-roots' ? Object.values(sharedProfile.elementLevels).every((level) => level > 0) : sharedProfile.elementLevels[element] > 0);
    if (!owned) return;
    localStorage.setItem(sharedKeys.element, element);
    setSharedProfile(readSharedProfile(points));
  };

  return (
    <main className="academy-shell">
      <iframe ref={iframeRef} src="./engine/runner.html" title="Browser Verilog engine" className="engine-frame" sandbox="allow-scripts allow-same-origin" />
      <header className="academy-header">
        <div className="brand-lockup"><span className="brand-mark"><Cpu /></span><div><h1>{text.product}</h1><p>{text.subtitle}</p></div></div>
        <div className="header-actions"><span className={`engine-status ${engineReady ? 'ready' : ''}`}><i />{engineReady ? 'Icarus ready' : 'Loading engine'}</span><a className="header-link" href="https://github.com/xizhuwang/HBM4_Controller" target="_blank" rel="noreferrer">{text.source}<ExternalLink /></a><button className="language-button" type="button" onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}><Languages />{locale === 'zh' ? 'EN' : '繁中'}</button></div>
      </header>

      <div className="academy-layout">
        <aside className="curriculum-panel">
          <label className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.search} /></label>
          <div className="panel-kicker"><span>{text.curriculum}</span><strong>{challenges.length}</strong></div>
          <nav className="track-list" aria-label={text.curriculum}><button type="button" className={track === 'all' ? 'selected' : ''} onClick={() => setTrack('all')}><Boxes /><span>{text.all}</span><b>{challenges.length}</b></button>{tracks.map((item) => <button key={item.id} type="button" className={track === item.id ? 'selected' : ''} onClick={() => setTrack(item.id)}><span className={`track-dot ${item.id}`} /><span>{localize(item.label, locale)}</span><b>{challenges.filter((challenge) => challenge.track === item.id).length}</b></button>)}</nav>
          {(track === 'hbm' || current.track === 'hbm') && <details className="sidebar-roadmap"><summary><span><b>COMPLETE HBM4 LEARNING PATH</b><small>{locale === 'zh' ? '14 模組 · Controller 到系統效能' : '14 modules · controller to system'}</small></span><strong>{challenges.filter((item) => item.track === 'hbm').length} LABS</strong></summary><div>{hbmStages.map((stage, index) => { const completed = stage.labs.filter((id) => solved.includes(id)).length; const active = stage.labs.includes(current.id); return <button key={stage.id} type="button" data-active={active} onClick={() => selectChallenge(stage.labs[0])}><i>{String(index + 1).padStart(2, '0')}</i><span><b>{locale === 'zh' ? stage.zh : stage.en}</b><small>{completed}/{stage.labs.length}</small></span></button>; })}</div></details>}
          <div className="lesson-list">{filtered.length ? filtered.map((item) => <button key={item.id} type="button" className={current.id === item.id ? 'current' : ''} onClick={() => selectChallenge(item.id)}>{solved.includes(item.id) ? <CheckCircle2 /> : <Circle />}<span><strong>{String(item.order).padStart(2, '0')} · {localize(item.title, locale)}</strong><small>{item.id}</small></span></button>) : <p className="empty-list">{text.empty}</p>}</div>
          <section className="shared-profile-card" aria-label={locale === 'zh' ? '跨 Academy 共用夥伴與背包' : 'Shared academy companion and inventory'}>
            <div><Coins /><span>{locale === 'zh' ? '共用夥伴與背包' : 'Shared companion & inventory'}</span><strong>{sharedProfile.wallet}</strong></div>
            <div className={`shared-companion element-${sharedProfile.element}`}><img src={mascotImage(sharedProfile)} alt={locale === 'zh' ? '共用企鵝夥伴' : 'Shared penguin companion'} /><span><b>{professionNames[sharedProfile.profession][locale]}</b><small>{equippedItem ? `${equipmentCatalog[equippedItem.id].icon} ${equipmentCatalog[equippedItem.id][locale]} +${equippedItem.stars}` : (locale === 'zh' ? '尚未裝備' : 'No gear equipped')}</small></span></div>
            <button className="open-backpack-button" type="button" onClick={() => setBackpackOpen(true)}><Sparkles />{locale === 'zh' ? '開啟共用夥伴與背包' : 'Open shared companion & inventory'}</button>
            <a href="https://xizhuwang.github.io/rtl-interview-lab/">{locale === 'zh' ? '前往 SoC 商店與鍛造' : 'Open the SoC shop and forge'}<ChevronRight /></a>
          </section>
          <div className="progress-block"><div><span>{text.progress}</span><b>{solved.length}/{challenges.length}</b></div><div className="progress-track"><i style={{ width: `${(solved.length / challenges.length) * 100}%` }} /></div><p><Trophy />{rank(points)}<strong>{points} pts</strong></p></div>
        </aside>

        <section className="workbench">
          <div className="lesson-heading"><div><div className="lesson-meta"><span>{current.track.toUpperCase()}</span><span>{localize(difficultyLabel[current.difficulty], locale)}</span><span><Clock3 />{current.minutes} min</span><span>+{current.points} pts</span></div><h2>{localize(current.title, locale)}</h2><p>{localize(current.description, locale)}</p></div><button type="button" className="next-button" onClick={() => selectChallenge(nextChallenge.id)}>{text.next}<ChevronRight /></button></div>
          <div className="view-tabs" role="tablist" aria-label="Lesson view"><button type="button" role="tab" aria-selected={view === 'spec'} onClick={() => setView('spec')}><ScrollText />{text.spec}</button><button type="button" role="tab" aria-selected={view === 'lab'} onClick={() => setView('lab')}><Code2 />{text.lab}</button><button type="button" role="tab" aria-selected={view === 'architecture'} onClick={() => setView('architecture')}><Map />{text.architecture}</button><button type="button" role="tab" aria-selected={view === 'review'} onClick={() => setView('review')}><GraduationCap />{text.review}</button></div>

          {view === 'spec' && <LabSpecSheet challenge={current} locale={locale} onStart={() => setView('lab')} />}

          {view === 'lab' && <><ArchitectureDiagram track={current.track} activeBlock={context.blockId} locale={locale} compact /><section className="editor-card"><div className="editor-titlebar"><div><FileCode2 /><span>rtl/{current.id}.v</span><em>Verilog-2005</em></div><div><button type="button" onClick={() => updateCode(current.starter)}><RotateCcw />{text.reset}</button>{solved.includes(current.id) && current.referenceSolution && <button type="button" onClick={() => setShowReference((value) => !value)}><BookOpen />{showReference ? text.hideRef : text.ref}</button>}</div></div><RtlEditor value={showReference ? current.referenceSolution ?? code : code} onChange={showReference ? () => undefined : updateCode} readOnly={showReference} /><div className="editor-toolbar"><p><ShieldAlert />{text.local}</p><div><button type="button" className="synth-button" disabled={!engineReady || synthesizing} onClick={synthesize}>{synthesizing ? <LoaderCircle className="spin" /> : <Gauge />}{text.synth}</button><button type="button" className="run-button" disabled={!engineReady || running || showReference} onClick={run}>{running ? <LoaderCircle className="spin" /> : <Play />}{running ? text.running : text.run}</button></div></div></section>{waveform && <WaveformViewer vcd={waveform} locale={locale} />}</>}

          {view === 'architecture' && <section className="concept-view"><ArchitectureDiagram track={current.track} activeBlock={context.blockId} locale={locale} /><div className="concept-grid"><article><span><Map />{text.placement}</span><p>{localize(context.placement, locale)}</p></article><article><span><Lightbulb />{text.why}</span><ul>{context.why.map((item, index) => <li key={index}>{localize(item, locale)}</li>)}</ul></article><article className="boundary-card"><span><Activity />{text.boundary}</span><p>{localize(context.boundary, locale)}</p></article></div></section>}

          {view === 'review' && <section className="review-view"><div className="review-intro"><GraduationCap /><div><h3>{text.questions}</h3><p>{locale === 'zh' ? '先口頭回答，再用你寫的 RTL、assertion、波形與測試證明。只講名詞不算完成。' : 'Answer verbally, then prove it with RTL, assertions, waveforms, and tests. Naming concepts is not completion.'}</p></div></div><ol className="review-questions">{context.review.map((item, index) => <li key={index}><span>{index + 1}</span><p>{localize(item, locale)}</p></li>)}</ol><div className="evidence-list"><h3>{text.evidence}</h3>{[locale === 'zh' ? '逐拍指出 state、timer、valid/tag 更新位置。' : 'Identify state, timer, and valid/tag updates cycle by cycle.', locale === 'zh' ? '提出一個 safety assertion、一個 liveness property。' : 'Provide one safety assertion and one liveness property.', locale === 'zh' ? '設計正常、邊界、illegal/error injection 三類測試。' : 'Design normal, boundary, and illegal/error-injection tests.', locale === 'zh' ? '說明 PPA critical path 與可接受的 pipeline latency。' : 'Explain the PPA critical path and acceptable pipeline latency.'].map((item) => <p key={item}><Check />{item}</p>)}</div></section>}
        </section>

        <aside className="mentor-panel">
          <section className={`result-card ${result ? result.ok ? 'pass' : 'fail' : ''}`} aria-live="polite"><div className="result-heading"><TerminalSquare /><span>{text.result}</span>{result?.ok ? <CheckCircle2 /> : result ? <XCircle /> : null}</div>{!result ? <p className="waiting-copy">{text.waiting}</p> : <><strong>{result.ok ? text.passed : text.failed}</strong><small>{result.phase} · {Math.round(result.elapsedMs ?? 0)} ms</small><pre>{result.console.replaceAll('@@PASS@@', '').replaceAll('@@FAIL@@', '').trim()}</pre></>}{area && <div className="area-result"><span>{text.cells}</span><b>{area.total}</b>{area.referenceTotal != null && <small>reference {area.referenceTotal} · Δ {area.total - area.referenceTotal}</small>}</div>}</section>
          <section className="mentor-card"><h3><Lightbulb />{text.why}</h3><ul>{context.why.map((item, index) => <li key={index}>{localize(item, locale)}</li>)}</ul></section>
          <section className="mentor-card"><h3><TestTube2 />{text.requirements}</h3><ul>{current.specs.map((item, index) => <li key={index}>{localize(item, locale)}</li>)}</ul></section>
          <section className="mentor-card"><h3><CheckCircle2 />{text.tests}</h3><ul>{current.testGroups.map((item, index) => <li key={index}>{localize(item, locale)}</li>)}</ul></section>
          <section className="mentor-card hints-card"><h3><Lightbulb />{text.hints}</h3>{current.hints.slice(0, hintCount).map((item, index) => <p key={index}><b>{index + 1}</b>{localize(item, locale)}</p>)}<button type="button" disabled={hintCount >= current.hints.length} onClick={() => setHintCount((value) => Math.min(current.hints.length, value + 1))}>{hintCount >= current.hints.length ? (locale === 'zh' ? '提示已全部顯示' : 'All hints shown') : (locale === 'zh' ? '揭示下一層提示' : 'Reveal next hint')}</button></section>
          <p className="scope-note">{text.scope}</p>
        </aside>
      </div>
      {backpackOpen && <div className="shared-backpack-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBackpackOpen(false); }}><dialog open className="shared-backpack-dialog" aria-labelledby="shared-backpack-title"><header><div><span>{locale === 'zh' ? '跨 Academy 共用資料' : 'Shared Academy data'}</span><h2 id="shared-backpack-title">{locale === 'zh' ? '夥伴與背包' : 'Companion & Inventory'}</h2></div><button type="button" aria-label={locale === 'zh' ? '關閉背包' : 'Close inventory'} onClick={() => setBackpackOpen(false)}><X /></button></header><div className="shared-backpack-grid"><article className={`shared-companion-preview element-${sharedProfile.element}`}><img src={mascotImage(sharedProfile)} alt="" /><h3>{professionNames[sharedProfile.profession][locale]}</h3><p>{locale === 'zh' ? '角色、職業、裝備與屬性會同步回 SoC RTL Academy。' : 'Character, class, gear, and element sync back to SoC RTL Academy.'}</p>{equippedItem && <strong>{equipmentCatalog[equippedItem.id].icon} {equipmentCatalog[equippedItem.id][locale]} · +{equippedItem.stars}</strong>}</article><div className="shared-inventory"><section><h3>{locale === 'zh' ? `裝備（${sharedProfile.equipment.length}）` : `Gear (${sharedProfile.equipment.length})`}</h3><div className="inventory-options"><button type="button" aria-pressed={!sharedProfile.equippedEquipmentUid} onClick={() => equipSharedItem('')}>{locale === 'zh' ? '卸下裝備' : 'Unequip'}</button>{sharedProfile.equipment.map((item) => { const meta = equipmentCatalog[item.id]; const usable = meta.profession === sharedProfile.profession; return <button key={item.uid} type="button" disabled={!usable} aria-pressed={item.uid === sharedProfile.equippedEquipmentUid} onClick={() => equipSharedItem(item.uid)}><span>{meta.icon}</span><b>{meta[locale]}</b><small>+{item.stars}{!usable ? ` · ${professionNames[meta.profession][locale]}` : ''}</small></button>; })}</div>{sharedProfile.equipment.length === 0 && <p>{locale === 'zh' ? '背包還沒有裝備，可到 SoC Academy 商店取得。' : 'No gear yet. Visit the SoC Academy shop.'}</p>}</section><section><h3>{locale === 'zh' ? '屬性裝備' : 'Element loadout'}</h3><div className="element-options"><button type="button" aria-pressed={sharedProfile.element === 'none'} onClick={() => equipSharedElement('none')}>{locale === 'zh' ? '無屬性' : 'None'}</button>{(Object.keys(elementCatalog) as SharedElement[]).map((id) => <button key={id} type="button" disabled={sharedProfile.elementLevels[id] === 0} aria-pressed={sharedProfile.element === id} onClick={() => equipSharedElement(id)}>{elementCatalog[id].icon} {elementCatalog[id][locale]} Lv.{sharedProfile.elementLevels[id]}</button>)}<button type="button" disabled={!Object.values(sharedProfile.elementLevels).every((level) => level > 0)} aria-pressed={sharedProfile.element === 'four-roots'} onClick={() => equipSharedElement('four-roots')}>✨ {locale === 'zh' ? '四靈根' : 'Four Roots'}</button></div></section><section><h3>{locale === 'zh' ? '消耗品' : 'Consumables'}</h3><div className="consumable-list">{(Object.keys(consumableNames) as (keyof SharedConsumables)[]).map((id) => <span key={id}><i>{consumableNames[id].icon}</i><b>{consumableNames[id][locale]}</b><strong>×{sharedProfile.consumables[id]}</strong></span>)}</div></section></div></div><footer><a href="https://xizhuwang.github.io/rtl-interview-lab/">{locale === 'zh' ? '前往完整商店、鍛造與角色設定' : 'Open the full shop, forge, and character settings'}<ExternalLink /></a></footer></dialog></div>}
    </main>
  );
}
