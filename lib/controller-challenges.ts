import type { Challenge } from './challenges';
import { hbm4AdvancedChallenges } from './hbm4-advanced-challenges';

const pass = `
task check;
  input condition;
  begin
    if (condition !== 1'b1) begin
      $display("@@FAIL@@ check failed at time %0t (including X/Z)", $time);
      $finish;
    end
  end
endtask
`;

const baseControllerChallenges: Challenge[] = [
  {
    id: 'dram-address-map', order: 1, track: 'dram', difficulty: 'intermediate', minutes: 30, points: 180,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'DRAM 位址切割', en: 'DRAM address mapping' },
    description: { zh: '把線性位址解碼為 column、bank、channel 與 row。這個縮小模型刻意把欄位做小，讓你能看懂並驗證每個 bit 的來源。', en: 'Decode a linear address into column, bank, channel, and row fields using a deliberately small, auditable mapping.' },
    specs: [
      { zh: 'column=addr[3:0]、bank=addr[5:4]、channel=addr[7:6]、row=addr[15:8]。', en: 'column=addr[3:0], bank=addr[5:4], channel=addr[7:6], row=addr[15:8].' },
      { zh: '必須是純組合邏輯，不得截斷或交換欄位。', en: 'Use pure combinational logic without truncating or swapping fields.' },
    ],
    testGroups: [{ zh: '欄位邊界', en: 'Field boundaries' }, { zh: '多組地址', en: 'Multiple addresses' }],
    hints: [{ zh: '先寫成明確的連續指定；不要在第一版加入 XOR hashing。', en: 'Start with explicit continuous assignments; do not add XOR hashing yet.' }],
    starter: `module dram_address_map(input wire [15:0] addr,output wire [1:0] channel,output wire [1:0] bank,output wire [7:0] row,output wire [3:0] column);
  // TODO: document and implement the bit slices
endmodule`,
    referenceSolution: `module dram_address_map(input wire [15:0] addr,output wire [1:0] channel,output wire [1:0] bank,output wire [7:0] row,output wire [3:0] column);
assign column=addr[3:0]; assign bank=addr[5:4]; assign channel=addr[7:6]; assign row=addr[15:8];
endmodule`,
    testbench: `module tb;reg[15:0]addr;wire[1:0]channel,bank;wire[7:0]row;wire[3:0]column;integer i;dram_address_map dut(addr,channel,bank,row,column);${pass}
task try_addr;input[15:0]v;begin addr=v;#1;check(column===v[3:0]);check(bank===v[5:4]);check(channel===v[7:6]);check(row===v[15:8]);end endtask
initial begin try_addr(16'h0000);try_addr(16'hffff);try_addr(16'ha53c);for(i=0;i<256;i=i+17)try_addr({i[7:0],i[7:0]});$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'dram-bank-fsm', order: 2, track: 'dram', difficulty: 'intermediate', minutes: 40, points: 240,
    kind: 'debug', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'DRAM Bank 狀態機', en: 'DRAM bank state machine' },
    description: { zh: '修正一個會接受非法命令的bank模型。ACT只能對closed bank；RD只能對open bank；PRE關閉bank。', en: 'Repair a bank model that accepts illegal commands. ACT requires closed, RD requires open, and PRE closes the bank.' },
    specs: [
      { zh: 'cmd：0=ACT、1=RD、2=PRE；只有cmd_valid時才改變狀態。', en: 'cmd: 0=ACT, 1=RD, 2=PRE; state changes only when cmd_valid.' },
      { zh: '非法ACT/RD/PRE令cmd_ok=0，且不得破壞row state。', en: 'Illegal ACT/RD/PRE drives cmd_ok=0 without corrupting row state.' },
    ],
    testGroups: [{ zh: '合法ACT→RD→PRE', en: 'Legal ACT→RD→PRE' }, { zh: '重複ACT', en: 'Repeated ACT' }, { zh: 'closed-bank RD', en: 'Closed-bank RD' }],
    hints: [{ zh: '先用目前row_open組合產生cmd_ok，再只在cmd_valid&&cmd_ok時更新狀態。', en: 'Derive cmd_ok from current row_open, then update only on cmd_valid && cmd_ok.' }],
    starter: `module dram_bank(input wire clk,input wire rst_n,input wire cmd_valid,input wire[1:0]cmd,input wire[7:0]cmd_row,output reg cmd_ok,output reg row_open,output reg[7:0]open_row);
always @* cmd_ok=cmd_valid; // BUG: every command is accepted
always @(posedge clk) begin if(!rst_n)begin row_open<=0;open_row<=0;end else if(cmd_valid)begin if(cmd==0)begin row_open<=1;open_row<=cmd_row;end else if(cmd==2)row_open<=0;end end
endmodule`,
    referenceSolution: `module dram_bank(input wire clk,input wire rst_n,input wire cmd_valid,input wire[1:0]cmd,input wire[7:0]cmd_row,output reg cmd_ok,output reg row_open,output reg[7:0]open_row);
always @* begin cmd_ok=0;if(cmd_valid)case(cmd)2'd0:cmd_ok=!row_open;2'd1:cmd_ok=row_open;2'd2:cmd_ok=row_open;default:cmd_ok=0;endcase end
always @(posedge clk)begin if(!rst_n)begin row_open<=0;open_row<=0;end else if(cmd_valid&&cmd_ok)begin if(cmd==0)begin row_open<=1;open_row<=cmd_row;end else if(cmd==2)row_open<=0;end end
endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,v=0;reg[1:0]cmd=0;reg[7:0]row=0;wire ok,open;wire[7:0]orow;dram_bank dut(clk,rst_n,v,cmd,row,ok,open,orow);always #5 clk=~clk;${pass}
task issue;input[1:0]c;input[7:0]r;input expect;begin @(negedge clk);cmd=c;row=r;v=1;#1;check(ok===expect);@(posedge clk);#1;v=0;end endtask
initial begin repeat(2)@(posedge clk);rst_n=1;issue(1,0,0);check(open===0);issue(0,8'h42,1);check(open===1&&orow===8'h42);issue(0,8'h99,0);check(orow===8'h42);issue(1,0,1);issue(2,0,1);check(open===0);issue(2,0,0);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'dram-trcd-guard', order: 3, track: 'dram', difficulty: 'intermediate', minutes: 35, points: 220,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'tRCD Command Guard', en: 'tRCD command guard' },
    description: { zh: 'ACT之後必須等待指定週期才能發出RD。以倒數計時器實作最小合法時間，不要把延遲只寫在testbench。', en: 'Enforce a programmable ACT-to-RD delay with synthesizable state rather than a testbench-only delay.' },
    specs: [{ zh: 'ACT當拍和其後TRCD個完整週期內rd_allowed必須為0。', en: 'rd_allowed is low on the ACT cycle and for TRCD complete cycles afterward.' }, { zh: '計數器不得underflow。', en: 'The counter must not underflow.' }],
    testGroups: [{ zh: 'ACT後阻擋', en: 'Post-ACT block' }, { zh: '精確解除時間', en: 'Exact release cycle' }, { zh: '重啟等待', en: 'Restart wait' }],
    hints: [{ zh: 'ACT時載入TRCD；非零時每拍減一。allowed需另外排除ACT當拍。', en: 'Load TRCD on ACT and decrement while nonzero; also block the ACT cycle itself.' }],
    starter: `module trcd_guard #(parameter TRCD=3)(input wire clk,input wire rst_n,input wire act_valid,output wire rd_allowed);
  assign rd_allowed=1'b1; // BUG
endmodule`,
    referenceSolution: `module trcd_guard #(parameter TRCD=3)(input wire clk,input wire rst_n,input wire act_valid,output wire rd_allowed);reg[7:0]wait_count;always @(posedge clk)begin if(!rst_n)wait_count<=0;else if(act_valid)wait_count<=TRCD;else if(wait_count!=0)wait_count<=wait_count-1'b1;end assign rd_allowed=(wait_count==0)&&!act_valid;endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,act=0;wire allowed;integer i;trcd_guard #(.TRCD(3))dut(clk,rst_n,act,allowed);always #5 clk=~clk;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;@(negedge clk);act=1;#1;check(!allowed);@(posedge clk);#1;act=0;for(i=0;i<3;i=i+1)begin check(!allowed);@(posedge clk);#1;end check(allowed);@(negedge clk);act=1;#1;check(!allowed);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'dram-frfcfs-select', order: 4, track: 'dram', difficulty: 'advanced', minutes: 55, points: 320,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'FR-FCFS 兩筆請求選擇器', en: 'Two-entry FR-FCFS selector' },
    description: { zh: '在兩筆ready request中優先row hit；同為hit或miss時選age較大者，完全相同時選request 0。', en: 'Prefer a row hit among two ready requests, then the older request, with request 0 as the deterministic tie-break.' },
    specs: [{ zh: '只能grant有效請求；grant為one-hot。', en: 'Grant only valid requests and keep the grant one-hot.' }, { zh: 'row hit優先於age。', en: 'Row hit has priority over age.' }],
    testGroups: [{ zh: '單一請求', en: 'Single request' }, { zh: 'hit優先', en: 'Hit priority' }, { zh: 'age與tie-break', en: 'Age and tie-break' }],
    hints: [{ zh: '先算hit0/hit1，再依valid、hit、age三層決策。', en: 'Compute hit0/hit1, then decide by valid, hit, and age.' }],
    starter: `module frfcfs2(input wire v0,input wire[7:0]row0,input wire[7:0]age0,input wire v1,input wire[7:0]row1,input wire[7:0]age1,input wire bank_open,input wire[7:0]open_row,output reg g0,output reg g1);
  // TODO
endmodule`,
    referenceSolution: `module frfcfs2(input wire v0,input wire[7:0]row0,input wire[7:0]age0,input wire v1,input wire[7:0]row1,input wire[7:0]age1,input wire bank_open,input wire[7:0]open_row,output reg g0,output reg g1);reg h0,h1;always @*begin h0=v0&&bank_open&&(row0==open_row);h1=v1&&bank_open&&(row1==open_row);g0=0;g1=0;if(v0&&!v1)g0=1;else if(v1&&!v0)g1=1;else if(v0&&v1)begin if(h0&&!h1)g0=1;else if(h1&&!h0)g1=1;else if(age1>age0)g1=1;else g0=1;end end endmodule`,
    testbench: `module tb;reg v0,v1,bo;reg[7:0]r0,r1,a0,a1,orow;wire g0,g1;frfcfs2 dut(v0,r0,a0,v1,r1,a1,bo,orow,g0,g1);${pass}
initial begin v0=0;v1=0;bo=0;r0=0;r1=0;a0=0;a1=0;orow=8'h22;#1;check({g1,g0}==0);v0=1;#1;check(g0&&!g1);v1=1;a1=9;#1;check(g1&&!g0);bo=1;r0=8'h22;r1=8'h33;a0=0;a1=255;#1;check(g0&&!g1);r1=8'h22;a0=10;a1=10;#1;check(g0&&!g1);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'dram-refresh-deadline', order: 5, track: 'dram', difficulty: 'advanced', minutes: 50, points: 310,
    kind: 'debug', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'Refresh Deadline Watchdog', en: 'Refresh deadline watchdog' },
    description: { zh: '追蹤距離上次refresh的週期數，在接近deadline時提出must_refresh，錯過deadline則sticky overdue。', en: 'Track cycles since refresh, raise must_refresh near the deadline, and latch a sticky overdue error when the deadline is missed.' },
    specs: [{ zh: 'refresh_issued將age清零；overdue只能由reset清除。', en: 'refresh_issued clears age; only reset clears overdue.' }, { zh: 'MAX_AGE-2開始要求refresh。', en: 'Request refresh starting at MAX_AGE-2.' }],
    testGroups: [{ zh: '預警', en: 'Early warning' }, { zh: '正常refresh', en: 'Timely refresh' }, { zh: 'sticky overdue', en: 'Sticky overdue' }],
    hints: [{ zh: 'age使用飽和計數，overdue在age達MAX_AGE時鎖住。', en: 'Use a saturating age counter and latch overdue at MAX_AGE.' }],
    starter: `module refresh_watchdog #(parameter MAX_AGE=8)(input wire clk,input wire rst_n,input wire tick,input wire refresh_issued,output wire must_refresh,output reg overdue);reg[7:0]age;assign must_refresh=1'b0;always @(posedge clk)if(!rst_n)begin age<=0;overdue<=0;end else if(tick)age<=age+1'b1;endmodule`,
    referenceSolution: `module refresh_watchdog #(parameter MAX_AGE=8)(input wire clk,input wire rst_n,input wire tick,input wire refresh_issued,output wire must_refresh,output reg overdue);reg[7:0]age;assign must_refresh=(age>=MAX_AGE-2);always @(posedge clk)begin if(!rst_n)begin age<=0;overdue<=0;end else begin if(refresh_issued)age<=0;else if(tick&&age<MAX_AGE)age<=age+1'b1;if(tick&&!refresh_issued&&age>=MAX_AGE-1)overdue<=1;end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,tick=0,refi=0;wire must,late;integer i;refresh_watchdog #(.MAX_AGE(8))dut(clk,rst_n,tick,refi,must,late);always #5 clk=~clk;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;tick=1;repeat(6)@(posedge clk);#1;check(must&&!late);refi=1;@(posedge clk);#1;refi=0;check(!must&&!late);repeat(8)@(posedge clk);#1;check(late);refi=1;@(posedge clk);#1;check(late&&!must);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'dram-write-drain', order: 6, track: 'dram', difficulty: 'advanced', minutes: 40, points: 260,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'Write-Drain 高低水位控制', en: 'Write-drain high/low watermark control' },
    description: { zh: '當write queue到達高水位時進入write-drain，直到降到低水位才返回read-priority，避免每拍切換方向。', en: 'Enter write-drain at a high watermark and remain until the low watermark to avoid direction thrashing.' },
    specs: [{ zh: 'depth>=HI進入drain；drain中depth<=LO才離開。', en: 'Enter at depth>=HI; leave only when depth<=LO.' }, { zh: 'reset後read-priority。', en: 'Reset to read-priority.' }],
    testGroups: [{ zh: '高水位進入', en: 'High watermark entry' }, { zh: 'hysteresis', en: 'Hysteresis' }, { zh: '低水位離開', en: 'Low watermark exit' }],
    hints: [{ zh: '這是一個一位元狀態機；進入和離開條件不同。', en: 'This is a one-bit FSM with different enter and exit thresholds.' }],
    starter: `module write_drain #(parameter HI=6,LO=2)(input wire clk,input wire rst_n,input wire[3:0]depth,output reg drain);always @(posedge clk)if(!rst_n)drain<=0;else drain<=depth>=HI;endmodule`,
    referenceSolution: `module write_drain #(parameter HI=6,LO=2)(input wire clk,input wire rst_n,input wire[3:0]depth,output reg drain);always @(posedge clk)begin if(!rst_n)drain<=0;else if(!drain&&depth>=HI)drain<=1;else if(drain&&depth<=LO)drain<=0;end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0;reg[3:0]depth=0;wire drain;write_drain dut(clk,rst_n,depth,drain);always #5 clk=~clk;${pass}
task step;input[3:0]d;input e;begin @(negedge clk);depth=d;@(posedge clk);#1;check(drain===e);end endtask
initial begin repeat(2)@(posedge clk);rst_n=1;step(5,0);step(6,1);step(5,1);step(3,1);step(2,0);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'hbm-pseudo-channel-map', order: 9, track: 'hbm', difficulty: 'beginner', minutes: 30, points: 200,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: '第一步：把位址拆成 HBM 位置', en: 'First step: split an address into an HBM location' },
    description: { zh: '先從最簡單的純接線開始：把 20-bit addr 拆成 row、channel、pseudo-channel、bank-group、bank 與 column。沒有 clock，也不需要先懂 HBM 時序。', en: 'Start with simple wiring: split a 20-bit addr into row, channel, pseudo-channel, bank group, bank, and column. There is no clock, and no HBM timing knowledge is required yet.' },
    specs: [{ zh: 'column[3:0]、bank[5:4]、BG[7:6]、PC[8]、channel[11:9]、row[19:12]。', en: 'column[3:0], bank[5:4], BG[7:6], PC[8], channel[11:9], row[19:12].' }, { zh: '這是教學profile，不是公開重製JEDEC完整mapping。', en: 'This is an educational profile, not a reproduction of a complete JEDEC mapping.' }],
    testGroups: [{ zh: 'PC邊界', en: 'PC boundary' }, { zh: 'channel/BG/bank', en: 'Channel/BG/bank' }, { zh: 'row/column', en: 'Row/column' }],
    hints: [{ zh: '這題不需要 always block。每個 output 都是一條 assign，右邊接 addr 的對應範圍。', en: 'No always block is needed. Each output is one assign connected to the matching addr slice.' }, { zh: '先完成 column=addr[3:0]，再依序往高位接 bank、bg、pc、channel、row。', en: 'Start with column=addr[3:0], then move upward through bank, bg, pc, channel, and row.' }],
    starter: `module hbm_map(
  input  wire [19:0] addr,
  output wire [2:0]  channel,
  output wire        pc,
  output wire [1:0]  bg,
  output wire [1:0]  bank,
  output wire [7:0]  row,
  output wire [3:0]  column
);
  // 範例：最低 4 bits 直接接到 column。
  assign column = addr[3:0];

  // TODO 1：bank 接 addr[5:4]
  // TODO 2：bg 接 addr[7:6]
  // TODO 3：pc 接 addr[8]
  // TODO 4：channel 接 addr[11:9]
  // TODO 5：row 接 addr[19:12]
endmodule`,
    referenceSolution: `module hbm_map(input wire[19:0]addr,output wire[2:0]channel,output wire pc,output wire[1:0]bg,output wire[1:0]bank,output wire[7:0]row,output wire[3:0]column);assign column=addr[3:0];assign bank=addr[5:4];assign bg=addr[7:6];assign pc=addr[8];assign channel=addr[11:9];assign row=addr[19:12];endmodule`,
    testbench: `module tb;reg[19:0]a;wire[2:0]ch;wire pc;wire[1:0]bg,bk;wire[7:0]row;wire[3:0]col;integer i;hbm_map dut(a,ch,pc,bg,bk,row,col);${pass}task t;input[19:0]v;begin a=v;#1;check({row,ch,pc,bg,bk,col}===v);end endtask initial begin t(0);t(20'hfffff);t(20'ha55aa);for(i=0;i<64;i=i+1)t(i*20'h321);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'hbm-bankgroup-tccd', order: 10, track: 'hbm', difficulty: 'advanced', minutes: 50, points: 320,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'HBM Bank-Group tCCD Guard', en: 'HBM bank-group tCCD guard' },
    description: { zh: '追蹤上一筆column command的bank group；同BG使用較長間隔，不同BG使用較短間隔。', en: 'Track the previous column-command bank group and enforce a longer same-BG delay than different-BG delay.' },
    specs: [{ zh: '同BG至少4拍；不同BG至少2拍。第一筆永遠允許。', en: 'At least 4 cycles for same BG and 2 for different BG; the first command is always allowed.' }, { zh: '只有issue才更新last BG。', en: 'Update last BG only on an issued command.' }],
    testGroups: [{ zh: '第一筆', en: 'First command' }, { zh: '不同BG', en: 'Different BG' }, { zh: '同BG', en: 'Same BG' }],
    hints: [{ zh: '保存last_valid、last_bg與age；age飽和可簡化比較。', en: 'Store last_valid, last_bg, and a saturating age.' }],
    starter: `module hbm_tccd(input wire clk,input wire rst_n,input wire issue,input wire[1:0]issue_bg,input wire[1:0]candidate_bg,output wire allowed);assign allowed=1'b1;endmodule`,
    referenceSolution: `module hbm_tccd(input wire clk,input wire rst_n,input wire issue,input wire[1:0]issue_bg,input wire[1:0]candidate_bg,output wire allowed);reg valid;reg[1:0]last_bg;reg[3:0]age;assign allowed=!valid||((candidate_bg==last_bg)?(age>=4):(age>=2));always @(posedge clk)begin if(!rst_n)begin valid<=0;last_bg<=0;age<=0;end else begin if(issue)begin valid<=1;last_bg<=issue_bg;age<=1;end else if(valid&&age<15)age<=age+1'b1;end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,issue=0;reg[1:0]ibg=0,cbg=0;wire allowed;hbm_tccd dut(clk,rst_n,issue,ibg,cbg,allowed);always #5 clk=~clk;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;#1;check(allowed);@(negedge clk);issue=1;ibg=1;cbg=1;@(posedge clk);#1;issue=0;check(!allowed);cbg=2;#1;check(!allowed);@(posedge clk);#1;check(allowed);cbg=1;#1;check(!allowed);repeat(2)@(posedge clk);#1;check(allowed);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'lpddr-power-sequence', order: 14, track: 'lpddr', difficulty: 'advanced', minutes: 60, points: 360,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'LPDDR 低功耗進出序列', en: 'LPDDR low-power entry and exit sequence' },
    description: { zh: '建立簡化power sequencer：先drain，再gate clock、isolate、power off；喚醒後等power-good、解除isolation，最後開clock。', en: 'Build a simplified sequencer: drain, gate clock, isolate, power off; then wait for power-good, remove isolation, and restore the clock.' },
    specs: [{ zh: '不得在busy時斷電；power_on=0時isolation必須為1。', en: 'Never power off while busy; isolation must be asserted whenever power_on=0.' }, { zh: 'request_wake後先power_on並等待pgood。', en: 'On wake, power on and wait for pgood before de-isolation.' }],
    testGroups: [{ zh: '等待idle', en: 'Drain to idle' }, { zh: '安全sleep', en: 'Safe sleep' }, { zh: 'power-good喚醒', en: 'Power-good wake' }],
    hints: [{ zh: '使用IDLE、DRAIN、ISOLATE、SLEEP、POWERUP、RESTORE六個狀態。', en: 'Use IDLE, DRAIN, ISOLATE, SLEEP, POWERUP, and RESTORE states.' }],
    starter: `module lpddr_power_seq(input wire clk,input wire rst_n,input wire request_sleep,input wire request_wake,input wire busy,input wire pgood,output reg gate_clk,output reg isolation,output reg power_on,output reg in_sleep);always @*begin gate_clk=0;isolation=0;power_on=1;in_sleep=0;end endmodule`,
    referenceSolution: `module lpddr_power_seq(input wire clk,input wire rst_n,input wire request_sleep,input wire request_wake,input wire busy,input wire pgood,output reg gate_clk,output reg isolation,output reg power_on,output reg in_sleep);localparam IDLE=0,DRAIN=1,ISO=2,SLEEP=3,PUP=4,RESTORE=5;reg[2:0]s;always @(posedge clk)begin if(!rst_n)s<=IDLE;else case(s)IDLE:if(request_sleep)s<=DRAIN;DRAIN:if(!busy)s<=ISO;ISO:s<=SLEEP;SLEEP:if(request_wake)s<=PUP;PUP:if(pgood)s<=RESTORE;RESTORE:s<=IDLE;default:s<=IDLE;endcase end always @*begin gate_clk=0;isolation=0;power_on=1;in_sleep=0;case(s)DRAIN:;ISO:begin gate_clk=1;isolation=1;end SLEEP:begin gate_clk=1;isolation=1;power_on=0;in_sleep=1;end PUP:begin gate_clk=1;isolation=1;power_on=1;end RESTORE:begin gate_clk=1;isolation=0;power_on=1;end endcase end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,slp=0,wake=0,busy=1,pgood=0;wire gate,iso,pwr,sleeping;lpddr_power_seq dut(clk,rst_n,slp,wake,busy,pgood,gate,iso,pwr,sleeping);always #5 clk=~clk;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;slp=1;@(posedge clk);#1;slp=0;check(pwr&&!iso);repeat(2)@(posedge clk);#1;check(pwr&&!iso);busy=0;@(posedge clk);#1;check(gate&&iso&&pwr);@(posedge clk);#1;check(sleeping&&iso&&!pwr);wake=1;@(posedge clk);#1;wake=0;check(gate&&iso&&pwr);repeat(2)@(posedge clk);#1;check(iso);pgood=1;@(posedge clk);#1;check(gate&&!iso&&pwr);@(posedge clk);#1;check(!gate&&!iso&&pwr&&!sleeping);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'gddr-turnaround-guard', order: 18, track: 'gddr', difficulty: 'advanced', minutes: 45, points: 280,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'GDDR Read/Write Turnaround Guard', en: 'GDDR read/write turnaround guard' },
    description: { zh: '資料匯流排改變方向需要額外等待；同方向command可繼續，read→write與write→read採不同間隔。', en: 'Model asymmetric bus-turnaround delays while allowing same-direction commands to continue.' },
    specs: [{ zh: 'read→write等待2拍；write→read等待3拍。', en: 'Wait 2 cycles for read→write and 3 for write→read.' }, { zh: '只有issue更新方向。', en: 'Only an issued command updates direction.' }],
    testGroups: [{ zh: '同方向', en: 'Same direction' }, { zh: 'R→W', en: 'R→W' }, { zh: 'W→R', en: 'W→R' }],
    hints: [{ zh: '保存last_is_write與age，只有方向不同時檢查門檻。', en: 'Store last_is_write and age; check the threshold only when direction changes.' }],
    starter: `module gddr_turnaround(input wire clk,input wire rst_n,input wire issue,input wire issue_is_write,input wire candidate_is_write,output wire allowed);assign allowed=1'b1;endmodule`,
    referenceSolution: `module gddr_turnaround(input wire clk,input wire rst_n,input wire issue,input wire issue_is_write,input wire candidate_is_write,output wire allowed);reg valid,last_w;reg[3:0]age;wire same=candidate_is_write==last_w;wire[3:0]need=last_w?3:2;assign allowed=!valid||same||(age>=need);always @(posedge clk)begin if(!rst_n)begin valid<=0;last_w<=0;age<=0;end else if(issue)begin valid<=1;last_w<=issue_is_write;age<=1;end else if(valid&&age<15)age<=age+1'b1;end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,issue=0,iw=0,cw=0;wire allowed;gddr_turnaround dut(clk,rst_n,issue,iw,cw,allowed);always #5 clk=~clk;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;#1;check(allowed);@(negedge clk);issue=1;iw=0;cw=0;@(posedge clk);#1;issue=0;check(allowed);cw=1;#1;check(!allowed);@(posedge clk);#1;check(allowed);@(negedge clk);issue=1;iw=1;cw=1;@(posedge clk);#1;issue=0;cw=0;#1;check(!allowed);repeat(2)@(posedge clk);#1;check(allowed);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'pcie-credit-manager', order: 22, track: 'pcie', difficulty: 'advanced', minutes: 50, points: 320,
    kind: 'debug', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'PCIe Flow-Control Credit Manager', en: 'PCIe flow-control credit manager' },
    description: { zh: '只有header與data credit都足夠時才能送出TLP；收到Flow Control update後補回credit。', en: 'Transmit a TLP only when both header and data credits are available, and replenish them from flow-control updates.' },
    specs: [{ zh: 'tx_grant = tx_valid且兩種credit都足夠。', en: 'tx_grant requires tx_valid and sufficient credits of both types.' }, { zh: 'grant後扣除成本，不得underflow。', en: 'Subtract costs on grant without underflow.' }],
    testGroups: [{ zh: '足夠credit', en: 'Sufficient credits' }, { zh: '任一不足皆阻擋', en: 'Block either shortage' }, { zh: 'FC更新', en: 'FC update' }],
    hints: [{ zh: 'grant由目前計數器組合判斷；sequential block只在grant時扣除。', en: 'Derive grant from current counters and subtract only on grant.' }],
    starter: `module pcie_credits(input wire clk,input wire rst_n,input wire tx_valid,input wire[3:0]tx_h_cost,input wire[7:0]tx_d_cost,input wire fc_valid,input wire[3:0]fc_h_add,input wire[7:0]fc_d_add,output wire tx_grant,output reg[4:0]h_credit,output reg[8:0]d_credit);assign tx_grant=tx_valid;always @(posedge clk)if(!rst_n)begin h_credit<=4;d_credit<=16;end endmodule`,
    referenceSolution: `module pcie_credits(input wire clk,input wire rst_n,input wire tx_valid,input wire[3:0]tx_h_cost,input wire[7:0]tx_d_cost,input wire fc_valid,input wire[3:0]fc_h_add,input wire[7:0]fc_d_add,output wire tx_grant,output reg[4:0]h_credit,output reg[8:0]d_credit);assign tx_grant=tx_valid&&(h_credit>=tx_h_cost)&&(d_credit>=tx_d_cost);always @(posedge clk)begin if(!rst_n)begin h_credit<=4;d_credit<=16;end else begin case({tx_grant,fc_valid})2'b10:begin h_credit<=h_credit-tx_h_cost;d_credit<=d_credit-tx_d_cost;end 2'b01:begin h_credit<=h_credit+fc_h_add;d_credit<=d_credit+fc_d_add;end 2'b11:begin h_credit<=h_credit-tx_h_cost+fc_h_add;d_credit<=d_credit-tx_d_cost+fc_d_add;end endcase end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,tv=0,fv=0;reg[3:0]hc=0,ha=0;reg[7:0]dc=0,da=0;wire grant;wire[4:0]h;wire[8:0]d;pcie_credits dut(clk,rst_n,tv,hc,dc,fv,ha,da,grant,h,d);always #5 clk=~clk;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;#1;check(h==4&&d==16);tv=1;hc=2;dc=8;#1;check(grant);@(posedge clk);#1;tv=0;check(h==2&&d==8);tv=1;hc=3;dc=1;#1;check(!grant);tv=0;fv=1;ha=4;da=8;@(posedge clk);#1;fv=0;check(h==6&&d==16);tv=1;fv=1;hc=2;dc=4;ha=1;da=2;#1;check(grant);@(posedge clk);#1;tv=0;fv=0;check(h==5&&d==14);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'pcie-tag-tracker', order: 23, track: 'pcie', difficulty: 'advanced', minutes: 50, points: 320,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'PCIe Non-Posted Tag Tracker', en: 'PCIe non-posted tag tracker' },
    description: { zh: '以bitmap追蹤8個outstanding tags，拒絕重複配置，並偵測未知completion。', en: 'Track eight outstanding tags with a bitmap, reject duplicate allocation, and flag completions for unknown tags.' },
    specs: [{ zh: 'alloc_ready只在tag未使用時為1。', en: 'alloc_ready is high only for a free tag.' }, { zh: '合法completion釋放tag；未知completion產生一拍cpl_error。', en: 'A legal completion frees the tag; an unknown completion emits one-cycle cpl_error.' }],
    testGroups: [{ zh: '配置與重複配置', en: 'Allocation and duplicate allocation' }, { zh: '完成釋放', en: 'Completion release' }, { zh: '未知tag', en: 'Unknown tag' }],
    hints: [{ zh: 'outstanding[tag]即是配置狀態；error每拍先清零。', en: 'outstanding[tag] is the allocation state; clear error by default each cycle.' }],
    starter: `module pcie_tags(input wire clk,input wire rst_n,input wire alloc_valid,input wire[2:0]alloc_tag,output wire alloc_ready,input wire cpl_valid,input wire[2:0]cpl_tag,output reg cpl_error,output reg[7:0]outstanding);assign alloc_ready=1;always @(posedge clk)if(!rst_n)begin outstanding<=0;cpl_error<=0;end endmodule`,
    referenceSolution: `module pcie_tags(input wire clk,input wire rst_n,input wire alloc_valid,input wire[2:0]alloc_tag,output wire alloc_ready,input wire cpl_valid,input wire[2:0]cpl_tag,output reg cpl_error,output reg[7:0]outstanding);assign alloc_ready=!outstanding[alloc_tag];always @(posedge clk)begin if(!rst_n)begin outstanding<=0;cpl_error<=0;end else begin cpl_error<=0;if(alloc_valid&&alloc_ready)outstanding[alloc_tag]<=1;if(cpl_valid)begin if(outstanding[cpl_tag])outstanding[cpl_tag]<=0;else cpl_error<=1;end end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,av=0,cv=0;reg[2:0]at=0,ct=0;wire ar,err;wire[7:0]o;pcie_tags dut(clk,rst_n,av,at,ar,cv,ct,err,o);always #5 clk=~clk;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;at=3;av=1;#1;check(ar);@(posedge clk);#1;check(o[3]&&!ar);av=0;ct=3;cv=1;@(posedge clk);#1;cv=0;check(!o[3]&&!err);ct=5;cv=1;@(posedge clk);#1;cv=0;check(err);@(posedge clk);#1;check(!err);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'pcie-replay-timer', order: 24, track: 'pcie', difficulty: 'advanced', minutes: 55, points: 340,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'PCIe Replay Timeout', en: 'PCIe replay timeout' },
    description: { zh: '送出需要ack的packet後啟動timer；收到ack則清除，超時則產生一拍replay_request並重新計時。', en: 'Start a timer for an acknowledged packet, clear it on ACK, and issue a one-cycle replay request on timeout.' },
    specs: [{ zh: '沒有outstanding packet時不得計時。', en: 'Do not count without an outstanding packet.' }, { zh: 'ack優先於timeout。', en: 'ACK has priority over timeout.' }],
    testGroups: [{ zh: '正常ack', en: 'Normal ACK' }, { zh: 'timeout replay', en: 'Timeout replay' }, { zh: 'one-cycle request', en: 'One-cycle request' }],
    hints: [{ zh: '保存outstanding和timer；每拍先把replay_request清零。', en: 'Store outstanding and timer; clear replay_request by default each cycle.' }],
    starter: `module replay_timer #(parameter TIMEOUT=4)(input wire clk,input wire rst_n,input wire sent,input wire ack,output reg outstanding,output reg replay_request);always @(posedge clk)if(!rst_n)begin outstanding<=0;replay_request<=0;end endmodule`,
    referenceSolution: `module replay_timer #(parameter TIMEOUT=4)(input wire clk,input wire rst_n,input wire sent,input wire ack,output reg outstanding,output reg replay_request);reg[7:0]timer;always @(posedge clk)begin if(!rst_n)begin outstanding<=0;replay_request<=0;timer<=0;end else begin replay_request<=0;if(ack)begin outstanding<=0;timer<=0;end else if(sent&&!outstanding)begin outstanding<=1;timer<=0;end else if(outstanding)begin if(timer>=TIMEOUT-1)begin replay_request<=1;timer<=0;end else timer<=timer+1'b1;end end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,sent=0,ack=0;wire out,replay;integer pulses=0;replay_timer #(.TIMEOUT(4))dut(clk,rst_n,sent,ack,out,replay);always #5 clk=~clk;always @(posedge clk)if(replay)pulses=pulses+1;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;sent=1;@(posedge clk);#1;sent=0;check(out);repeat(2)@(posedge clk);ack=1;@(posedge clk);#1;ack=0;check(!out&&pulses==0);sent=1;@(posedge clk);#1;sent=0;repeat(5)@(posedge clk);#1;check(pulses==1&&out);repeat(4)@(posedge clk);#1;check(pulses==2);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'controller-tag-completion', order: 25, track: 'pcie', difficulty: 'advanced', minutes: 55, points: 340,
    kind: 'debug', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'Controller Completion Exactly-Once Checker', en: 'Controller completion exactly-once checker' },
    description: { zh: '建立小型硬體checker：每個accepted tag必須對應一次completion；重複tag、未知completion與duplicate completion都要被抓到。', en: 'Build a hardware checker enforcing one completion per accepted tag and flagging duplicate tags or unknown/duplicate completions.' },
    specs: [{ zh: '使用8-entry outstanding bitmap。error為sticky。', en: 'Use an eight-entry outstanding bitmap and a sticky error.' }, { zh: '合法completion清除對應bit。', en: 'A legal completion clears its corresponding bit.' }],
    testGroups: [{ zh: '正常完成', en: 'Normal completion' }, { zh: '重複accept', en: 'Duplicate accept' }, { zh: '未知completion', en: 'Unknown completion' }],
    hints: [{ zh: 'accept看到已經為1或completion看到0時設定sticky_error。', en: 'Set sticky_error when accept sees 1 or completion sees 0.' }],
    starter: `module completion_checker(input wire clk,input wire rst_n,input wire accept,input wire[2:0]accept_tag,input wire complete,input wire[2:0]complete_tag,output reg sticky_error,output reg[7:0]outstanding);always @(posedge clk)if(!rst_n)begin sticky_error<=0;outstanding<=0;end endmodule`,
    referenceSolution: `module completion_checker(input wire clk,input wire rst_n,input wire accept,input wire[2:0]accept_tag,input wire complete,input wire[2:0]complete_tag,output reg sticky_error,output reg[7:0]outstanding);always @(posedge clk)begin if(!rst_n)begin sticky_error<=0;outstanding<=0;end else begin if(accept)begin if(outstanding[accept_tag])sticky_error<=1;else outstanding[accept_tag]<=1;end if(complete)begin if(!outstanding[complete_tag])sticky_error<=1;else outstanding[complete_tag]<=0;end end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,a=0,c=0;reg[2:0]at=0,ct=0;wire err;wire[7:0]o;completion_checker dut(clk,rst_n,a,at,c,ct,err,o);always #5 clk=~clk;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;at=2;a=1;@(posedge clk);#1;a=0;check(o[2]&&!err);ct=2;c=1;@(posedge clk);#1;c=0;check(!o[2]&&!err);ct=2;c=1;@(posedge clk);#1;c=0;check(err);rst_n=0;@(posedge clk);#1;rst_n=1;at=4;a=1;@(posedge clk);#1;check(o[4]);@(posedge clk);#1;check(err);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'dram-timing-wheel', order: 7, track: 'dram', difficulty: 'advanced', minutes: 55, points: 340,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'DRAM 多條件 Timing Wheel', en: 'DRAM multi-constraint timing wheel' },
    description: { zh: '把ACT與RD造成的未來合法時間集中成deadline，而不是散落成許多脆弱的倒數器。', en: 'Centralize future legal times caused by ACT and RD as deadlines instead of scattered fragile countdowns.' },
    specs: [{ zh: 'ACT後第3拍才允許RD；RD後第4拍才允許PRE。', en: 'Allow RD three cycles after ACT and PRE four cycles after RD.' }, { zh: '16-bit時間比較必須支援自然回繞。', en: 'The 16-bit time comparison must tolerate natural wraparound.' }],
    testGroups: [{ zh: 'ACT→RD邊界', en: 'ACT→RD boundary' }, { zh: 'RD→PRE邊界', en: 'RD→PRE boundary' }, { zh: '時間回繞', en: 'Timer wraparound' }],
    hints: [{ zh: 'deadline到達可用有號差值判斷；事件當拍要額外阻擋。', en: 'Use a signed time difference for deadline arrival and separately block the event cycle.' }],
    starter: `module dram_timing_wheel(input wire clk,input wire rst_n,input wire act,input wire rd,output wire rd_ok,output wire pre_ok);assign rd_ok=1;assign pre_ok=1;endmodule`,
    referenceSolution: `module dram_timing_wheel(input wire clk,input wire rst_n,input wire act,input wire rd,output wire rd_ok,output wire pre_ok);reg[15:0]now,rd_deadline,pre_deadline;reg have_act,have_rd;wire signed[15:0]rd_delta=$signed(now-rd_deadline);wire signed[15:0]pre_delta=$signed(now-pre_deadline);assign rd_ok=have_act&&(rd_delta>=0)&&!act;assign pre_ok=have_rd&&(pre_delta>=0)&&!rd;always @(posedge clk)begin if(!rst_n)begin now<=0;rd_deadline<=0;pre_deadline<=0;have_act<=0;have_rd<=0;end else begin now<=now+1'b1;if(act)begin rd_deadline<=now+3;have_act<=1;end if(rd)begin pre_deadline<=now+4;have_rd<=1;end end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,act=0,rd=0;wire rok,pok;dram_timing_wheel dut(clk,rst_n,act,rd,rok,pok);always #5 clk=~clk;${pass}initial begin repeat(2)@(posedge clk);rst_n=1;@(negedge clk);act=1;#1;check(!rok);@(posedge clk);#1;act=0;check(!rok);repeat(2)@(posedge clk);#1;check(rok);@(negedge clk);rd=1;#1;check(!pok);@(posedge clk);#1;rd=0;repeat(3)@(posedge clk);#1;check(pok);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'dram-command-generator', order: 8, track: 'dram', difficulty: 'capstone', minutes: 80, points: 500,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'DRAM Bank Command Generator', en: 'DRAM bank command generator' },
    description: { zh: '把request、open-row狀態與timing guard組成單bank命令產生器：row hit直接RD，closed先ACT，row conflict先PRE。', en: 'Compose request, open-row state, and timing guards into a one-bank command generator: RD on hit, ACT when closed, PRE on conflict.' },
    specs: [{ zh: '輸出cmd：0=NOP、1=ACT、2=RD、3=PRE；cmd_valid只有真正發令時為1。', en: 'cmd: 0=NOP, 1=ACT, 2=RD, 3=PRE; cmd_valid only when a command is issued.' }, { zh: '每拍最多一個命令，且必須尊重act_ok/rd_ok/pre_ok。', en: 'Issue at most one command per cycle and honor act_ok/rd_ok/pre_ok.' }],
    testGroups: [{ zh: 'closed-row路徑', en: 'Closed-row path' }, { zh: 'row-hit路徑', en: 'Row-hit path' }, { zh: 'row-conflict路徑', en: 'Row-conflict path' }],
    hints: [{ zh: '這是組合決策器；bank state由外部在命令接受後更新。', en: 'This is a combinational decision block; external bank state updates after command acceptance.' }],
    starter: `module dram_cmd_gen(input wire req_valid,input wire[7:0]req_row,input wire row_open,input wire[7:0]open_row,input wire act_ok,input wire rd_ok,input wire pre_ok,output reg cmd_valid,output reg[1:0]cmd);always @*begin cmd_valid=0;cmd=0;end endmodule`,
    referenceSolution: `module dram_cmd_gen(input wire req_valid,input wire[7:0]req_row,input wire row_open,input wire[7:0]open_row,input wire act_ok,input wire rd_ok,input wire pre_ok,output reg cmd_valid,output reg[1:0]cmd);always @*begin cmd_valid=0;cmd=0;if(req_valid)begin if(!row_open&&act_ok)begin cmd_valid=1;cmd=1;end else if(row_open&&req_row==open_row&&rd_ok)begin cmd_valid=1;cmd=2;end else if(row_open&&req_row!=open_row&&pre_ok)begin cmd_valid=1;cmd=3;end end end endmodule`,
    testbench: `module tb;reg v,open,aok,rok,pok;reg[7:0]rr,orow;wire cv;wire[1:0]cmd;dram_cmd_gen dut(v,rr,open,orow,aok,rok,pok,cv,cmd);${pass}initial begin v=0;open=0;aok=1;rok=1;pok=1;rr=8'h12;orow=8'h12;#1;check(!cv);v=1;#1;check(cv&&cmd==1);aok=0;#1;check(!cv);open=1;aok=1;#1;check(cv&&cmd==2);rok=0;#1;check(!cv);rok=1;orow=8'h33;#1;check(cv&&cmd==3);pok=0;#1;check(!cv);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'hbm-hierarchical-arbiter', order: 11, track: 'hbm', difficulty: 'advanced', minutes: 65, points: 400,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'HBM 階層式 Pseudo-Channel Arbiter', en: 'HBM hierarchical pseudo-channel arbiter' },
    description: { zh: '先由各pseudo-channel彙整本地可發命令，再以round-robin選出全域唯一winner，避免扇入隨channel數爆炸。', en: 'Aggregate local readiness per pseudo-channel, then choose one global round-robin winner to avoid a flat high-fanin arbiter.' },
    specs: [{ zh: 'req[3:0]中最多grant一位；成功grant後指標移到winner下一位。', en: 'Grant at most one bit of req[3:0], then advance past the winner.' }, { zh: '無請求時保持指標。', en: 'Hold the pointer when idle.' }],
    testGroups: [{ zh: 'one-hot', en: 'One-hot grant' }, { zh: '公平輪轉', en: 'Fair rotation' }, { zh: '稀疏請求', en: 'Sparse requests' }],
    hints: [{ zh: '可將req循環掃描四次，找到第一個後鎖住found。', en: 'Scan req circularly four times and latch a found flag after the first match.' }],
    starter: `module hbm_pc_arbiter(input wire clk,input wire rst_n,input wire[3:0]req,output reg[3:0]grant);always @* grant=req;endmodule`,
    referenceSolution: `module hbm_pc_arbiter(input wire clk,input wire rst_n,input wire[3:0]req,output reg[3:0]grant);reg[1:0]ptr;integer k;reg found;reg[2:0]idx;always @*begin grant=0;found=0;for(k=0;k<4;k=k+1)begin idx=ptr+k;if(!found&&req[idx[1:0]])begin grant[idx[1:0]]=1;found=1;end end end always @(posedge clk)begin if(!rst_n)ptr<=0;else if(grant[0])ptr<=1;else if(grant[1])ptr<=2;else if(grant[2])ptr<=3;else if(grant[3])ptr<=0;end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0;reg[3:0]req=0;wire[3:0]g;hbm_pc_arbiter dut(clk,rst_n,req,g);always #5 clk=~clk;${pass}task step;input[3:0]r;input[3:0]e;begin @(negedge clk);req=r;#1;check(g===e);@(posedge clk);#1;end endtask initial begin repeat(2)@(posedge clk);rst_n=1;step(4'b1111,1);step(4'b1111,2);step(4'b1010,8);step(4'b1010,2);step(0,0);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'hbm-refresh-domain', order: 12, track: 'hbm', difficulty: 'advanced', minutes: 55, points: 340,
    kind: 'debug', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'HBM 獨立 Refresh Domain', en: 'HBM independent refresh domains' },
    description: { zh: '四個pseudo-channel各自追蹤refresh busy；局部refresh不應錯誤凍結整個stack。', en: 'Track refresh busy independently for four pseudo-channels so a local refresh does not freeze the whole stack.' },
    specs: [{ zh: 'ref_start[i]使busy[i]維持3拍；只有對應PC的cmd_allowed被阻擋。', en: 'ref_start[i] holds busy[i] for three cycles and blocks only that PC.' }, { zh: '計數器不得互相覆蓋。', en: 'Counters must not overwrite one another.' }],
    testGroups: [{ zh: '局部阻擋', en: 'Local blocking' }, { zh: '重疊refresh', en: 'Overlapping refreshes' }, { zh: '精確釋放', en: 'Exact release' }],
    hints: [{ zh: '每個PC需要獨立的小計數器；請勿只做一個global busy。', en: 'Use one small counter per PC, not a global busy flag.' }],
    starter: `module hbm_refresh_domains(input wire clk,input wire rst_n,input wire[3:0]ref_start,output wire[3:0]cmd_allowed);assign cmd_allowed=4'b1111;endmodule`,
    referenceSolution: `module hbm_refresh_domains(input wire clk,input wire rst_n,input wire[3:0]ref_start,output wire[3:0]cmd_allowed);reg[1:0]c0,c1,c2,c3;assign cmd_allowed={c3==0,c2==0,c1==0,c0==0}&~ref_start;always @(posedge clk)begin if(!rst_n)begin c0<=0;c1<=0;c2<=0;c3<=0;end else begin if(ref_start[0])c0<=3;else if(c0!=0)c0<=c0-1'b1;if(ref_start[1])c1<=3;else if(c1!=0)c1<=c1-1'b1;if(ref_start[2])c2<=3;else if(c2!=0)c2<=c2-1'b1;if(ref_start[3])c3<=3;else if(c3!=0)c3<=c3-1'b1;end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0;reg[3:0]s=0;wire[3:0]a;hbm_refresh_domains dut(clk,rst_n,s,a);always #5 clk=~clk;${pass}initial begin repeat(2)@(posedge clk);rst_n=1;#1;check(a==15);@(negedge clk);s=2;#1;check(a==13);@(posedge clk);#1;s=0;check(a==13);@(negedge clk);s=8;@(posedge clk);#1;s=0;check(a[0]&&a[2]&&!a[1]&&!a[3]);repeat(2)@(posedge clk);#1;check(a[1]&&!a[3]);@(posedge clk);#1;check(a==15);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'hbm-channel-capstone', order: 13, track: 'hbm', difficulty: 'capstone', minutes: 105, points: 680,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'HBM4 Channel Dual-Issue Capstone', en: 'HBM4 channel dual-issue capstone' },
    description: { zh: '整合兩個 pseudo-channel 的 row/column legality、各自 round-robin policy、PHY backpressure 與最高優先 maintenance drain；一般模式可同拍發一個 row winner 與一個 column winner。', en: 'Integrate row/column legality for two pseudo-channels, independent round-robin policy, PHY backpressure, and highest-priority maintenance drain. Normal mode may issue one row winner and one column winner together.' },
    specs: [{ zh: 'row_eligible=row_valid&row_timing_ok，col_eligible 同理；每個 grant 各自 one-hot，且只有 phy_ready 才能成立。', en: 'row_eligible=row_valid&row_timing_ok and similarly for columns; each grant is one-hot and requires phy_ready.' }, { zh: 'maintenance_valid 出現後阻擋一般 issue；只有 channel_quiescent 才 maint_grant。', en: 'maintenance_valid blocks normal issue; maint_grant additionally requires channel_quiescent.' }],
    testGroups: [{ zh: 'row/column 同拍雙發', en: 'Concurrent row/column issue' }, { zh: '獨立 round-robin', en: 'Independent round-robin' }, { zh: 'maintenance drain 與 PHY stall', en: 'Maintenance drain and PHY stall' }],
    hints: [{ zh: '先分別算 row/column eligible，再用兩個一位 pointer 選 PC；最後用 maintenance_valid 與 phy_ready gate commit。', en: 'Compute row/column eligibility separately, select each PC with an independent one-bit pointer, then gate commit with maintenance_valid and phy_ready.' }],
    starter: `module hbm_channel_issue(input wire clk,input wire rst_n,input wire[1:0]row_valid,input wire[1:0]row_timing_ok,input wire[1:0]col_valid,input wire[1:0]col_timing_ok,input wire maintenance_valid,input wire channel_quiescent,input wire phy_ready,output reg[1:0]row_grant,output reg[1:0]col_grant,output wire maint_grant);assign maint_grant=maintenance_valid;always @*begin row_grant=row_valid;col_grant=col_valid;end endmodule`,
    referenceSolution: `module hbm_channel_issue(input wire clk,input wire rst_n,input wire[1:0]row_valid,input wire[1:0]row_timing_ok,input wire[1:0]col_valid,input wire[1:0]col_timing_ok,input wire maintenance_valid,input wire channel_quiescent,input wire phy_ready,output reg[1:0]row_grant,output reg[1:0]col_grant,output wire maint_grant);reg row_ptr,col_ptr;wire[1:0]re=row_valid&row_timing_ok;wire[1:0]ce=col_valid&col_timing_ok;assign maint_grant=maintenance_valid&&channel_quiescent&&phy_ready;always @*begin row_grant=0;col_grant=0;if(!maintenance_valid&&phy_ready)begin if(row_ptr)begin if(re[1])row_grant=2'b10;else if(re[0])row_grant=2'b01;end else begin if(re[0])row_grant=2'b01;else if(re[1])row_grant=2'b10;end if(col_ptr)begin if(ce[1])col_grant=2'b10;else if(ce[0])col_grant=2'b01;end else begin if(ce[0])col_grant=2'b01;else if(ce[1])col_grant=2'b10;end end end always @(posedge clk)begin if(!rst_n)begin row_ptr<=0;col_ptr<=0;end else begin if(row_grant[0])row_ptr<=1;else if(row_grant[1])row_ptr<=0;if(col_grant[0])col_ptr<=1;else if(col_grant[1])col_ptr<=0;end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,m=0,q=0,p=1;reg[1:0]rv=0,rt=3,cv=0,ct=3;wire[1:0]rg,cg;wire mg;hbm_channel_issue dut(clk,rst_n,rv,rt,cv,ct,m,q,p,rg,cg,mg);always #5 clk=~clk;${pass}initial begin repeat(2)@(posedge clk);rst_n=1;rv=3;cv=3;#1;check(rg==1&&cg==1&&!mg);@(posedge clk);#1;check(rg==2&&cg==2);rt=1;ct=2;@(posedge clk);#1;check(rg==1&&cg==2);m=1;q=0;#1;check(rg==0&&cg==0&&!mg);q=1;#1;check(mg&&rg==0&&cg==0);p=0;#1;check(!mg&&rg==0&&cg==0);m=0;#1;check(rg==0&&cg==0);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'lpddr-init-sequencer', order: 15, track: 'lpddr', difficulty: 'advanced', minutes: 65, points: 400,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'LPDDR 初始化與 Training Sequencer', en: 'LPDDR initialization and training sequencer' },
    description: { zh: '將reset release、MR設定、ZQ與training握手排成可驗證序列；真正PHY training位於數位/類比邊界外。', en: 'Sequence reset release, mode-register setup, ZQ, and training handshakes; physical training remains beyond the digital/analog boundary.' },
    specs: [{ zh: '依序產生MR0、MR1、ZQ與train_req，每個脈衝一拍。', en: 'Pulse MR0, MR1, ZQ, and train_req in order for one cycle each.' }, { zh: '等待train_done後才ready。', en: 'Assert ready only after train_done.' }],
    testGroups: [{ zh: '命令順序', en: 'Command order' }, { zh: 'training等待', en: 'Training wait' }, { zh: 'ready鎖定', en: 'Ready latch' }],
    hints: [{ zh: '每個動作使用獨立state，輸出依state組合解碼。', en: 'Give each action its own state and decode outputs combinationally.' }],
    starter: `module lpddr_init(input wire clk,input wire rst_n,input wire start,input wire train_done,output reg mr0,output reg mr1,output reg zq,output reg train_req,output reg ready);always @*begin mr0=0;mr1=0;zq=0;train_req=0;ready=0;end endmodule`,
    referenceSolution: `module lpddr_init(input wire clk,input wire rst_n,input wire start,input wire train_done,output reg mr0,output reg mr1,output reg zq,output reg train_req,output reg ready);localparam I=0,M0=1,M1=2,Z=3,T=4,W=5,R=6;reg[2:0]s;always @(posedge clk)begin if(!rst_n)s<=I;else case(s)I:if(start)s<=M0;M0:s<=M1;M1:s<=Z;Z:s<=T;T:s<=W;W:if(train_done)s<=R;R:s<=R;default:s<=I;endcase end always @*begin mr0=0;mr1=0;zq=0;train_req=0;ready=0;case(s)M0:mr0=1;M1:mr1=1;Z:zq=1;T:train_req=1;R:ready=1;endcase end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,start=0,done=0;wire m0,m1,z,t,r;lpddr_init dut(clk,rst_n,start,done,m0,m1,z,t,r);always #5 clk=~clk;${pass}initial begin repeat(2)@(posedge clk);rst_n=1;start=1;@(posedge clk);#1;start=0;check(m0);@(posedge clk);#1;check(m1);@(posedge clk);#1;check(z);@(posedge clk);#1;check(t);@(posedge clk);#1;check(!r);repeat(2)@(posedge clk);done=1;@(posedge clk);#1;done=0;check(r);@(posedge clk);#1;check(r);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'lpddr-dvfs-quiesce', order: 16, track: 'lpddr', difficulty: 'advanced', minutes: 60, points: 380,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'LPDDR DVFS Quiesce Protocol', en: 'LPDDR DVFS quiesce protocol' },
    description: { zh: '切換頻率前停止接單、排空outstanding，再與PHY完成頻率切換握手。', en: 'Stop admission, drain outstanding work, and handshake a frequency change with the PHY.' },
    specs: [{ zh: 'dvfs_req後accept_enable立即關閉；outstanding=0才提出phy_change。', en: 'Disable admission after dvfs_req and request PHY change only at zero outstanding.' }, { zh: 'phy_done後重新開放並產生一拍done。', en: 'Reopen admission and pulse done after phy_done.' }],
    testGroups: [{ zh: '停止接單', en: 'Admission stop' }, { zh: '排空', en: 'Drain' }, { zh: 'PHY握手', en: 'PHY handshake' }],
    hints: [{ zh: 'RUN、DRAIN、CHANGE三態足夠；done預設每拍清零。', en: 'RUN, DRAIN, and CHANGE states are sufficient; clear done by default.' }],
    starter: `module lpddr_dvfs(input wire clk,input wire rst_n,input wire dvfs_req,input wire[3:0]outstanding,input wire phy_done,output wire accept_enable,output wire phy_change,output reg done);assign accept_enable=1;assign phy_change=0;always @(posedge clk)done<=0;endmodule`,
    referenceSolution: `module lpddr_dvfs(input wire clk,input wire rst_n,input wire dvfs_req,input wire[3:0]outstanding,input wire phy_done,output wire accept_enable,output wire phy_change,output reg done);localparam RUN=0,DRAIN=1,CHANGE=2;reg[1:0]s;assign accept_enable=s==RUN;assign phy_change=s==CHANGE;always @(posedge clk)begin if(!rst_n)begin s<=RUN;done<=0;end else begin done<=0;case(s)RUN:if(dvfs_req)s<=DRAIN;DRAIN:if(outstanding==0)s<=CHANGE;CHANGE:if(phy_done)begin s<=RUN;done<=1;end default:s<=RUN;endcase end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,req=0,pdone=0;reg[3:0]out=3;wire accept,change,done;lpddr_dvfs dut(clk,rst_n,req,out,pdone,accept,change,done);always #5 clk=~clk;${pass}initial begin repeat(2)@(posedge clk);rst_n=1;check(accept);req=1;@(posedge clk);#1;req=0;check(!accept&&!change);repeat(2)@(posedge clk);#1;check(!change);out=0;@(posedge clk);#1;check(change);pdone=1;@(posedge clk);#1;pdone=0;check(accept&&done);@(posedge clk);#1;check(!done);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'lpddr-controller-capstone', order: 17, track: 'lpddr', difficulty: 'capstone', minutes: 90, points: 560,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'LPDDR Admission/Power Capstone', en: 'LPDDR admission and power capstone' },
    description: { zh: '整合初始化、低功耗、DVFS與queue狀態，決定何時能接收request及發出DRAM command。', en: 'Integrate initialization, low power, DVFS, and queue state to decide request admission and command issue.' },
    specs: [{ zh: 'req_ready僅在init_ready、非quiesce、非sleep且queue未滿。', en: 'req_ready requires init_ready, no quiesce, no sleep, and queue space.' }, { zh: 'cmd_issue還需queue非空、timing_ok與phy_ready。', en: 'cmd_issue additionally requires a nonempty queue, timing_ok, and phy_ready.' }],
    testGroups: [{ zh: '初始化阻擋', en: 'Initialization block' }, { zh: '低功耗/DVFS阻擋', en: 'Power/DVFS block' }, { zh: '命令合法性', en: 'Command legality' }],
    hints: [{ zh: '把admission與issue拆成兩條布林方程，不要混成一個ready。', en: 'Keep admission and issue as separate Boolean equations.' }],
    starter: `module lpddr_ctrl_gate(input wire init_ready,input wire quiesce,input wire sleeping,input wire queue_full,input wire queue_empty,input wire timing_ok,input wire phy_ready,output wire req_ready,output wire cmd_issue);assign req_ready=1;assign cmd_issue=!queue_empty;endmodule`,
    referenceSolution: `module lpddr_ctrl_gate(input wire init_ready,input wire quiesce,input wire sleeping,input wire queue_full,input wire queue_empty,input wire timing_ok,input wire phy_ready,output wire req_ready,output wire cmd_issue);wire operational=init_ready&&!quiesce&&!sleeping;assign req_ready=operational&&!queue_full;assign cmd_issue=operational&&!queue_empty&&timing_ok&&phy_ready;endmodule`,
    testbench: `module tb;reg i,q,s,f,e,t,p;wire rr,ci;lpddr_ctrl_gate dut(i,q,s,f,e,t,p,rr,ci);${pass}initial begin i=0;q=0;s=0;f=0;e=0;t=1;p=1;#1;check(!rr&&!ci);i=1;#1;check(rr&&ci);f=1;#1;check(!rr&&ci);f=0;q=1;#1;check(!rr&&!ci);q=0;s=1;#1;check(!rr&&!ci);s=0;e=1;#1;check(rr&&!ci);e=0;t=0;#1;check(!ci);t=1;p=0;#1;check(!ci);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'gddr-command-parity', order: 19, track: 'gddr', difficulty: 'advanced', minutes: 45, points: 290,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'GDDR Command Parity Guard', en: 'GDDR command parity guard' },
    description: { zh: '在command/address路徑產生偶同位元並於接收端偵測錯誤，這是PHY邊界前的重要可靠度機制。', en: 'Generate even parity on the command/address path and detect corruption before the PHY boundary.' },
    specs: [{ zh: 'tx_parity使{cmd,parity}具有偶同位元；rx_error只在rx_valid且錯誤時為1。', en: 'tx_parity makes {cmd, parity} even; rx_error requires rx_valid and bad parity.' }],
    testGroups: [{ zh: '同位元產生', en: 'Parity generation' }, { zh: '單bit錯誤', en: 'Single-bit error' }, { zh: 'valid gating', en: 'Valid gating' }],
    hints: [{ zh: 'Verilog reduction XOR正適合這個問題。', en: 'Verilog reduction XOR is the right primitive.' }],
    starter: `module gddr_cmd_parity(input wire[15:0]tx_cmd,output wire tx_parity,input wire rx_valid,input wire[15:0]rx_cmd,input wire rx_parity,output wire rx_error);assign tx_parity=0;assign rx_error=0;endmodule`,
    referenceSolution: `module gddr_cmd_parity(input wire[15:0]tx_cmd,output wire tx_parity,input wire rx_valid,input wire[15:0]rx_cmd,input wire rx_parity,output wire rx_error);assign tx_parity=^tx_cmd;assign rx_error=rx_valid&&((^rx_cmd)^rx_parity);endmodule`,
    testbench: `module tb;reg[15:0]tx,rx;reg rv,rp;wire tp,err;gddr_cmd_parity dut(tx,tp,rv,rx,rp,err);${pass}initial begin tx=16'h1234;rx=tx;rv=1;#1;check((^{tx,tp})==0);rp=tp;#1;check(!err);rx[3]=~rx[3];#1;check(err);rv=0;#1;check(!err);tx=16'hffff;#1;check((^{tx,tp})==0);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'gddr-retry-queue', order: 20, track: 'gddr', difficulty: 'advanced', minutes: 65, points: 410,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'GDDR CRC Retry Ownership Queue', en: 'GDDR CRC retry ownership queue' },
    description: { zh: '送出資料後保留ownership直到ACK；NACK時重送同一payload，避免上游buffer過早覆寫。', en: 'Retain payload ownership until ACK and replay the same payload on NACK so upstream storage cannot overwrite it early.' },
    specs: [{ zh: '空queue可接受一筆；持有期間in_ready=0。', en: 'Accept one entry when empty and deassert in_ready while owned.' }, { zh: 'send在初次接受與NACK後各脈衝一拍；ACK釋放。', en: 'Pulse send on initial acceptance and after NACK; ACK releases the entry.' }],
    testGroups: [{ zh: 'payload保留', en: 'Payload retention' }, { zh: 'NACK重送', en: 'NACK replay' }, { zh: 'ACK釋放', en: 'ACK release' }],
    hints: [{ zh: 'valid bit就是ownership；send每拍預設清零。', en: 'The valid bit is ownership; clear send by default each cycle.' }],
    starter: `module gddr_retry(input wire clk,input wire rst_n,input wire in_valid,input wire[7:0]in_data,output wire in_ready,input wire ack,input wire nack,output reg send,output reg[7:0]send_data,output reg owned);assign in_ready=1;always @(posedge clk)send<=0;endmodule`,
    referenceSolution: `module gddr_retry(input wire clk,input wire rst_n,input wire in_valid,input wire[7:0]in_data,output wire in_ready,input wire ack,input wire nack,output reg send,output reg[7:0]send_data,output reg owned);assign in_ready=!owned;always @(posedge clk)begin if(!rst_n)begin owned<=0;send<=0;send_data<=0;end else begin send<=0;if(in_valid&&in_ready)begin owned<=1;send_data<=in_data;send<=1;end else if(owned&&ack)owned<=0;else if(owned&&nack)send<=1;end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,iv=0,ack=0,nack=0;reg[7:0]id=0;wire ready,send,owned;wire[7:0]sd;gddr_retry dut(clk,rst_n,iv,id,ready,ack,nack,send,sd,owned);always #5 clk=~clk;${pass}initial begin repeat(2)@(posedge clk);rst_n=1;id=8'ha5;iv=1;@(posedge clk);#1;iv=0;check(owned&&!ready&&send&&sd==8'ha5);@(posedge clk);#1;check(!send);id=8'h11;nack=1;@(posedge clk);#1;nack=0;check(send&&sd==8'ha5&&owned);ack=1;@(posedge clk);#1;ack=0;check(!owned&&ready);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'gddr-controller-capstone', order: 21, track: 'gddr', difficulty: 'capstone', minutes: 85, points: 540,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'GDDR Issue/Reliability Capstone', en: 'GDDR issue and reliability capstone' },
    description: { zh: '把direction turnaround、timing legality、retry ownership與PHY ready整合成command/data issue gate。', en: 'Combine direction turnaround, timing legality, retry ownership, and PHY readiness into a command/data issue gate.' },
    specs: [{ zh: '新transaction必須同時通過四個guard；retry可繞過new_valid但仍需PHY ready。', en: 'A new transaction must pass all four guards; retry bypasses new_valid but still requires PHY ready.' }, { zh: 'retry優先且new_accept不得同拍成立。', en: 'Retry has priority and new_accept must not assert in the same cycle.' }],
    testGroups: [{ zh: '新transaction', en: 'New transaction' }, { zh: 'guard阻擋', en: 'Guard blocking' }, { zh: 'retry優先', en: 'Retry priority' }],
    hints: [{ zh: '先決定issue_retry，再讓new_accept排除retry_pending。', en: 'Decide issue_retry first, then exclude retry_pending from new_accept.' }],
    starter: `module gddr_issue_gate(input wire new_valid,input wire timing_ok,input wire turnaround_ok,input wire retry_owned,input wire retry_pending,input wire phy_ready,output wire issue_retry,output wire new_accept);assign issue_retry=0;assign new_accept=new_valid;endmodule`,
    referenceSolution: `module gddr_issue_gate(input wire new_valid,input wire timing_ok,input wire turnaround_ok,input wire retry_owned,input wire retry_pending,input wire phy_ready,output wire issue_retry,output wire new_accept);assign issue_retry=retry_owned&&retry_pending&&phy_ready;assign new_accept=new_valid&&timing_ok&&turnaround_ok&&!retry_owned&&!retry_pending&&phy_ready;endmodule`,
    testbench: `module tb;reg v,t,u,o,r,p;wire ir,na;gddr_issue_gate dut(v,t,u,o,r,p,ir,na);${pass}initial begin v=1;t=1;u=1;o=0;r=0;p=1;#1;check(na&&!ir);t=0;#1;check(!na);t=1;u=0;#1;check(!na);u=1;o=1;r=1;#1;check(ir&&!na);p=0;#1;check(!ir&&!na);o=0;r=1;p=1;#1;check(!ir&&!na);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'pcie-tlp-router', order: 26, track: 'pcie', difficulty: 'advanced', minutes: 50, points: 320,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'PCIe TLP 類別與Malformed Router', en: 'PCIe TLP class and malformed router' },
    description: { zh: '解碼縮小版Fmt/Type並將TLP分流為posted、non-posted或completion，同時拒絕不合法組合。', en: 'Decode a reduced Fmt/Type field into posted, non-posted, or completion classes while rejecting illegal combinations.' },
    specs: [{ zh: 'type 0=MRd(non-posted)、1=MWr(posted)、2=Cpl；其他malformed。', en: 'type 0=MRd (non-posted), 1=MWr (posted), 2=Cpl; others malformed.' }, { zh: 'MWr必須has_data=1；MRd必須has_data=0。', en: 'MWr requires data; MRd forbids data.' }],
    testGroups: [{ zh: '三種路由', en: 'Three routes' }, { zh: '資料格式檢查', en: 'Data-format checks' }, { zh: '未知type', en: 'Unknown type' }],
    hints: [{ zh: '先把所有輸出清零，再依type設定唯一類別。', en: 'Clear all outputs, then set exactly one class by type.' }],
    starter: `module pcie_tlp_router(input wire valid,input wire[2:0]tlp_type,input wire has_data,output reg posted,output reg nonposted,output reg completion,output reg malformed);always @*begin posted=0;nonposted=0;completion=0;malformed=0;end endmodule`,
    referenceSolution: `module pcie_tlp_router(input wire valid,input wire[2:0]tlp_type,input wire has_data,output reg posted,output reg nonposted,output reg completion,output reg malformed);always @*begin posted=0;nonposted=0;completion=0;malformed=0;if(valid)case(tlp_type)0:if(!has_data)nonposted=1;else malformed=1;1:if(has_data)posted=1;else malformed=1;2:completion=1;default:malformed=1;endcase end endmodule`,
    testbench: `module tb;reg v,d;reg[2:0]t;wire p,np,c,m;pcie_tlp_router dut(v,t,d,p,np,c,m);${pass}initial begin v=0;t=0;d=0;#1;check({m,c,np,p}==0);v=1;#1;check(np&&!m);d=1;#1;check(m&&!np);t=1;#1;check(p&&!m);d=0;#1;check(m&&!p);t=2;#1;check(c&&!m);t=7;#1;check(m);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'pcie-replay-buffer', order: 27, track: 'pcie', difficulty: 'advanced', minutes: 70, points: 440,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'PCIe 兩筆 Replay Buffer', en: 'PCIe two-entry replay buffer' },
    description: { zh: '保存尚未ACK的DLLP sequence與payload，支援head ACK及從head開始replay。', en: 'Retain unacknowledged sequence numbers and payloads, acknowledge the head, and replay from the head.' },
    specs: [{ zh: '深度2 FIFO；push_ready在未滿時為1。', en: 'Depth-two FIFO; push_ready when not full.' }, { zh: 'ack只移除匹配head_seq的項目；replay輸出目前head。', en: 'ACK removes only a matching head sequence; replay exposes the current head.' }],
    testGroups: [{ zh: 'FIFO順序', en: 'FIFO ordering' }, { zh: '錯誤ACK忽略', en: 'Wrong ACK ignored' }, { zh: 'replay head', en: 'Replay head' }],
    hints: [{ zh: '兩個entry可用shift-on-pop簡化，而不必先寫通用RAM FIFO。', en: 'For two entries, shift on pop instead of building a generic RAM FIFO.' }],
    starter: `module pcie_replay_buf(input wire clk,input wire rst_n,input wire push,input wire[2:0]push_seq,input wire[7:0]push_data,output wire push_ready,input wire ack,input wire[2:0]ack_seq,input wire replay_req,output wire replay_valid,output wire[2:0]replay_seq,output wire[7:0]replay_data,output reg[1:0]count);assign push_ready=1;assign replay_valid=0;assign replay_seq=0;assign replay_data=0;always @(posedge clk)if(!rst_n)count<=0;endmodule`,
    referenceSolution: `module pcie_replay_buf(input wire clk,input wire rst_n,input wire push,input wire[2:0]push_seq,input wire[7:0]push_data,output wire push_ready,input wire ack,input wire[2:0]ack_seq,input wire replay_req,output wire replay_valid,output wire[2:0]replay_seq,output wire[7:0]replay_data,output reg[1:0]count);reg[2:0]s0,s1;reg[7:0]d0,d1;wire pop=ack&&(count!=0)&&(ack_seq==s0);wire put=push&&push_ready;assign push_ready=count<2;assign replay_valid=replay_req&&(count!=0);assign replay_seq=s0;assign replay_data=d0;always @(posedge clk)begin if(!rst_n)begin count<=0;s0<=0;s1<=0;d0<=0;d1<=0;end else case({put,pop})2'b10:begin if(count==0)begin s0<=push_seq;d0<=push_data;end else begin s1<=push_seq;d1<=push_data;end count<=count+1'b1;end 2'b01:begin s0<=s1;d0<=d1;count<=count-1'b1;end 2'b11:begin if(count==1)begin s0<=push_seq;d0<=push_data;end else begin s0<=s1;d0<=d1;s1<=push_seq;d1<=push_data;end end endcase end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,push=0,ack=0,rr=0;reg[2:0]ps=0,as=0;reg[7:0]pd=0;wire ready,rv;wire[2:0]rs;wire[7:0]rd;wire[1:0]cnt;pcie_replay_buf dut(clk,rst_n,push,ps,pd,ready,ack,as,rr,rv,rs,rd,cnt);always #5 clk=~clk;${pass}task put;input[2:0]s;input[7:0]d;begin @(negedge clk);push=1;ps=s;pd=d;@(posedge clk);#1;push=0;end endtask initial begin repeat(2)@(posedge clk);rst_n=1;put(1,8'haa);put(2,8'hbb);check(cnt==2&&!ready);rr=1;#1;check(rv&&rs==1&&rd==8'haa);as=7;ack=1;@(posedge clk);#1;ack=0;check(cnt==2&&rs==1);as=1;ack=1;@(posedge clk);#1;ack=0;check(cnt==1&&rs==2&&rd==8'hbb);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'pcie-completion-reorder', order: 28, track: 'pcie', difficulty: 'capstone', minutes: 80, points: 500,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'PCIe Completion In-Order Retire', en: 'PCIe completion in-order retire' },
    description: { zh: '允許兩個tag的completion亂序到達，但對上游必須依issue順序retire，展示protocol ordering與storage ownership。', en: 'Accept two tags completing out of order while retiring upstream in issue order, demonstrating protocol ordering and storage ownership.' },
    specs: [{ zh: '依序issue tag0、tag1；completion可任意順序寫入。', en: 'Issue tag0 then tag1; completions may arrive in either order.' }, { zh: 'retire_valid只在head完成時為1，retire後head前進。', en: 'retire_valid only when the head is complete, then advances.' }],
    testGroups: [{ zh: '亂序到達', en: 'Out-of-order arrival' }, { zh: '循序retire', en: 'In-order retirement' }, { zh: '資料保持', en: 'Data retention' }],
    hints: [{ zh: '保存兩個tag、done bit與data；completion以tag做CAM式比對。', en: 'Store two tags, done bits, and data; match completions by tag like a tiny CAM.' }],
    starter: `module pcie_cpl_reorder(input wire clk,input wire rst_n,input wire issue,input wire[2:0]issue_tag,input wire cpl,input wire[2:0]cpl_tag,input wire[7:0]cpl_data,input wire retire_ready,output wire retire_valid,output wire[7:0]retire_data,output reg[1:0]count);assign retire_valid=0;assign retire_data=0;always @(posedge clk)if(!rst_n)count<=0;endmodule`,
    referenceSolution: `module pcie_cpl_reorder(input wire clk,input wire rst_n,input wire issue,input wire[2:0]issue_tag,input wire cpl,input wire[2:0]cpl_tag,input wire[7:0]cpl_data,input wire retire_ready,output wire retire_valid,output wire[7:0]retire_data,output reg[1:0]count);reg[2:0]t0,t1;reg[7:0]d0,d1;reg done0,done1;wire retire=retire_valid&&retire_ready;assign retire_valid=(count!=0)&&done0;assign retire_data=d0;always @(posedge clk)begin if(!rst_n)begin count<=0;done0<=0;done1<=0;t0<=0;t1<=0;d0<=0;d1<=0;end else begin if(cpl&&count!=0)begin if(cpl_tag==t0)begin d0<=cpl_data;done0<=1;end else if(count==2&&cpl_tag==t1)begin d1<=cpl_data;done1<=1;end end if(retire)begin t0<=t1;d0<=d1;done0<=done1;done1<=0;count<=count-1'b1;end if(issue&&count<2)begin if(count==0||retire&&count==1)begin t0<=issue_tag;done0<=0;end else begin t1<=issue_tag;done1<=0;end if(!retire)count<=count+1'b1;end end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,is=0,c=0,ready=0;reg[2:0]it=0,ct=0;reg[7:0]cd=0;wire rv;wire[7:0]rd;wire[1:0]cnt;pcie_cpl_reorder dut(clk,rst_n,is,it,c,ct,cd,ready,rv,rd,cnt);always #5 clk=~clk;${pass}task issue;input[2:0]t;begin @(negedge clk);is=1;it=t;@(posedge clk);#1;is=0;end endtask task cpl;input[2:0]t;input[7:0]d;begin @(negedge clk);c=1;ct=t;cd=d;@(posedge clk);#1;c=0;end endtask initial begin repeat(2)@(posedge clk);rst_n=1;issue(1);issue(2);cpl(2,8'hb2);check(!rv);cpl(1,8'ha1);check(rv&&rd==8'ha1);ready=1;@(posedge clk);#1;ready=0;check(rv&&rd==8'hb2);ready=1;@(posedge clk);#1;check(!rv&&cnt==0);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'pcie-ltssm-recovery', order: 29, track: 'pcie', difficulty: 'advanced', minutes: 65, points: 410,
    kind: 'debug', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'PCIe LTSSM Recovery Control', en: 'PCIe LTSSM recovery control' },
    description: { zh: '建立縮小的Detect→Polling→L0→Recovery路徑，讓controller知道何時必須停止TLP並重新訓練link。', en: 'Build a reduced Detect→Polling→L0→Recovery path so the controller stops TLP traffic during link retraining.' },
    specs: [{ zh: 'detect後進Polling；training_done進L0；link_error進Recovery。', en: 'Detect enters Polling, training_done enters L0, and link_error enters Recovery.' }, { zh: 'Recovery成功回L0、失敗回Detect；link_up只在L0。', en: 'Recovery returns to L0 on success or Detect on failure; link_up only in L0.' }],
    testGroups: [{ zh: '正常建鏈', en: 'Normal link-up' }, { zh: 'recovery成功', en: 'Successful recovery' }, { zh: 'recovery失敗', en: 'Failed recovery' }],
    hints: [{ zh: 'link_up是state decode，不要另外維護一份可能不同步的flag。', en: 'Decode link_up from state instead of maintaining a second drifting flag.' }],
    starter: `module pcie_ltssm(input wire clk,input wire rst_n,input wire receiver_detect,input wire training_done,input wire link_error,input wire recovery_ok,input wire recovery_fail,output wire link_up,output reg[1:0]state);assign link_up=1;always @(posedge clk)if(!rst_n)state<=0;endmodule`,
    referenceSolution: `module pcie_ltssm(input wire clk,input wire rst_n,input wire receiver_detect,input wire training_done,input wire link_error,input wire recovery_ok,input wire recovery_fail,output wire link_up,output reg[1:0]state);localparam DETECT=0,POLL=1,L0=2,REC=3;assign link_up=state==L0;always @(posedge clk)begin if(!rst_n)state<=DETECT;else case(state)DETECT:if(receiver_detect)state<=POLL;POLL:if(training_done)state<=L0;L0:if(link_error)state<=REC;REC:if(recovery_ok)state<=L0;else if(recovery_fail)state<=DETECT;default:state<=DETECT;endcase end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,d=0,t=0,e=0,ok=0,fail=0;wire up;wire[1:0]s;pcie_ltssm dut(clk,rst_n,d,t,e,ok,fail,up,s);always #5 clk=~clk;${pass}initial begin repeat(2)@(posedge clk);rst_n=1;check(!up&&s==0);d=1;@(posedge clk);#1;d=0;check(s==1&&!up);t=1;@(posedge clk);#1;t=0;check(up&&s==2);e=1;@(posedge clk);#1;e=0;check(!up&&s==3);ok=1;@(posedge clk);#1;ok=0;check(up);e=1;@(posedge clk);#1;e=0;fail=1;@(posedge clk);#1;check(s==0&&!up);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'pcie-controller-capstone', order: 30, track: 'pcie', difficulty: 'capstone', minutes: 95, points: 600,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'PCIe Transaction Admission Capstone', en: 'PCIe transaction admission capstone' },
    description: { zh: '整合link state、flow-control credit、tag availability與replay壓力，形成non-posted transaction的接收與送出合約。', en: 'Integrate link state, flow-control credit, tag availability, and replay pressure into a non-posted transaction admission contract.' },
    specs: [{ zh: 'req_ready需link_up、credit_ok、tag_free且replay未滿。', en: 'req_ready requires link_up, credits, a free tag, and replay space.' }, { zh: 'accept只在req_valid&&req_ready；同拍產生allocate_tag與consume_credit。', en: 'accept is req_valid && req_ready and simultaneously allocates a tag and consumes credits.' }],
    testGroups: [{ zh: '四重資源條件', en: 'Four resource conditions' }, { zh: '原子接受', en: 'Atomic acceptance' }, { zh: 'link recovery阻擋', en: 'Recovery blocking' }],
    hints: [{ zh: '把所有資源視為單一atomic commit的前置條件。', en: 'Treat every resource as a prerequisite of one atomic commit.' }],
    starter: `module pcie_admission(input wire req_valid,input wire link_up,input wire credit_ok,input wire tag_free,input wire replay_space,output wire req_ready,output wire accept,output wire allocate_tag,output wire consume_credit);assign req_ready=1;assign accept=req_valid;assign allocate_tag=0;assign consume_credit=0;endmodule`,
    referenceSolution: `module pcie_admission(input wire req_valid,input wire link_up,input wire credit_ok,input wire tag_free,input wire replay_space,output wire req_ready,output wire accept,output wire allocate_tag,output wire consume_credit);assign req_ready=link_up&&credit_ok&&tag_free&&replay_space;assign accept=req_valid&&req_ready;assign allocate_tag=accept;assign consume_credit=accept;endmodule`,
    testbench: `module tb;reg v,l,c,t,r;wire ready,a,at,cc;pcie_admission dut(v,l,c,t,r,ready,a,at,cc);${pass}initial begin v=1;l=1;c=1;t=1;r=1;#1;check(ready&&a&&at&&cc);l=0;#1;check(!ready&&!a);l=1;c=0;#1;check(!a);c=1;t=0;#1;check(!a);t=1;r=0;#1;check(!a);r=1;v=0;#1;check(ready&&!a&&!at&&!cc);$display("@@PASS@@");$finish;end endmodule`,
  },
];

const trackOrder: Record<Challenge['track'], number> = { dram: 0, hbm: 1, lpddr: 2, gddr: 3, pcie: 4 };

export const controllerChallenges: Challenge[] = [...baseControllerChallenges, ...hbm4AdvancedChallenges]
  .sort((a, b) => trackOrder[a.track] - trackOrder[b.track] || a.order - b.order)
  .map((challenge, index) => ({ ...challenge, order: index + 1 }));
