import type { Localized } from './challenges';
const b=(zh:string,en:string):Localized=>({zh,en});
const check=`task check;input condition;begin if(condition!==1'b1)begin $display("@@FAIL@@ reference teaching trace");$finish;end end endtask`;
const done='$display("@@PASS@@");$finish;';
const wrap=(body:string)=>`\u0060timescale 1ns/1ps\nmodule tb;\n${check}\n${body}\nendmodule`;
type Trace={testbench:string;signals:string[];notes:Localized[]};
export const gpuReferenceTraces:Record<string,Trace>={
 'gpu-masked-simd-alu':{
  signals:['a','b','active','op','result'],
  notes:[b('這是組合電路，沒有 clk。橫軸是輸入改變後的模擬時間，不是 pipeline 拍數。','This is combinational, without clk. Time tracks input changes, not pipeline cycles.'),b('lane0：-128+127=-1；接著 -2×3=-6。active=0 或保留 opcode 時輸出零。','Lane0: -128+127=-1, then -2×3=-6. Inactive/reserved operations output zero.')],
  testbench:wrap(`reg [31:0] a,b;reg [3:0] active;reg [1:0] op;wire [63:0] result;gpu_masked_alu d(a,b,active,op,result);
initial begin a=32'h80;b=127;active=1;op=0;#5;check(result===64'hffff);a=32'hfe;b=3;op=1;#5;check(result===64'hfffa);active=0;#5;check(result===0);active=15;op=3;#5;check(result===0);${done}end`),
 },
 'gpu-elastic-pipeline':{
  signals:['clk','rst_n','flush','in_valid','in_ready','in_tag','out_ready','out_valid','out_tag','result'],
  notes:[b('15ns 的上升緣接受 A（tag=0x41）；25ns 後 A 才出現在輸出，同緣接受 B（tag=0x42）。','A (tag=0x41) is accepted at 15ns; after 25ns it appears at output while B (tag=0x42) is accepted.'),b('out_ready=0 時 A 的 result=6、tag=0x41 保持；45ns 接受 A，之後輸出 B=20（0x14）；flush 丟棄 C（tag=0x43）。','While out_ready=0, A holds result=6 and tag=0x41. A transfers at 45ns, followed by B=20 (0x14); flush discards C (tag=0x43).')],
  testbench:wrap(`reg clk=0;always #5 clk=~clk;reg rst_n=0,flush=0,in_valid=0,out_ready=0;reg [31:0] a=2,b=3;reg [3:0] active=1;reg [7:0] in_tag=8'h41;wire in_ready,out_valid;wire [63:0] result;wire [7:0] out_tag;
gpu_elastic_pipeline d(clk,rst_n,flush,in_valid,in_ready,a,b,active,in_tag,out_valid,out_ready,result,out_tag);
initial begin @(negedge clk);rst_n=1;in_valid=1;@(posedge clk);#1;check(!out_valid);@(negedge clk);a=4;b=5;in_tag=8'h42;@(posedge clk);#1;check(out_valid&&result===6&&out_tag===8'h41);@(negedge clk);in_valid=0;@(posedge clk);#1;check(!in_ready&&result===6&&out_tag===8'h41);@(negedge clk);out_ready=1;@(posedge clk);#1;check(out_valid&&result===20&&out_tag===8'h42);@(negedge clk);@(posedge clk);#1;check(!out_valid);@(negedge clk);in_valid=1;in_tag=8'h43;a=3;b=4;@(posedge clk);#1;@(negedge clk);in_valid=0;flush=1;@(posedge clk);#1;check(!out_valid&&!in_ready);@(negedge clk);flush=0;@(posedge clk);#1;check(!out_valid);@(negedge clk);${done}end`),
 },
 'gpu-register-scoreboard':{
  signals:['clk','rst_n','issue_valid','src0','dst','wb_valid','wb_dst','issue_ready','busy'],
  notes:[b('15ns 接受寫 r2，busy=04；之後讀 r2 的指令被 RAW 阻擋。','At 15ns a writer to r2 allocates busy=04; a subsequent reader of r2 is RAW-blocked.'),b('35ns 舊 r2 writeback 與新 r2 發射同拍，busy 仍為 04；45ns 只有 writeback，才清成 00。','At 35ns old writeback and new r2 issue coincide, keeping busy=04. At 45ns writeback alone clears busy to 00.')],
  testbench:wrap(`reg clk=0;always #5 clk=~clk;reg rst_n=0,flush=0,issue_valid=1,dst_we=1,wb_valid=0;reg [2:0] src0=0,src1=1,dst=2,wb_dst=2;wire issue_ready;wire [7:0] busy;
gpu_scoreboard d(clk,rst_n,flush,issue_valid,src0,src1,dst,dst_we,wb_valid,wb_dst,issue_ready,busy);
initial begin @(negedge clk);rst_n=1;@(posedge clk);#1;check(busy===4);@(negedge clk);src0=2;#1;check(!issue_ready);@(posedge clk);#1;check(busy===4);@(negedge clk);src0=0;wb_valid=1;#1;check(issue_ready);@(posedge clk);#1;check(busy===4);@(negedge clk);issue_valid=0;@(posedge clk);#1;check(busy===0);@(negedge clk);wb_valid=0;flush=1;@(posedge clk);#1;check(busy===0);@(negedge clk);${done}end`),
 },
 'gpu-ready-warp-scheduler':{
  signals:['clk','rst_n','resident','dep_blocked','fu_ready','commit','grant','rr'],
  notes:[b('group0 blocked，因此 rr=0 時先選 group1；15ns commit=0，rr 不能動。','Group0 is blocked, so rr=0 selects group1. No commit at 15ns means rr must hold.'),b('25ns commit group1 後 rr=2；再跳過 blocked group2，選 group3，下一緣把 rr 繞回 0。','Committing group1 at 25ns advances rr to 2; blocked group2 is skipped for group3, whose commit wraps rr to 0.')],
  testbench:wrap(`reg clk=0;always #5 clk=~clk;reg rst_n=0,commit=0;reg [3:0] resident=15,dep_blocked=1,barrier=0,fu_ready=15;wire [3:0] grant;wire [1:0] rr;gpu_scheduler d(clk,rst_n,resident,dep_blocked,barrier,fu_ready,commit,grant,rr);
initial begin @(negedge clk);rst_n=1;#1;check(grant===2);@(posedge clk);#1;check(rr===0);@(negedge clk);commit=1;@(posedge clk);#1;check(rr===2);@(negedge clk);dep_blocked=4;#1;check(grant===8);@(posedge clk);#1;check(rr===0);@(negedge clk);resident=0;commit=0;#1;check(grant===0);@(negedge clk);resident=15;dep_blocked=0;commit=1;@(posedge clk);#1;check(rr===1);@(negedge clk);rst_n=0;@(posedge clk);#1;check(rr===0&&grant===0);@(negedge clk);${done}end`),
 },
 'gpu-divergence-sequencer':{
  signals:['clk','rst_n','flush','req_valid','req_ready','out_ready','out_valid','path_mask','path_else','last','out_tag'],
  notes:[b('15ns 接受 active=f、predicate=5：先輸出 then mask=5，last=0；背壓期間保持。','At 15ns active=f/predicate=5 produces then mask=5 and last=0, held through backpressure.'),b('35ns 接受 then 後改輸出 else mask=a、last=1；45ns 接受 else 後清空。下一筆單路分支被 flush 丟棄。','After the then transfer at 35ns, else mask=a is last. Its 45ns transfer empties the block. Flush discards the next one-path branch.')],
  testbench:wrap(`reg clk=0;always #5 clk=~clk;reg rst_n=0,flush=0,req_valid=0,out_ready=0;reg [3:0] active=15,predicate=5;reg [7:0] req_tag=8'h41;wire req_ready,out_valid,path_else,last;wire [3:0] path_mask;wire [7:0] out_tag;gpu_divergence d(clk,rst_n,flush,req_valid,req_ready,active,predicate,req_tag,out_valid,out_ready,path_mask,path_else,last,out_tag);
initial begin @(negedge clk);rst_n=1;req_valid=1;@(posedge clk);#1;check(out_valid&&path_mask===5&&!last&&!path_else);@(negedge clk);req_valid=0;@(posedge clk);#1;check(path_mask===5&&out_tag===8'h41);@(negedge clk);out_ready=1;@(posedge clk);#1;check(path_mask===10&&last&&path_else);@(negedge clk);@(posedge clk);#1;check(!out_valid&&req_ready);@(negedge clk);req_valid=1;active=3;predicate=15;@(posedge clk);#1;check(path_mask===3&&last);@(negedge clk);req_valid=0;flush=1;@(posedge clk);#1;check(!out_valid);@(negedge clk);${done}end`),
 },
 'gpu-occupancy-budget':{
  signals:['regs_per_thread','smem_per_group','groups','threads','limiting'],
  notes:[b('這是組合配置計算，不是 clocked pipeline：regs=8/shared=0 得到 2 groups；regs=4/shared=8 得到 4 groups。','This is combinational configuration logic: regs=8/shared=0 allows 2 groups; regs=4/shared=8 allows 4.'),b('regs=0 為非法而全零；shared=40 超過 budget32，得到 0 groups，limiting=4。','regs=0 is invalid and outputs zero; shared=40 exceeds budget32, giving zero groups with limiting=4.')],
  testbench:wrap(`reg [4:0] regs_per_thread=8;reg [5:0] smem_per_group=0;wire [2:0] groups,limiting;wire [4:0] threads;gpu_occupancy d(regs_per_thread,smem_per_group,groups,threads,limiting);
initial begin #10;check(groups===2&&threads===8&&limiting===2);regs_per_thread=4;smem_per_group=8;#10;check(groups===4&&limiting===7);regs_per_thread=0;#10;check(groups===0&&limiting===0);regs_per_thread=4;smem_per_group=40;#10;check(groups===0&&limiting===4);regs_per_thread=16;smem_per_group=0;#10;check(groups===1&&threads===4);${done}end`),
 },
 'gpu-memory-coalescer':{
  signals:['addresses','active','align_error','seg_valid','count','segments'],
  notes:[b('0/4/8/12 合成 1 個 segment；0/16/0/32 合成依序 0、1、2 三個 segment。','0/4/8/12 merge into one segment; 0/16/0/32 produce segments 0,1,2.'),b('active lane 位址改為 18 會整筆拒絕；同一個不對齊位址若屬 inactive lane，就不影響有效 lane。','An active address 18 rejects the whole request; the same misaligned inactive lane has no effect.')],
  testbench:wrap(`reg [63:0] addresses=64'h000c000800040000;reg [3:0] active=15;wire [47:0] segments;wire [3:0] seg_valid;wire [2:0] count;wire align_error;gpu_coalescer d(addresses,active,segments,seg_valid,count,align_error);
initial begin #10;check(count===1&&seg_valid===1&&segments===0);addresses=64'h0020000000100000;#10;check(count===3&&segments[11:0]===0&&segments[23:12]===1&&segments[35:24]===2);addresses=64'h00120000;active=3;#10;check(align_error&&count===0&&segments===0);active=1;#10;check(!align_error&&count===1);active=0;#10;check(count===0&&seg_valid===0);${done}end`),
 },
 'gpu-shared-bank-conflicts':{
  signals:['addresses','active','rounds','unique_words','conflict_lanes'],
  notes:[b('0/4/8/12 分散四 bank，所以一輪；0/0/16/32 都在 bank0，但只有三個 distinct words，所以三輪。','0/4/8/12 use four banks in one round; 0/0/16/32 share bank0 with three distinct words, requiring three rounds.'),b('全部讀 word0 是 broadcast，仍只需一輪；active=0 則零輪。','All reads of word0 broadcast in one round; active=0 needs zero rounds.')],
  testbench:wrap(`reg [31:0] addresses=32'h0c080400;reg [3:0] active=15;wire [2:0] rounds,unique_words;wire [3:0] conflict_lanes;gpu_bank_conflicts d(addresses,active,rounds,unique_words,conflict_lanes);
initial begin #10;check(rounds===1&&unique_words===4&&conflict_lanes===0);addresses=32'h20100000;#10;check(rounds===3&&unique_words===3&&conflict_lanes===15);addresses=0;#10;check(rounds===1&&unique_words===1&&conflict_lanes===0);active=0;#10;check(rounds===0);addresses=32'h00100000;active=5;#10;check(rounds===2&&unique_words===2&&conflict_lanes===5);${done}end`),
 },
 'gpu-stall-counters':{
  signals:['clk','rst_n','clear','sample_enable','issued','resident_any','eligible_any','memory_wait','issue_cycles','idle_cycles','memory_cycles','dependency_cycles','unit_cycles'],
  notes:[b('15/25/35/45/55ns 五個上升緣分別累加 idle、issue、memory、dependency、unit，不能同拍多算。','The 15/25/35/45/55ns edges count idle, issue, memory, dependency, and unit respectively, exclusively.'),b('65ns sample_enable=0，全部保持；75ns clear=1，全清零。飽和另由完整 regression 的參數化案例驗證。','At 65ns sampling is disabled and all counters hold; clear zeroes them at 75ns. Full regression separately verifies parameterized saturation.')],
  testbench:wrap(`reg clk=0;always #5 clk=~clk;reg rst_n=0,clear=0,sample_enable=0,issued=0,resident_any=0,eligible_any=0,memory_wait=0;wire [15:0] issue_cycles,idle_cycles,memory_cycles,dependency_cycles,unit_cycles;gpu_stall_counters d(clk,rst_n,clear,sample_enable,issued,resident_any,eligible_any,memory_wait,issue_cycles,idle_cycles,memory_cycles,dependency_cycles,unit_cycles);
initial begin @(negedge clk);rst_n=1;sample_enable=1;@(posedge clk);#1;check(idle_cycles===1);@(negedge clk);issued=1;@(posedge clk);#1;check(issue_cycles===1&&idle_cycles===1);@(negedge clk);issued=0;resident_any=1;memory_wait=1;@(posedge clk);#1;check(memory_cycles===1);@(negedge clk);memory_wait=0;@(posedge clk);#1;check(dependency_cycles===1);@(negedge clk);eligible_any=1;@(posedge clk);#1;check(unit_cycles===1);@(negedge clk);sample_enable=0;@(posedge clk);#1;check(unit_cycles===1);@(negedge clk);clear=1;@(posedge clk);#1;check(issue_cycles===0&&idle_cycles===0&&memory_cycles===0&&dependency_cycles===0&&unit_cycles===0);@(negedge clk);${done}end`),
 },
};
