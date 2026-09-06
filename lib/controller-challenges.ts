import type { Challenge } from './challenges';

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

export const controllerChallenges: Challenge[] = [
  {
    id: 'dram-address-map', order: 27, track: 'dram', difficulty: 'beginner', minutes: 18, points: 140,
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
    id: 'dram-bank-fsm', order: 28, track: 'dram', difficulty: 'intermediate', minutes: 30, points: 210,
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
    id: 'dram-trcd-guard', order: 29, track: 'dram', difficulty: 'intermediate', minutes: 25, points: 190,
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
    id: 'dram-frfcfs-select', order: 30, track: 'dram', difficulty: 'advanced', minutes: 35, points: 260,
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
    id: 'dram-refresh-deadline', order: 31, track: 'dram', difficulty: 'advanced', minutes: 35, points: 270,
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
    id: 'dram-write-drain', order: 32, track: 'dram', difficulty: 'intermediate', minutes: 25, points: 190,
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
    id: 'hbm-pseudo-channel-map', order: 33, track: 'hbm', difficulty: 'intermediate', minutes: 25, points: 190,
    kind: 'build', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'HBM Pseudo-Channel Mapping', en: 'HBM pseudo-channel mapping' },
    description: { zh: '在縮小的8-channel HBM模型中切割channel、pseudo-channel、bank-group、bank、row與column。', en: 'Decode channel, pseudo-channel, bank group, bank, row, and column in a reduced eight-channel HBM model.' },
    specs: [{ zh: 'column[3:0]、bank[5:4]、BG[7:6]、PC[8]、channel[11:9]、row[19:12]。', en: 'column[3:0], bank[5:4], BG[7:6], PC[8], channel[11:9], row[19:12].' }, { zh: '這是教學profile，不是公開重製JEDEC完整mapping。', en: 'This is an educational profile, not a reproduction of a complete JEDEC mapping.' }],
    testGroups: [{ zh: 'PC邊界', en: 'PC boundary' }, { zh: 'channel/BG/bank', en: 'Channel/BG/bank' }, { zh: 'row/column', en: 'Row/column' }],
    hints: [{ zh: '把每個欄位直接對應到規格指定的bit slice。', en: 'Map each field directly to the specified bit slice.' }],
    starter: `module hbm_map(input wire[19:0]addr,output wire[2:0]channel,output wire pc,output wire[1:0]bg,output wire[1:0]bank,output wire[7:0]row,output wire[3:0]column);/* TODO */endmodule`,
    referenceSolution: `module hbm_map(input wire[19:0]addr,output wire[2:0]channel,output wire pc,output wire[1:0]bg,output wire[1:0]bank,output wire[7:0]row,output wire[3:0]column);assign column=addr[3:0];assign bank=addr[5:4];assign bg=addr[7:6];assign pc=addr[8];assign channel=addr[11:9];assign row=addr[19:12];endmodule`,
    testbench: `module tb;reg[19:0]a;wire[2:0]ch;wire pc;wire[1:0]bg,bk;wire[7:0]row;wire[3:0]col;integer i;hbm_map dut(a,ch,pc,bg,bk,row,col);${pass}task t;input[19:0]v;begin a=v;#1;check({row,ch,pc,bg,bk,col}===v);end endtask initial begin t(0);t(20'hfffff);t(20'ha55aa);for(i=0;i<64;i=i+1)t(i*20'h321);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'hbm-bankgroup-tccd', order: 34, track: 'hbm', difficulty: 'advanced', minutes: 35, points: 270,
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
    id: 'lpddr-power-sequence', order: 35, track: 'lpddr-gddr', difficulty: 'advanced', minutes: 45, points: 320,
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
    id: 'gddr-turnaround-guard', order: 36, track: 'lpddr-gddr', difficulty: 'intermediate', minutes: 28, points: 210,
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
    id: 'pcie-credit-manager', order: 37, track: 'pcie', difficulty: 'intermediate', minutes: 30, points: 230,
    kind: 'debug', judge: 'simulation', language: 'Verilog-2005',
    title: { zh: 'PCIe Flow-Control Credit Manager', en: 'PCIe flow-control credit manager' },
    description: { zh: '只有header與data credit都足夠時才能送出TLP；收到Flow Control update後補回credit。', en: 'Transmit a TLP only when both header and data credits are available, and replenish them from flow-control updates.' },
    specs: [{ zh: 'tx_grant = tx_valid且兩種credit都足夠。', en: 'tx_grant requires tx_valid and sufficient credits of both types.' }, { zh: 'grant後扣除成本，不得underflow。', en: 'Subtract costs on grant without underflow.' }],
    testGroups: [{ zh: '足夠credit', en: 'Sufficient credits' }, { zh: '任一不足皆阻擋', en: 'Block either shortage' }, { zh: 'FC更新', en: 'FC update' }],
    hints: [{ zh: 'grant由目前計數器組合判斷；sequential block只在grant時扣除。', en: 'Derive grant from current counters and subtract only on grant.' }],
    starter: `module pcie_credits(input wire clk,input wire rst_n,input wire tx_valid,input wire[3:0]tx_h_cost,input wire[7:0]tx_d_cost,input wire fc_valid,input wire[3:0]fc_h_add,input wire[7:0]fc_d_add,output wire tx_grant,output reg[4:0]h_credit,output reg[8:0]d_credit);assign tx_grant=tx_valid;always @(posedge clk)if(!rst_n)begin h_credit<=4;d_credit<=16;end endmodule`,
    referenceSolution: `module pcie_credits(input wire clk,input wire rst_n,input wire tx_valid,input wire[3:0]tx_h_cost,input wire[7:0]tx_d_cost,input wire fc_valid,input wire[3:0]fc_h_add,input wire[7:0]fc_d_add,output wire tx_grant,output reg[4:0]h_credit,output reg[8:0]d_credit);assign tx_grant=tx_valid&&(h_credit>=tx_h_cost)&&(d_credit>=tx_d_cost);always @(posedge clk)begin if(!rst_n)begin h_credit<=4;d_credit<=16;end else begin if(tx_grant)begin h_credit<=h_credit-tx_h_cost;d_credit<=d_credit-tx_d_cost;end if(fc_valid)begin h_credit<=h_credit+fc_h_add;d_credit<=d_credit+fc_d_add;end end end endmodule`,
    testbench: `module tb;reg clk=0,rst_n=0,tv=0,fv=0;reg[3:0]hc=0,ha=0;reg[7:0]dc=0,da=0;wire grant;wire[4:0]h;wire[8:0]d;pcie_credits dut(clk,rst_n,tv,hc,dc,fv,ha,da,grant,h,d);always #5 clk=~clk;${pass}
initial begin repeat(2)@(posedge clk);rst_n=1;#1;check(h==4&&d==16);tv=1;hc=2;dc=8;#1;check(grant);@(posedge clk);#1;tv=0;check(h==2&&d==8);tv=1;hc=3;dc=1;#1;check(!grant);tv=0;fv=1;ha=4;da=8;@(posedge clk);#1;fv=0;check(h==6&&d==16);$display("@@PASS@@");$finish;end endmodule`,
  },
  {
    id: 'pcie-tag-tracker', order: 38, track: 'pcie', difficulty: 'advanced', minutes: 35, points: 270,
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
    id: 'pcie-replay-timer', order: 39, track: 'pcie', difficulty: 'advanced', minutes: 35, points: 280,
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
    id: 'controller-tag-completion', order: 40, track: 'verification', difficulty: 'advanced', minutes: 35, points: 280,
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
];
