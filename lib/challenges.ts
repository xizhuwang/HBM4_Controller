import { controllerChallenges } from './controller-challenges';

export type Locale = 'zh' | 'en';
export type Localized = { zh: string; en: string };
export type TrackId = 'dram' | 'hbm' | 'lpddr' | 'gddr' | 'pcie';

export type PatternRule = { pattern: string; flags?: string; message: Localized; reject?: boolean };
export type Challenge = {
  id: string;
  order: number;
  track: TrackId;
  title: Localized;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'capstone';
  minutes: number;
  points: number;
  kind: 'build' | 'debug' | 'constraint' | 'optimize';
  judge: 'simulation' | 'pattern' | 'interactive' | 'cnf';
  language: 'Verilog-2005' | 'SystemVerilog/UVM' | 'Timing Lab' | 'CNF / DIMACS';
  description: Localized;
  specs: Localized[];
  testGroups: Localized[];
  hints: Localized[];
  starter: string;
  testbench?: string;
  patternRules?: PatternRule[];
  referenceSolution?: string;
  supportCode?: string;
};

export const tracks: { id: TrackId; label: Localized; accent: string }[] = [
  { id: 'dram', label: { zh: 'DRAM Controller', en: 'DRAM Controller' }, accent: 'dram' },
  { id: 'hbm', label: { zh: 'HBM Controller', en: 'HBM Controller' }, accent: 'hbm' },
  { id: 'lpddr', label: { zh: 'LPDDR Controller', en: 'LPDDR Controller' }, accent: 'lpddr' },
  { id: 'gddr', label: { zh: 'GDDR Controller', en: 'GDDR Controller' }, accent: 'gddr' },
  { id: 'pcie', label: { zh: 'PCIe Controller', en: 'PCIe Controller' }, accent: 'pcie' },
];

// The foundation curriculum remains exclusively in rtl-interview-lab.
// This repository exports only non-overlapping controller-specialist labs.
export const challenges: Challenge[] = [...controllerChallenges].sort((a, b) => a.order - b.order);

export const difficultyLabel: Record<Challenge['difficulty'], Localized> = {
  beginner: { zh: '先備', en: 'Prerequisite' },
  intermediate: { zh: '進階', en: 'Advanced' },
  advanced: { zh: '資深整合', en: 'Senior integration' },
  capstone: { zh: 'Controller Capstone', en: 'Controller capstone' },
};

export const kindLabel: Record<Challenge['kind'], Localized> = {
  build: { zh: '實作', en: 'Build' },
  debug: { zh: 'Debug', en: 'Debug' },
  constraint: { zh: '約束', en: 'Constraint' },
  optimize: { zh: '最佳化', en: 'Optimize' },
};

export function localize(value: Localized, locale: Locale) { return value[locale]; }
