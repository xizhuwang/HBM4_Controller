import type { Localized } from './challenges';

const b = (zh: string, en: string): Localized => ({ zh, en });

export type HbmTerm = { name: Localized; meaning: Localized };
export type HbmCircuitStage = { label: Localized; detail: Localized };
export type HbmWaveSignal = { name: string; kind: 'bit' | 'bus'; values: string[] };
export type HbmLearningGuide = {
  plainGoal: Localized;
  analogy: Localized;
  input: Localized;
  output: Localized;
  terms: string[];
  circuit: HbmCircuitStage[];
  waveform: { caption: Localized; cycles: string[]; signals: HbmWaveSignal[] };
  steps: Localized[];
};

export const hbmTerms: Record<string, HbmTerm> = {
  hbm: { name: b('HBM', 'HBM'), meaning: b('把多顆 DRAM die 垂直堆疊、用很寬的介面平行傳資料的記憶體。Controller 位於邏輯晶片一側。', 'Stacked DRAM dies using a very wide parallel interface. The controller sits on the logic-die side.') },
  phy: { name: b('PHY', 'PHY'), meaning: b('把 controller 的同步數位命令轉成 HBM 腳位電氣訊號，負責 training、對齊與取樣；本課不實作這部分。', 'Converts synchronous controller commands into electrical HBM signaling and owns training, alignment, and sampling; it is outside these labs.') },
  channel: { name: b('Channel（通道）', 'Channel'), meaning: b('一條可獨立工作的 HBM 資料路徑。分到不同 channel 的要求通常能平行處理。', 'An independently operating HBM data path. Requests routed to different channels can usually progress in parallel.') },
  pc: { name: b('Pseudo-channel（PC）', 'Pseudo-channel (PC)'), meaning: b('一個 channel 裡的兩個邏輯子通道。它們有各自的 bank 狀態與部分時序，但仍共享某些 channel 資源。', 'One of two logical subchannels inside a channel. PCs have separate bank state and some timing while sharing selected channel resources.') },
  bg: { name: b('Bank group（BG）', 'Bank group (BG)'), meaning: b('把 banks 再分群；連續命令是否落在相同 BG，會影響必須等待的時間。', 'A grouping of banks. Whether consecutive commands target the same BG changes the required spacing.') },
  bank: { name: b('Bank', 'Bank'), meaning: b('可獨立開啟一個 row 的記憶體陣列單位。Bank 多，controller 才能交錯執行更多工作。', 'A memory-array unit that can keep one row open independently. More banks provide more interleaving opportunities.') },
  row: { name: b('Row（列）', 'Row'), meaning: b('ACT 後暫存在 row buffer 的一整列資料；相同 row 的後續存取稱為 row hit。', 'A full memory row held in the row buffer after ACT. A later access to the same row is a row hit.') },
  column: { name: b('Column（欄）', 'Column'), meaning: b('從已開啟的 row 中選出真正要讀或寫的資料位置。', 'Selects the requested data location from an already-open row.') },
  issue: { name: b('Issue / Commit', 'Issue / commit'), meaning: b('命令不只是候選，而是在 PHY ready 時真正被接受。只有 issue 才能更新 timer、pointer 或 bank state。', 'A command is truly accepted when the PHY is ready. Timers, pointers, and bank state update only on issue.') },
  rowcmd: { name: b('Row command', 'Row command'), meaning: b('改變 row 或工作模式的命令，例如 ACT、PRE、REF、MRS。', 'A command that changes row or operating state, such as ACT, PRE, REF, or MRS.') },
  colcmd: { name: b('Column command', 'Column command'), meaning: b('在已開啟 row 上傳輸資料的 RD 或 WR。', 'An RD or WR that transfers data from an open row.') },
  act: { name: b('ACT（Activate）', 'ACT (activate)'), meaning: b('把指定 bank 的某個 row 開啟到 row buffer。', 'Opens one row of a selected bank into its row buffer.') },
  pre: { name: b('PRE（Precharge）', 'PRE (precharge)'), meaning: b('關閉 bank 目前開啟的 row，讓它之後可以 ACT 另一個 row。', 'Closes the bank’s current row so another row can later be activated.') },
  rdwr: { name: b('RD / WR', 'RD / WR'), meaning: b('對已開啟 row 做讀取或寫入的 column command。', 'Column commands that read or write an already-open row.') },
  scoreboard: { name: b('Timing scoreboard', 'Timing scoreboard'), meaning: b('保存每種命令下一個合法時間的狀態；它只回答「能不能發」，不決定誰優先。', 'Stores when each command becomes legal. It answers “may issue?” but does not choose priority.') },
  trcd: { name: b('tRCD', 'tRCD'), meaning: b('ACT 到第一次 RD/WR 之間至少要等待多久。', 'Minimum delay from ACT to the first RD or WR.') },
  tras: { name: b('tRAS', 'tRAS'), meaning: b('ACT 後，該 row 必須保持開啟多久才能 PRE。', 'Minimum time a row must remain open after ACT before PRE.') },
  trp: { name: b('tRP', 'tRP'), meaning: b('PRE 後，再次 ACT 同一 bank 前至少要等待多久。', 'Minimum delay from PRE to the next ACT in that bank.') },
  tccd: { name: b('tCCD', 'tCCD'), meaning: b('兩個 column commands 之間的最小距離；相同與不同 BG 可能不同。', 'Minimum spacing between column commands; same-BG and different-BG cases can differ.') },
  trrd: { name: b('tRRD', 'tRRD'), meaning: b('兩個 ACT 之間的最小距離；相同與不同 BG 使用不同限制。', 'Minimum spacing between ACT commands, with distinct same- and different-BG limits.') },
  tfaw: { name: b('tFAW', 'tFAW'), meaning: b('滑動時間窗內 ACT 數量的上限，用來限制瞬間電流。', 'A rolling-window limit on ACT count used to constrain instantaneous current.') },
  turnaround: { name: b('Bus turnaround', 'Bus turnaround'), meaning: b('共用資料線從讀切成寫、或從寫切成讀時需要的空白時間，避免兩端同時驅動。', 'Idle spacing needed when a shared data bus changes between read and write to prevent drive contention.') },
  arbiter: { name: b('Arbiter（仲裁器）', 'Arbiter'), meaning: b('多個合法候選同時出現時，選出這一拍的 winner。Round-robin 讓長期等待較公平。', 'Chooses a winner when several legal candidates exist. Round-robin improves long-term fairness.') },
  refresh: { name: b('Refresh（刷新）', 'Refresh'), meaning: b('DRAM 儲存電荷會流失，controller 必須定期發 refresh，期間相關範圍不能接一般命令。', 'DRAM charge leaks, so the controller periodically refreshes it; affected resources cannot accept normal commands during refresh.') },
  credit: { name: b('Refresh credit', 'Refresh credit'), meaning: b('允許 refresh 在規定範圍內提前或延後的記帳值；deadline 到達前必須償還。', 'Accounting for permitted pulled-in or postponed refreshes; postponed work must be repaid before its deadline.') },
  rfm: { name: b('RFM', 'RFM'), meaning: b('Refresh Management：依 ACT 活動量觸發額外維護，降低高頻率 row activation 的風險。', 'Refresh Management: extra maintenance triggered by activation activity to reduce risks from repeatedly activated rows.') },
  raa: { name: b('RAA counter', 'RAA counter'), meaning: b('追蹤 row activation activity 的飽和計數器；達門檻時向 refresh manager 要求 RFM。', 'A saturating counter tracking row-activation activity; crossing a threshold requests RFM.') },
  drfm: { name: b('DRFM', 'DRFM'), meaning: b('Directed RFM：先記住觸發它的 ACT 範圍，排空衝突命令，再執行指定維護。', 'Directed RFM: capture the triggering ACT scope, drain conflicts, then perform targeted maintenance.') },
  mrs: { name: b('MRS', 'MRS'), meaning: b('Mode Register Set；改變 HBM 工作設定。因為影響可能跨 PC，通常要先把 channel 排空。', 'Mode Register Set changes HBM operating configuration. Because it may affect both PCs, the channel generally drains first.') },
  parity: { name: b('CA parity / AERR', 'CA parity / AERR'), meaning: b('在 command/address 上加入 parity；接收端偵測錯誤後用 AERR 回報。Parity 能偵測部分錯誤，不能修復所有錯誤。', 'Adds parity to command/address signaling; the receiver reports detected errors through AERR. Parity detects selected faults but does not correct every error.') },
  quiescent: { name: b('Quiescent（已排空）', 'Quiescent'), meaning: b('queue、pipeline 與 outstanding transaction 都已清空，現在可安全做全域設定或電源切換。', 'Queues, pipelines, and outstanding transactions are empty, making global configuration or power transitions safe.') },
  power: { name: b('Power-down / Self-refresh', 'Power-down / self-refresh'), meaning: b('降低功耗的 HBM 狀態；進入前要停止新流量並排空，離開後也要等待規定時間。', 'Low-power HBM states. New traffic must stop and drain before entry, and exit delays must be honored.') },
};

const guides: Record<string, HbmLearningGuide> = {
  'hbm-pseudo-channel-map': {
    plainGoal: b('把一條 20-bit 位址拆成六條標籤線。這題沒有 clock、沒有狀態、沒有 HBM 命令；它只是一個「拆線器」。', 'Split one 20-bit address into six label wires. There is no clock, state, or HBM command; this is only a wire splitter.'),
    analogy: b('像把「台北市／信義區／某路／某號／某樓」拆成地址欄位，後面的路由器才知道要把要求送去哪裡。', 'Like splitting a postal address into city, district, street, number, and floor so downstream routing knows where to send it.'),
    input: b('輸入只有 addr[19:0]。它是一串二進位數字。', 'The only input is addr[19:0], a binary number.'),
    output: b('輸出是 row、channel、PC、BG、bank、column。把六個輸出接回去，必須完全等於原本 addr。', 'Outputs are row, channel, PC, BG, bank, and column. Concatenating them must reproduce addr exactly.'),
    terms: ['hbm', 'channel', 'pc', 'bg', 'bank', 'row', 'column'],
    circuit: [
      { label: b('addr[19:0]', 'addr[19:0]'), detail: b('Host 提供的一條教學位址', 'One teaching address from the host') },
      { label: b('Bit slicing', 'Bit slicing'), detail: b('只有導線，不需要暫存器或狀態機', 'Wires only; no register or FSM') },
      { label: b('六組欄位', 'Six fields'), detail: b('row / channel / PC / BG / bank / column', 'row / channel / PC / BG / bank / column') },
      { label: b('Queue selector', 'Queue selector'), detail: b('下一級用這些欄位選目的 queue', 'The next stage selects a destination queue') },
    ],
    waveform: { caption: b('組合電路沒有等待：addr 改變後，同一拍輸出立即跟著改變。', 'A combinational circuit does not wait for a clock: outputs follow the address in the same cycle.'), cycles: ['A', 'B', 'C'], signals: [
      { name: 'addr', kind: 'bus', values: ['00000', 'A55AA', 'FFFFF'] },
      { name: 'row', kind: 'bus', values: ['00', 'A5', 'FF'] },
      { name: 'channel', kind: 'bus', values: ['0', '2', '7'] },
      { name: 'pc', kind: 'bit', values: ['0', '1', '1'] },
      { name: 'bg/bank/col', kind: 'bus', values: ['0/0/0', '2/2/A', '3/3/F'] },
    ] },
    steps: [
      b('先寫 column = addr[3:0]，按一次測試，確認你理解最低四個 bit。', 'First write column = addr[3:0] and run once to confirm the lowest four bits.'),
      b('再接 bank、BG 與 PC；它們只是不同寬度的切片。', 'Then connect bank, BG, and PC; they are only slices of different widths.'),
      b('最後接 channel 與 row，確認 {row,channel,pc,bg,bank,column} == addr。', 'Finally connect channel and row, then verify {row,channel,pc,bg,bank,column} == addr.'),
    ],
  },
  'hbm-dual-command-gate': {
    plainGoal: b('決定 row command 與 column command 這一拍能不能一起送進 PHY。', 'Decide whether a row command and a column command may enter the PHY in the same cycle.'),
    analogy: b('像雙線收費站：一般車可走兩線；會占滿整個道路的工程車必須等兩線都空。', 'Like a two-lane toll gate: ordinary traffic may use both lanes, while a road-wide maintenance vehicle waits for both lanes to clear.'),
    input: b('兩個 candidate、是否為 channel-common 命令、兩個 PC 是否 idle，以及 PHY ready。', 'Two candidates, whether the row command is channel-common, both-PC idle state, and PHY ready.'),
    output: b('row_fire、col_fire 表示真正提交；blocked 表示候選要保留重試。', 'row_fire and col_fire mean true commit; blocked means retain and retry the candidate.'),
    terms: ['pc', 'rowcmd', 'colcmd', 'issue', 'quiescent', 'phy'],
    circuit: [
      { label: b('Row candidate', 'Row candidate'), detail: b('一般或 channel-common', 'Ordinary or channel-common') },
      { label: b('Exclusion rules', 'Exclusion rules'), detail: b('檢查 PC idle 與 column 衝突', 'Check PC idle and column conflict') },
      { label: b('PHY ready gate', 'PHY ready gate'), detail: b('Back-pressure 時不 commit', 'No commit under back-pressure') },
      { label: b('row/col fire', 'row/col fire'), detail: b('唯一可更新下游狀態的事件', 'Only events allowed to update state') },
    ],
    waveform: { caption: b('一般 row 可與 column 同拍；全域 row 命令要等 channel 排空。', 'An ordinary row may pair with a column; a global row command waits for channel drain.'), cycles: ['C0', 'C1', 'C2', 'C3'], signals: [
      { name: 'row_valid', kind: 'bit', values: ['1', '1', '1', '1'] }, { name: 'row_global', kind: 'bit', values: ['0', '1', '1', '1'] },
      { name: 'pc_idle', kind: 'bus', values: ['00', '00', '11', '11'] }, { name: 'col_valid', kind: 'bit', values: ['1', '1', '1', '0'] },
      { name: 'row_fire', kind: 'bit', values: ['1', '0', '0', '1'] }, { name: 'col_fire', kind: 'bit', values: ['1', '0', '0', '0'] },
    ] },
    steps: [b('先寫普通 row/column 的 phy_ready gate。', 'First write the ordinary row/column PHY-ready gate.'), b('加入 row_global 的兩個限制：pc_idle==2\'b11 且 col_valid==0。', 'Add the two row_global constraints: pc_idle==2\'b11 and col_valid==0.'), b('最後令 blocked 反映「valid 但沒有 fire」。', 'Finally make blocked report valid without fire.')],
  },
  'hbm-bank-state-table': {
    plainGoal: b('替每個 bank 記住「目前關閉」或「開了哪個 row」，並拒絕不合法命令。', 'Remember whether each bank is closed or which row is open, and reject illegal commands.'),
    analogy: b('Bank 像只能攤開一頁的書：先 ACT 翻到某頁，才能 RD/WR；要換頁必須先 PRE 合上。', 'A bank is like a book that can show one page: ACT opens a page, RD/WR use it, and PRE closes it before changing pages.'),
    input: b('命令種類、目標 bank、row 與 cmd_valid。', 'Command type, target bank, row, and cmd_valid.'),
    output: b('cmd_ok、row_hit、row_conflict，以及四個 bank 的 open bitmap。', 'cmd_ok, row_hit, row_conflict, and a four-bank open bitmap.'),
    terms: ['bank', 'row', 'act', 'pre', 'rdwr', 'issue'],
    circuit: [
      { label: b('cmd + bank + row', 'cmd + bank + row'), detail: b('一筆候選命令', 'One candidate command') },
      { label: b('Bank metadata RAM', 'Bank metadata RAM'), detail: b('open bit + open_row', 'open bit + open_row') },
      { label: b('Legality compare', 'Legality compare'), detail: b('closed / hit / conflict', 'closed / hit / conflict') },
      { label: b('Commit update', 'Commit update'), detail: b('合法 ACT/PRE 才改狀態', 'Only legal ACT/PRE changes state') },
    ],
    waveform: { caption: b('ACT 開 row；命中才能 RD；PRE 關閉後才能再 ACT。', 'ACT opens a row; RD requires a hit; PRE closes it before another ACT.'), cycles: ['reset', 'ACT 10', 'RD 10', 'RD 11', 'PRE'], signals: [
      { name: 'cmd_ok', kind: 'bit', values: ['0', '1', '1', '0', '1'] }, { name: 'row_open[0]', kind: 'bit', values: ['0', '1', '1', '1', '0'] },
      { name: 'row_hit', kind: 'bit', values: ['0', '0', '1', '0', '0'] }, { name: 'row_conflict', kind: 'bit', values: ['0', '0', '0', '1', '0'] },
    ] },
    steps: [b('先用 open bitmap 判斷 bank 是否開啟。', 'First determine whether the bank is open from the bitmap.'), b('比較 row，產生 hit/conflict。', 'Compare the row to produce hit/conflict.'), b('最後只在 cmd_valid && cmd_ok 的 clock edge 更新 metadata。', 'Update metadata only at a cmd_valid && cmd_ok clock edge.')],
  },
  'hbm-row-timing-scoreboard': {
    plainGoal: b('用三個倒數器阻止 ACT、RD/WR、PRE 發得太早。', 'Use three countdowns to prevent ACT, RD/WR, or PRE from issuing too early.'),
    analogy: b('像三個廚房計時器：每個動作啟動不同計時器，歸零前不能做下一個指定動作。', 'Like three kitchen timers: each action starts a timer, and the related next action waits for zero.'),
    input: b('真正發出的 act_issue 與 pre_issue。', 'Committed act_issue and pre_issue events.'), output: b('act_ok、col_ok、pre_ok 三個合法遮罩。', 'Three legality masks: act_ok, col_ok, and pre_ok.'),
    terms: ['scoreboard', 'act', 'pre', 'trcd', 'tras', 'trp', 'issue'],
    circuit: [{ label: b('Issue events', 'Issue events'), detail: b('ACT / PRE commit', 'ACT / PRE commit') }, { label: b('3 counters', '3 counters'), detail: b('tRCD / tRAS / tRP', 'tRCD / tRAS / tRP') }, { label: b('zero compare', 'zero compare'), detail: b('每拍產生 legality mask', 'Create legality masks every cycle') }, { label: b('Scheduler', 'Scheduler'), detail: b('只能看 *_ok 選命令', 'May select only when *_ok') }],
    waveform: { caption: b('ACT 當拍立刻封鎖 column 與 PRE，之後各自在不同時間解鎖。', 'ACT blocks column and PRE immediately; each unlocks at its own later time.'), cycles: ['ACT', '+1', '+2', '+3', '+4', '+5'], signals: [{ name: 'act_issue', kind: 'bit', values: ['1', '0', '0', '0', '0', '0'] }, { name: 'col_ok', kind: 'bit', values: ['0', '0', '0', '1', '1', '1'] }, { name: 'pre_ok', kind: 'bit', values: ['0', '0', '0', '0', '0', '1'] } ] },
    steps: [b('為每個限制建立飽和倒數器。', 'Create a saturating countdown for each constraint.'), b('issue 時 reload，否則非零就 decrement。', 'Reload on issue; otherwise decrement when nonzero.'), b('把 zero compare 與「本拍沒有新 trigger」相 AND。', 'AND the zero comparison with no new trigger this cycle.')],
  },
  'hbm-bankgroup-tccd': {
    plainGoal: b('記住上一個 column command 的 BG，限制下一個 RD/WR 最早何時可發。', 'Remember the previous column command’s BG and restrict when the next RD/WR may issue.'),
    analogy: b('同一條巷子連續進車要隔久一點；換到另一條巷子可以較快。', 'Cars entering the same narrow lane need more spacing; switching lanes allows a shorter gap.'),
    input: b('真正 issue 的 BG，以及目前 candidate 的 BG。', 'The issued BG and current candidate BG.'), output: b('allowed：現在是否滿足 same-BG 或 different-BG 間隔。', 'allowed: whether same- or different-BG spacing is satisfied.'),
    terms: ['bg', 'colcmd', 'tccd', 'scoreboard', 'issue'],
    circuit: [{ label: b('issue_bg', 'issue_bg'), detail: b('上一個真正送出的 BG', 'Last committed BG') }, { label: b('last_bg + age', 'last_bg + age'), detail: b('暫存器與飽和年齡', 'Register plus saturating age') }, { label: b('same?', 'same?'), detail: b('選擇長或短門檻', 'Select long or short threshold') }, { label: b('allowed', 'allowed'), detail: b('交給 scheduler 的 mask', 'Mask sent to scheduler') }],
    waveform: { caption: b('範例採 same-BG=4、different-BG=2；這是教學值。', 'The example uses same-BG=4 and different-BG=2 as teaching values.'), cycles: ['issue BG1', 'age1', 'age2', 'age3', 'age4'], signals: [{ name: 'cand BG2 ok', kind: 'bit', values: ['0', '0', '1', '1', '1'] }, { name: 'cand BG1 ok', kind: 'bit', values: ['0', '0', '0', '0', '1'] }] },
    steps: [b('保存 valid、last_bg、age。', 'Store valid, last_bg, and age.'), b('比較 candidate_bg==last_bg。', 'Compare candidate_bg with last_bg.'), b('依 same/different 選門檻產生 allowed。', 'Choose the same/different threshold to produce allowed.')],
  },
  'hbm-activate-window': {
    plainGoal: b('同時檢查 ACT 彼此間距與「最近一段時間最多四個 ACT」。', 'Check both ACT-to-ACT spacing and the four-activates-in-a-window limit.'),
    analogy: b('不只每台車要保持車距，整段隧道同時也只能容納固定車數。', 'Cars need pairwise spacing, and the tunnel also limits how many may be inside at once.'),
    input: b('已 issue ACT 的 BG 與候選 ACT 的 BG。', 'Issued ACT BG and candidate ACT BG.'), output: b('allowed：tRRD 與 rolling tFAW 都通過。', 'allowed: both tRRD and rolling tFAW pass.'),
    terms: ['act', 'bg', 'trrd', 'tfaw', 'scoreboard', 'issue'],
    circuit: [{ label: b('ACT history', 'ACT history'), detail: b('last BG + age', 'last BG + age') }, { label: b('tRRD check', 'tRRD check'), detail: b('same/different BG 間距', 'same/different-BG gap') }, { label: b('8-cycle shift window', '8-cycle shift window'), detail: b('計算最近 ACT 數', 'Count recent ACTs') }, { label: b('AND → allowed', 'AND → allowed'), detail: b('兩條規則缺一不可', 'Both rules must pass') }],
    waveform: { caption: b('即使 tRRD 已到，只要視窗已有四個 ACT，新的 ACT 仍要等。', 'Even after tRRD expires, a new ACT waits while four ACTs remain in the window.'), cycles: ['A0', 'A1', 'A2', 'A3', 'full', 'oldest exits'], signals: [{ name: 'recent count', kind: 'bus', values: ['1', '2', '3', '4', '4', '3'] }, { name: 'tRRD_ok', kind: 'bit', values: ['0', '1', '1', '1', '1', '1'] }, { name: 'allowed', kind: 'bit', values: ['0', '1', '1', '1', '0', '1'] }] },
    steps: [b('先完成 last-BG age 的 tRRD 判斷。', 'First implement last-BG age for tRRD.'), b('再用 shift register 記錄 rolling window。', 'Then record the rolling window with a shift register.'), b('最後 allowed = spacing_ok && count<4。', 'Finally set allowed = spacing_ok && count<4.')],
  },
  'hbm-rw-turnaround': {
    plainGoal: b('當資料線方向改變時插入安全空拍，避免 controller 與 HBM 同時驅動 DQ。', 'Insert safe idle cycles when data direction changes so the controller and HBM never drive DQ together.'),
    analogy: b('單線橋要先等往東的車全部離開，才能放行往西的車。', 'A one-lane bridge must clear eastbound traffic before westbound traffic starts.'),
    input: b('上一筆已 issue 的 RD/WR、BG，以及下一筆 candidate。', 'Last issued RD/WR and BG, plus the next candidate.'), output: b('allowed：方向切換等待是否已完成。', 'allowed: whether direction-change waiting has completed.'),
    terms: ['rdwr', 'turnaround', 'bg', 'issue', 'phy'],
    circuit: [{ label: b('Last direction', 'Last direction'), detail: b('RD 或 WR + BG', 'RD or WR + BG') }, { label: b('Age counter', 'Age counter'), detail: b('距離上一筆幾拍', 'Cycles since last issue') }, { label: b('R→W / W→R rules', 'R→W / W→R rules'), detail: b('方向不同時選門檻', 'Select threshold on change') }, { label: b('allowed', 'allowed'), detail: b('與 tCCD mask 再相 AND', 'AND later with tCCD') }],
    waveform: { caption: b('W→R 與 R→W 可以是不對稱的等待時間。', 'W→R and R→W can require asymmetric delays.'), cycles: ['WR', '+1', '+2', '+3', '+4', '+5'], signals: [{ name: 'RD same-BG ok', kind: 'bit', values: ['0', '0', '0', '0', '0', '1'] }, { name: 'RD diff-BG ok', kind: 'bit', values: ['0', '0', '0', '1', '1', '1'] }] },
    steps: [b('保存 last_valid、last_write、last_bg 與 age。', 'Store last_valid, last_write, last_bg, and age.'), b('同方向直接交給 tCCD；不同方向選 turnaround 門檻。', 'Leave same-direction spacing to tCCD; choose a turnaround threshold on change.'), b('確認只有 issue 才重設 age。', 'Ensure only issue resets age.')],
  },
  'hbm-hierarchical-arbiter': {
    plainGoal: b('從多個 PC 的合法候選中公平選一個，而不是做一個跨 1024 banks 的巨大選擇器。', 'Fairly choose among legal PC candidates instead of building one giant selector across 1024 banks.'),
    analogy: b('先由每個里選代表，再由全市選一人；不讓所有居民同時接到同一個投票器。', 'Each district first selects a representative, then the city chooses one; not every resident wires directly into one vote.') ,
    input: b('四個已通過本地 timing 的 PC request。', 'Four PC requests already cleared by local timing.'), output: b('one-hot grant 與下一個 round-robin pointer。', 'A one-hot grant and the next round-robin pointer.'),
    terms: ['pc', 'arbiter', 'issue', 'scoreboard'],
    circuit: [{ label: b('Bank-local winners', 'Bank-local winners'), detail: b('每個 PC 先選一筆', 'One local choice per PC') }, { label: b('PC req[3:0]', 'PC req[3:0]'), detail: b('只有合法 candidate', 'Legal candidates only') }, { label: b('Round-robin scan', 'Round-robin scan'), detail: b('從 pointer 開始找', 'Scan from pointer') }, { label: b('One-hot grant', 'One-hot grant'), detail: b('真正 grant 才移 pointer', 'Advance only on grant') }],
    waveform: { caption: b('四個 request 一直存在時，grant 依序輪轉，避免固定低編號永遠獲勝。', 'With all requests held, the grant rotates so a fixed low index cannot win forever.'), cycles: ['C0', 'C1', 'C2', 'C3'], signals: [{ name: 'req', kind: 'bus', values: ['1111', '1111', '1111', '1111'] }, { name: 'grant', kind: 'bus', values: ['0001', '0010', '0100', '1000'] }] },
    steps: [b('保存 2-bit pointer。', 'Store a two-bit pointer.'), b('組合邏輯從 pointer 開始循環掃描 req。', 'Combinationally scan req starting at the pointer.'), b('只有 grant 非零的 clock edge 才更新 pointer。', 'Update the pointer only on a nonzero-grant clock edge.')],
  },
  'hbm-refresh-credit': {
    plainGoal: b('追蹤 refresh 能延後多少，以及 deadline 到時強制停止一般流量。', 'Track how far refresh may be postponed and force normal traffic to stop at the deadline.'),
    analogy: b('像可以延期的帳單：可以晚一點繳，但延期額度用完就必須立刻償還。', 'Like a bill with limited deferral: it may be delayed, but must be paid when the allowance is exhausted.'),
    input: b('時間 tick、postpone、pull-in、refresh_done。', 'Time tick, postpone, pull-in, and refresh_done events.'), output: b('refresh_due、urgent 與目前 credit。', 'refresh_due, urgent, and current credit.'),
    terms: ['refresh', 'credit', 'quiescent'],
    circuit: [{ label: b('Interval timer', 'Interval timer'), detail: b('距離下一個 refresh', 'Time to next refresh') }, { label: b('Credit counter', 'Credit counter'), detail: b('提前/延後記帳', 'Pull-in/postpone accounting') }, { label: b('Deadline compare', 'Deadline compare'), detail: b('正常或 urgent', 'Normal or urgent') }, { label: b('Admission gate', 'Admission gate'), detail: b('urgent 時停止新流量', 'Stop new traffic when urgent') }],
    waveform: { caption: b('deadline 到達後 urgent 保持，直到 refresh_done。', 'urgent remains asserted after the deadline until refresh_done.'), cycles: ['tick0', 'tick1', 'tick2', 'deadline', 'done'], signals: [{ name: 'refresh_due', kind: 'bit', values: ['0', '0', '1', '1', '0'] }, { name: 'urgent', kind: 'bit', values: ['0', '0', '0', '1', '0'] }, { name: 'credit', kind: 'bus', values: ['2', '2', '1', '0', '1'] }] },
    steps: [b('先做 interval/deadline counter。', 'First implement the interval/deadline counter.'), b('加入 saturating credit 記帳。', 'Add saturating credit accounting.'), b('讓 refresh_done 原子地清 due 並更新下一期限。', 'Make refresh_done atomically clear due and establish the next deadline.')],
  },
  'hbm-refresh-domain': {
    plainGoal: b('一個 PC 在 refresh 時，只封鎖它自己；另一個 PC 仍可工作。', 'When one PC refreshes, block only that PC so the other can continue.'),
    analogy: b('大樓只維修其中一部電梯，不必把全部電梯停掉。', 'Service one elevator in a building without shutting down every elevator.'),
    input: b('每個 PC 的 ref_start。', 'A ref_start bit for each PC.'), output: b('逐 PC 的 cmd_allowed bitmap。', 'A per-PC cmd_allowed bitmap.'),
    terms: ['pc', 'refresh', 'scoreboard'],
    circuit: [{ label: b('ref_start[PC]', 'ref_start[PC]'), detail: b('哪個 PC 開始 refresh', 'Which PC starts refresh') }, { label: b('Per-PC timers', 'Per-PC timers'), detail: b('各自保存 busy window', 'Independent busy windows') }, { label: b('Zero compare', 'Zero compare'), detail: b('逐 PC 解鎖', 'Unlock each PC separately') }, { label: b('cmd_allowed', 'cmd_allowed'), detail: b('遮罩本地 scheduler', 'Mask each local scheduler') }],
    waveform: { caption: b('PC1 先 refresh，PC3 後 refresh；兩者依自己的起始時間解鎖。', 'PC1 refreshes first and PC3 later; each unlocks from its own start time.'), cycles: ['C0', 'C1', 'C2', 'C3', 'C4'], signals: [{ name: 'ref_start', kind: 'bus', values: ['0010', '1000', '0000', '0000', '0000'] }, { name: 'cmd_allowed', kind: 'bus', values: ['1101', '0101', '0101', '1101', '1111'] }] },
    steps: [b('每個 PC 建一個獨立 counter。', 'Create one independent counter per PC.'), b('ref_start 優先 reload，否則 decrement。', 'Give ref_start reload priority over decrement.'), b('cmd_allowed[i] 只看自己的 counter 與 ref_start[i]。', 'Make cmd_allowed[i] depend only on its own counter and ref_start[i].')],
  },
  'hbm-rfm-counter': {
    plainGoal: b('計算 ACT 活動量；達門檻時提出一次 RFM 維護要求。', 'Count ACT activity and request RFM when a threshold is reached.'),
    analogy: b('像機器的使用次數保養表：使用太頻繁就亮保養燈，完成保養後重新計算。', 'Like a machine service counter: heavy use lights a maintenance indicator, which clears after service.') ,
    input: b('act_issue 與 rfm_done。', 'act_issue and rfm_done.'), output: b('RAA 計數與 sticky rfm_request。', 'RAA count and sticky rfm_request.'),
    terms: ['act', 'raa', 'rfm', 'issue'],
    circuit: [{ label: b('ACT commits', 'ACT commits'), detail: b('只有真的 ACT 才計數', 'Count only committed ACTs') }, { label: b('RAA counter', 'RAA counter'), detail: b('飽和避免 overflow', 'Saturate to avoid overflow') }, { label: b('Threshold compare', 'Threshold compare'), detail: b('達門檻 set request', 'Set request at threshold') }, { label: b('RFM handshake', 'RFM handshake'), detail: b('完成後清除/重載', 'Clear/reload on completion') }],
    waveform: { caption: b('request 一旦拉高就保持，不能只 pulse 一拍而被 scheduler 漏看。', 'Once asserted, request remains high so the scheduler cannot miss a one-cycle pulse.'), cycles: ['ACT1', 'ACT2', 'ACT3', 'ACT4', 'wait', 'rfm_done'], signals: [{ name: 'RAA', kind: 'bus', values: ['1', '2', '3', '4', '4', '0'] }, { name: 'rfm_request', kind: 'bit', values: ['0', '0', '0', '1', '1', '0'] }] },
    steps: [b('做只在 act_issue 增加的 saturating counter。', 'Build a saturating counter incremented only by act_issue.'), b('門檻 crossing 時 set sticky request。', 'Set a sticky request when crossing the threshold.'), b('明確定義 rfm_done 與同拍 ACT 的優先序。', 'Define priority for rfm_done versus a same-cycle ACT.')],
  },
  'hbm-drfm-sequencer': {
    plainGoal: b('收到 DRFM 觸發後記住目標、停止收衝突工作、排空，再發維護命令。', 'After a DRFM trigger, remember the target, stop conflicting work, drain, then issue maintenance.'),
    analogy: b('像收到指定區域維修單：先記下樓層、停止新住戶進入、等人離開，再鎖門維修。', 'Like a targeted maintenance order: record the floor, stop new entry, drain occupants, then lock and service it.'),
    input: b('trigger 與其範圍、channel_quiescent、phy_ready。', 'Trigger and scope, channel_quiescent, and phy_ready.'), output: b('block_new、drfm_issue、captured target 與 busy。', 'block_new, drfm_issue, captured target, and busy.'),
    terms: ['drfm', 'act', 'quiescent', 'issue', 'phy'],
    circuit: [{ label: b('Trigger capture', 'Trigger capture'), detail: b('鎖住 ACT scope', 'Latch ACT scope') }, { label: b('Admission block', 'Admission block'), detail: b('停止新衝突命令', 'Stop new conflicting work') }, { label: b('Drain detector', 'Drain detector'), detail: b('等待 quiescent', 'Wait for quiescent') }, { label: b('DRFM issue', 'DRFM issue'), detail: b('PHY ready 才 commit', 'Commit only when PHY ready') }],
    waveform: { caption: b('trigger 只需一拍；sequencer 必須把 target 保存到真正 issue。', 'The trigger may last one cycle; the sequencer retains the target until true issue.'), cycles: ['trigger', 'drain1', 'drain2', 'ready', 'done'], signals: [{ name: 'trigger', kind: 'bit', values: ['1', '0', '0', '0', '0'] }, { name: 'block_new', kind: 'bit', values: ['1', '1', '1', '1', '0'] }, { name: 'quiescent', kind: 'bit', values: ['0', '0', '1', '1', '1'] }, { name: 'drfm_issue', kind: 'bit', values: ['0', '0', '0', '1', '0'] }] },
    steps: [b('在 trigger edge latch target。', 'Latch the target on the trigger edge.'), b('busy 期間保持 block_new。', 'Hold block_new throughout busy.'), b('quiescent && phy_ready 時 pulse drfm_issue 並完成。', 'Pulse drfm_issue and complete when quiescent && phy_ready.')],
  },
  'hbm-mrs-quiesce': {
    plainGoal: b('Mode Register 改設定前先把兩個 PC 的工作排空，設定完成後再恢復接單。', 'Drain both PCs before changing mode-register configuration, then reopen traffic afterward.'),
    analogy: b('更改整棟大樓的電力設定前，先停止新作業並確認所有人都離開。', 'Before changing a building-wide electrical setting, stop new work and verify everyone has exited.'),
    input: b('mrs_request、PC idle、phy_ready 與 mrs_done。', 'mrs_request, PC idle state, phy_ready, and mrs_done.'), output: b('accept_enable、mrs_issue 與 busy。', 'accept_enable, mrs_issue, and busy.'),
    terms: ['mrs', 'pc', 'quiescent', 'issue', 'phy'],
    circuit: [{ label: b('MRS request', 'MRS request'), detail: b('Firmware/config 要求', 'Firmware/config request') }, { label: b('Admission close', 'Admission close'), detail: b('不再接受新 request', 'Stop accepting new requests') }, { label: b('Both-PC drain', 'Both-PC drain'), detail: b('等待 pc_idle==11', 'Wait for pc_idle==11') }, { label: b('MRS issue/wait', 'MRS issue/wait'), detail: b('送出並等完成', 'Issue and await completion') }],
    waveform: { caption: b('MRS request 出現後 accept_enable 先關，直到 done 才重開。', 'After MRS request, accept_enable closes first and reopens only after done.'), cycles: ['request', 'drain', 'idle', 'issue', 'done'], signals: [{ name: 'accept_enable', kind: 'bit', values: ['0', '0', '0', '0', '1'] }, { name: 'pc_idle', kind: 'bus', values: ['00', '01', '11', '11', '11'] }, { name: 'mrs_issue', kind: 'bit', values: ['0', '0', '0', '1', '0'] }] },
    steps: [b('FSM 先關 admission，再等待兩個 PC idle。', 'Have the FSM close admission, then wait for both PCs idle.'), b('只有 phy_ready 才 pulse issue。', 'Pulse issue only when phy_ready.'), b('等待 mrs_done，不要提早重開 accept。', 'Wait for mrs_done; do not reopen acceptance early.')],
  },
  'hbm-ca-parity': {
    plainGoal: b('替 command/address 計算 parity，並把 AERR 錯誤鎖成可被軟體讀到的 sticky 狀態。', 'Compute command/address parity and latch AERR as software-visible sticky status.'),
    analogy: b('像在每張表單加一個核對碼；若傳輸後核對不上就留下錯誤紀錄。', 'Like adding a check digit to every form and retaining an error record when it no longer matches.'),
    input: b('CA payload、valid 與 AERR 回報。', 'CA payload, valid, and AERR feedback.'), output: b('Parity bit、error pulse/count 與 sticky error。', 'Parity bit, error pulse/count, and sticky error.'),
    terms: ['parity', 'rowcmd', 'colcmd', 'phy'],
    circuit: [{ label: b('CA payload', 'CA payload'), detail: b('要送往 PHY 的命令/位址', 'Command/address bound for PHY') }, { label: b('XOR tree', 'XOR tree'), detail: b('產生 parity', 'Generate parity') }, { label: b('AERR synchronizer', 'AERR synchronizer'), detail: b('接收錯誤狀態', 'Receive error status') }, { label: b('RAS status', 'RAS status'), detail: b('pulse + counter + sticky', 'pulse + counter + sticky') }],
    waveform: { caption: b('AERR 即使只有一拍，sticky_error 仍保持到 reset 或明確 clear。', 'Even if AERR lasts one cycle, sticky_error remains until reset or explicit clear.'), cycles: ['valid0', 'valid1', 'AERR', 'idle', 'clear'], signals: [{ name: 'ca_valid', kind: 'bit', values: ['1', '1', '0', '0', '0'] }, { name: 'aerr', kind: 'bit', values: ['0', '0', '1', '0', '0'] }, { name: 'sticky_error', kind: 'bit', values: ['0', '0', '1', '1', '0'] }] },
    steps: [b('以 XOR reduction 產生 parity。', 'Generate parity with XOR reduction.'), b('只在有效 CA/AERR 合約下記錄錯誤。', 'Record errors only under the valid CA/AERR contract.'), b('定義 sticky、counter saturation 與 clear priority。', 'Define sticky behavior, counter saturation, and clear priority.')],
  },
  'hbm-power-state': {
    plainGoal: b('安全進入與離開低功耗狀態：先排空，再送命令，再等待退出時間。', 'Safely enter and leave low-power state: drain, issue the command, then honor exit timing.'),
    analogy: b('電影院關燈前先停止售票、等觀眾離場；重新開門前先完成設備啟動。', 'A cinema stops ticket sales and drains the audience before shutdown, then completes startup before reopening.') ,
    input: b('sleep/wake request、quiescent、phy_ready。', 'Sleep/wake request, quiescent, and phy_ready.'), output: b('accept_enable、power command、in_low_power 與 ready。', 'accept_enable, power command, in_low_power, and ready.'),
    terms: ['power', 'quiescent', 'rowcmd', 'issue', 'phy'],
    circuit: [{ label: b('Power request', 'Power request'), detail: b('Policy/Firmware', 'Policy/firmware') }, { label: b('Traffic drain FSM', 'Traffic drain FSM'), detail: b('先關 admission', 'Close admission first') }, { label: b('PDE/SRE adapter', 'PDE/SRE adapter'), detail: b('送 row command', 'Issue row command') }, { label: b('Exit timer', 'Exit timer'), detail: b('到期後才 ready', 'Ready only after expiry') }],
    waveform: { caption: b('accept_enable 必須早於進入命令關閉，且晚於退出等待完成才重開。', 'accept_enable closes before entry and reopens only after exit waiting completes.'), cycles: ['request', 'drain', 'enter', 'sleep', 'wake', 'exit wait', 'ready'], signals: [{ name: 'accept_enable', kind: 'bit', values: ['0', '0', '0', '0', '0', '0', '1'] }, { name: 'in_low_power', kind: 'bit', values: ['0', '0', '1', '1', '1', '0', '0'] }, { name: 'ready', kind: 'bit', values: ['0', '0', '0', '0', '0', '0', '1'] }] },
    steps: [b('用 FSM 分開 RUN、DRAIN、ENTER、SLEEP、EXIT_WAIT。', 'Separate RUN, DRAIN, ENTER, SLEEP, and EXIT_WAIT in an FSM.'), b('命令只在 quiescent && phy_ready 時 issue。', 'Issue the command only when quiescent && phy_ready.'), b('退出 timer 到期前保持 admission 關閉。', 'Keep admission closed until the exit timer expires.')],
  },
  'hbm-stack-dispatch': {
    plainGoal: b('把一筆 request 的 channel/PC 編號轉成 64-bit one-hot destination，讓 64 個本地 queue 只有一個收件。', 'Convert a request’s channel/PC number into a 64-bit one-hot destination so exactly one local queue receives it.'),
    analogy: b('郵件先選 32 棟大樓，再選每棟的 A/B 信箱；最後只有一個信箱亮燈。', 'Mail selects one of 32 buildings and then mailbox A or B; exactly one mailbox lights.') ,
    input: b('5-bit channel、1-bit PC 與 request valid。', 'Five-bit channel, one-bit PC, and request valid.'), output: b('64-bit one-hot PC select 與 32-bit channel select。', 'A 64-bit one-hot PC select and 32-bit channel select.'),
    terms: ['channel', 'pc', 'arbiter', 'bank'],
    circuit: [{ label: b('channel + PC', 'channel + PC'), detail: b('6-bit destination index', 'Six-bit destination index') }, { label: b('5→32 decode', '5→32 decode'), detail: b('選 channel', 'Select channel') }, { label: b('6→64 decode', '6→64 decode'), detail: b('選 PC queue', 'Select PC queue') }, { label: b('Local queues', 'Local queues'), detail: b('只有一個 write enable', 'Exactly one write enable') }],
    waveform: { caption: b('valid=0 時所有 select 為 0；valid=1 時各輸出必須 one-hot。', 'All selects are zero when valid=0; each output must be one-hot when valid=1.'), cycles: ['idle', 'ch0/pc0', 'ch0/pc1', 'ch31/pc1'], signals: [{ name: 'valid', kind: 'bit', values: ['0', '1', '1', '1'] }, { name: 'channel_sel', kind: 'bus', values: ['0', 'bit0', 'bit0', 'bit31'] }, { name: 'pc_sel', kind: 'bus', values: ['0', 'bit0', 'bit1', 'bit63'] }] },
    steps: [b('先算 pc_index={channel,pc}。', 'First compute pc_index={channel,pc}.'), b('用 shift 產生 one-hot，並由 valid gate。', 'Use shifts to create one-hot values gated by valid.'), b('檢查任何有效輸入都恰好只有一個 bit 為 1。', 'Check that every valid input sets exactly one bit.')],
  },
  'hbm-channel-capstone': {
    plainGoal: b('把前面所有 legality mask 與 arbitration 接在一起：正常時 row/column 可雙發；維護時先排空並獨占 channel。', 'Connect prior legality masks and arbitration: normal traffic may dual-issue row/column, while maintenance drains and owns the channel exclusively.'),
    analogy: b('這是整條生產線的總閘門：品質檢查通過、機台 ready、且沒有維修封鎖，產品才真正出站。', 'This is the production line’s final gate: only legal work with a ready machine and no maintenance exclusion may leave.') ,
    input: b('兩個 PC 的 row/column valid 與 timing_ok、maintenance、quiescent、phy_ready。', 'Row/column valid and timing_ok for two PCs, maintenance, quiescent, and phy_ready.'), output: b('獨立 one-hot row/column grant 或唯一 maint_grant。', 'Independent one-hot row/column grants or one exclusive maint_grant.'),
    terms: ['pc', 'scoreboard', 'arbiter', 'rowcmd', 'colcmd', 'quiescent', 'issue', 'phy'],
    circuit: [{ label: b('Valid candidates', 'Valid candidates'), detail: b('來自兩個 PC', 'From both PCs') }, { label: b('Legality AND', 'Legality AND'), detail: b('bank/timing/refresh mask', 'bank/timing/refresh masks') }, { label: b('2× RR arbiters', '2× RR arbiters'), detail: b('row 與 column 分開選', 'Independent row/column selection') }, { label: b('Maintenance mux', 'Maintenance mux'), detail: b('排空後獨占', 'Exclusive after drain') }, { label: b('PHY commit', 'PHY commit'), detail: b('ready 才真正 grant', 'True grant only when ready') }],
    waveform: { caption: b('正常模式可以同拍 row+column；maintenance_valid 立即壓掉 normal grant，排空後才 maint_grant。', 'Normal mode may issue row+column together; maintenance_valid suppresses normal grants and grants only after drain.'), cycles: ['normal0', 'normal1', 'maint/drain', 'maint/idle', 'resume'], signals: [{ name: 'row_grant', kind: 'bus', values: ['01', '10', '00', '00', '01'] }, { name: 'col_grant', kind: 'bus', values: ['01', '10', '00', '00', '01'] }, { name: 'maint_grant', kind: 'bit', values: ['0', '0', '0', '1', '0'] }] },
    steps: [b('先算 row_eligible 與 col_eligible。', 'First calculate row_eligible and col_eligible.'), b('用兩個獨立 RR pointer 選 normal grants。', 'Choose normal grants with two independent RR pointers.'), b('maintenance_valid 優先清 normal grants；quiescent && phy_ready 才 maint_grant。', 'maintenance_valid clears normal grants first; maint_grant requires quiescent && phy_ready.'), b('所有 pointer 只在對應 grant 真正成立時前進。', 'Advance each pointer only when its matching grant truly fires.')],
  },
};

export const hbmLearningGuides = guides;
