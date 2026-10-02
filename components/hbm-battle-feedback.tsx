'use client';
/* eslint-disable next/no-img-element -- Companion art lives in the sibling static Academy and is selected from shared browser progress. */

export type BattleState = 'idle' | 'running' | 'success' | 'failure';

type Props = {
  state: BattleState;
  locale: 'zh' | 'en';
  profession: 'novice' | 'cpu' | 'soc' | 'dft' | 'timing';
  gender: 'masculine' | 'feminine';
  element: 'fire' | 'water' | 'wind' | 'earth' | 'four-roots' | 'none';
  actorImage: string;
  reward: number;
};

const professionEffect = {
  novice: '◇',
  cpu: '╱',
  soc: '➵',
  dft: '✚',
  timing: '✺',
} as const;

const stateCopy = {
  zh: {
    idle: '準備挑戰 HBM RTL 核心',
    running: '夥伴正在執行 Regression 攻擊',
    success: 'Regression 通過！',
    failure: '核心反擊：依錯誤訊息修正後再戰',
    target: 'HBM Timing Core',
    reward: '首次通關獎勵',
  },
  en: {
    idle: 'Ready to challenge the HBM RTL core',
    running: 'Your companion is launching a regression attack',
    success: 'Regression passed!',
    failure: 'Core counterattack: debug the failure and try again',
    target: 'HBM Timing Core',
    reward: 'First-clear reward',
  },
} as const;

export function HbmBattleFeedback({ state, locale, profession, gender, element, actorImage, reward }: Props) {
  const text = stateCopy[locale];
  return (
    <section
      className={`hbm-battle-feedback profession-${profession} element-${element}`}
      data-state={state}
      aria-live="polite"
      aria-label={text[state]}
    >
      <div className="hbm-battle-copy">
        <span>REGRESSION BATTLE</span>
        <strong>{text[state]}</strong>
        {state === 'success' && reward > 0 && <small>🪙 {text.reward} +{reward}</small>}
      </div>
      <div className="hbm-battle-stage" aria-hidden="true">
        <div className="hbm-battle-actor">
          <span className="hbm-element-aura" />
          <img src={actorImage} alt="" loading="lazy" decoding="async" data-gender={gender} />
        </div>
        <span className="hbm-attack-trail">{professionEffect[profession]}</span>
        <div className="hbm-battle-target">
          <span className="hbm-hit-flash" />
          <img
            src="https://xizhuwang.github.io/rtl-interview-lab/mascot/rtl-training-dummy-display.png"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <small>{text.target}</small>
        </div>
        <b className="hbm-battle-verdict">{state === 'success' ? 'PASS' : state === 'failure' ? 'DEBUG' : ''}</b>
      </div>
    </section>
  );
}
