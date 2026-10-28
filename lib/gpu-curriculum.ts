import type { Challenge, Localized } from './challenges';
import type { LabSpec } from './lab-specs';
import type { LabContext } from './architectures';

const b = (zh: string, en: string): Localized => ({ zh, en });
const sync = b('單一 clk，上升緣更新；rst_n 為同步低有效 reset。TB 在下降緣驅動，上升緣後觀察，避免 race。', 'Single rising-edge clk; rst_n is synchronous active-low reset. The testbench drives falling edges and observes after rising edges to avoid races.');
const comb = b('純組合電路，沒有內部狀態；輸入改變後等待組合邏輯穩定再取樣。', 'Combinational circuit without state; sample after combinational settling.');
const reset = { clk: b('模組時脈。', 'Module clock.'), rst_n: b('同步低有效 reset。', 'Synchronous active-low reset.') };
const flushPort = { flush: b('同步清空；優先於正常提交，該緣不接受新工作。', 'Synchronous clear, above normal commit; no new work is accepted on that edge.') };
const check = `task check;
 input condition;
 begin
  if (condition !== 1'b1) begin
   $display("@@FAIL@@ check failed at time %0t (including X/Z)", $time); $finish;
  end
 end
endtask`;
const pass = '$display("@@PASS@@"); $finish;';
type Entry = { id: string; name: Localized; block: string; purpose: Localized; ports: Record<string, Localized>; rules: Localized[]; examples: [string, Localized, Localized][]; review: Localized[]; header: string; body: string; tb: string; sequential?: boolean; flush?: boolean; tests: Localized[]; hints: Localized[]; minutes?: number };
const scope = b('這是可執行的縮小教學模型，不代表 NVIDIA、AMD、Arm 或聯發科的實際微架構，也不是完整 GPU。資料寬度、群組大小及交易粒度皆由本題明訂。', 'This is an executable reduced teaching model, not the implementation of NVIDIA, AMD, Arm, or MediaTek and not a complete GPU. Widths, group size, and transaction granularity are defined by this exercise.');

const entries: Entry[] = [
  {
    id: 'gpu-masked-simd-alu', name: b('SIMD：四 lane 遮罩運算單元', 'SIMD: four-lane masked ALU'), block: 'alu',
    purpose: b('同一個 opcode 控制四個 lane，各 lane 有自己的 signed operand；用 active mask 控制有效結果。先做對位寬與符號，再談 pipeline。', 'One opcode controls four lanes with independent signed operands. An active mask gates results. Establish width and signedness before pipelining.'),
    header: `module gpu_masked_alu(input wire [31:0] a, input wire [31:0] b, input wire [3:0] active, input wire [1:0] op, output reg [63:0] result);`,
    ports: { a: b('lane i = a[i*8 +: 8]，signed 8-bit。lane 0 位於最低位。', 'Lane i = a[i*8 +: 8], signed 8-bit; lane 0 is least significant.'), b: b('同 a 的四個 signed 8-bit operand。', 'Four signed 8-bit operands, packed like a.'), active: b('active[i]=1 才輸出該 lane 計算值。', 'active[i]=1 enables the lane result.'), op: b('0=加法，1=乘法，2=signed max，3=保留並輸出零。', '0=add, 1=multiply, 2=signed max, 3=reserved, outputs zero.'), result: b('四個 signed 16-bit 結果；inactive lane 必為 0；不飽和、不截成 8-bit。', 'Four signed 16-bit results; inactive lanes are zero, without saturation or 8-bit truncation.') },
    rules: [b('加法先 sign-extend 到 16-bit；乘法保留完整 16-bit；max 也要 sign-extend。', 'Sign-extend additions to 16 bits, preserve full 16-bit products, and sign-extend max results.'), b('SIMD 描述運算組織；本題沒有 thread PC、warp scheduler、SIMT reconvergence。', 'SIMD describes execution organization; this block has no thread PC, warp scheduler, or SIMT reconvergence.')],
    examples: [['settle', b('lane0 a=-128、b=127；active=0001；op=add。', 'Lane0 a=-128, b=127; active=0001; op=add.'), b('result[15:0]=16\'hffff (-1)，其餘為 0。', 'result[15:0]=16\'hffff (-1), all other lanes zero.')]],
    review: [b('為什麼 $signed 不能補救已在 8-bit 截掉的進位？', 'Why can a signed cast not recover carry already truncated to 8 bits?'), b('SIMT 的 thread 數為什麼不一定等於 ALU lane 數？', 'Why need the SIMT thread-group size not equal the ALU lane count?')],
    hints: [b('先抽出 signed lane，再以 16-bit 暫存變數運算。', 'Extract signed lanes, then use 16-bit temporaries.'), b('先將 result 整體設零，再覆寫 active lanes，避免 latch。', 'Default the entire result to zero before overriding active lanes, avoiding latches.')],
    tests: [b('四個 opcode、負數、極值、inactive lane、隨機向量。', 'All opcodes, negative values, extremes, inactive lanes, and random vectors.')],
    body: `integer i; reg signed [7:0] x,y; reg signed [15:0] sx,sy;
always @* begin
 result=0; x=0; y=0; sx=0; sy=0;
 for(i=0;i<4;i=i+1) begin
  x=a[i*8+:8]; y=b[i*8+:8]; sx=x; sy=y;
  if(active[i]) case(op)
   0: result[i*16+:16]=sx+sy;
   1: result[i*16+:16]=sx*sy;
   2: result[i*16+:16]=(sx>sy)?sx:sy;
   default: result[i*16+:16]=0;
  endcase
 end
end`,
    tb: `reg [31:0] a,b; reg [3:0] active; reg [1:0] op; wire [63:0] result;
gpu_masked_alu d(a,b,active,op,result);
integer n,i,k,x,y,z; reg [63:0] expected_result;
initial begin
 for(n=0;n<260;n=n+1) begin
 a=$random; b=$random; active=n%16; op=n%4;
 if(n<4) begin a=32'h807fff01; b=32'hff807f7f; active=15; end
 #1; expected_result=0;
 for(i=0;i<4;i=i+1) begin
 x=(a>>(8*i))&255; if(x>=128)x=x-256;
 y=(b>>(8*i))&255; if(y>=128)y=y-256;
 case(op) 0:z=x+y; 1:z=x*y; 2:z=(x>y)?x:y; default:z=0; endcase
 if(active[i])expected_result[i*16+:16]=z;
 end
 check(result===expected_result);
 end
 ${pass}
end`,
  },
  {
    id: 'gpu-elastic-pipeline', name: b('Shader datapath：可停頓乘法流水線', 'Shader datapath: elastic multiply pipeline'), block: 'alu', sequential: true, flush: true, minutes: 65,
    purpose: b('將四 lane signed 乘法做成兩級 elastic pipeline，傳遞 tag 與 active mask。下游停頓時不能覆蓋未取走的結果。', 'Build a two-stage elastic four-lane signed multiplier with tag and active mask. Backpressure must never overwrite an unconsumed result.'),
    header: `module gpu_elastic_pipeline(input wire clk, input wire rst_n, input wire flush, input wire in_valid, output wire in_ready, input wire [31:0] a, input wire [31:0] b, input wire [3:0] active, input wire [7:0] in_tag, output wire out_valid, input wire out_ready, output reg [63:0] result, output reg [7:0] out_tag);`,
    ports: { ...reset, ...flushPort, in_valid: b('輸入有效；未握手時 producer 必須保持 operand、mask、tag。', 'Input valid; producer holds operands, mask, and tag until accepted.'), in_ready: b('stage0 可接收且 rst_n=1、flush=0。', 'Stage0 can accept, with rst_n=1 and flush=0.'), a: b('四個 packed signed 8-bit operand。', 'Four packed signed 8-bit operands.'), b: b('與 a 同格式。', 'Same packing as a.'), active: b('四 lane mask；inactive product=0。', 'Four-lane mask; inactive products are zero.'), in_tag: b('隨資料流傳遞的 8-bit transaction tag。', '8-bit transaction tag traveling with the data.'), out_valid: b('stage1 有未取走結果；reset/flush 時為 0。', 'Stage1 holds an unconsumed result; zero during reset/flush.'), out_ready: b('下游願意在本上升緣接收。', 'Consumer accepts on this rising edge.'), result: b('四個 16-bit 乘積；out_valid && !out_ready 時保持。', 'Four 16-bit products; held when out_valid && !out_ready.'), out_tag: b('與 result 對應；停頓時保持。無效時不要求特定值。', 'Tag matching result; stable during stalls. Unspecified when invalid.') },
    rules: [b('stage1_ready = !v1 || out_ready；stage0_ready = !v0 || stage1_ready。只有 ready 的 stage 能更新 valid 與 payload。', 'stage1_ready = !v1 || out_ready; stage0_ready = !v0 || stage1_ready. Only ready stages update valid and payload.'), b('E0 接受的 input，在無停頓時 E1 後 out_valid=1，最早 E2 被下游握手。穩態 II=1，容量兩筆。', 'Input accepted at E0 becomes out_valid after E1 and can handshake at E2 at the earliest. Steady-state II=1, capacity two.'), b('reset 或 flush 清除兩級 valid；禁止幽靈輸出。flush 當拍不接受新 input。', 'Reset or flush clears both valid bits, preventing ghost outputs. No input is accepted during flush.')],
    examples: [['E0', b('in_valid=1、in_ready=1、tag=A。', 'in_valid=1, in_ready=1, tag=A.'), b('A 進 stage0；尚無 A 的 output。', 'A enters stage0; no A output yet.')], ['E1', b('out_ready=0。', 'out_ready=0.'), b('A 進 stage1，out_valid=1；可再接受 B。', 'A enters stage1, out_valid=1; B can also be accepted.')], ['E2–E3', b('stage0 也已滿，out_ready=0。', 'Stage0 also full, out_ready=0.'), b('in_ready=0；A 的 tag/result 不變。', 'in_ready=0; A tag/result stay unchanged.')], ['E4', b('out_ready=1。', 'out_ready=1.'), b('A 握手；B 可同緣前移，不能遺失。', 'A is consumed; B can advance on the same edge without loss.')]],
    review: [b('latency、II、capacity 分別是多少？ready 反向鏈會形成什麼 timing path？', 'What are latency, II, and capacity? What timing path does the backward ready chain create?'), b('flush 與 output handshake 同拍時，合約如何定義？', 'What does the contract specify for simultaneous flush and output handshake?')],
    hints: [b('先畫 v0/v1 兩個狀態與兩個 enable，別用 in_valid 直接覆寫 result。', 'Draw v0/v1 and their enables; do not overwrite result directly with in_valid.'), b('stage1 使用舊 stage0；nonblocking assignment 可同拍前移。', 'Stage1 uses old stage0; nonblocking assignments support simultaneous advancement.')],
    tests: [b('長停頓穩定性、滿速流水、bubble、tag/資料順序、flush 丟棄及重新開始。', 'Long stalls, full-rate flow, bubbles, ordered tags/data, flush discard and restart.')],
    body: `reg v0,v1; reg [31:0] a0,b0; reg [3:0] m0; reg [7:0] tag0;
wire ready1=!v1||out_ready; wire ready0=!v0||ready1;
assign in_ready=rst_n&&!flush&&ready0; assign out_valid=rst_n&&!flush&&v1;
integer i; reg signed [15:0] x,y;
always @(posedge clk) begin
 if(!rst_n || flush) begin v0<=0;v1<=0;a0<=0;b0<=0;m0<=0;tag0<=0;result<=0;out_tag<=0; end
 else begin
  if(ready1) begin
   v1<=v0;
   if(v0) begin
    out_tag<=tag0;
    for(i=0;i<4;i=i+1) begin
     x=$signed(a0[i*8+:8]); y=$signed(b0[i*8+:8]);
     result[i*16+:16]<=m0[i]?x*y:16'b0;
    end
   end
  end
  if(ready0) begin v0<=in_valid; if(in_valid) begin a0<=a;b0<=b;m0<=active;tag0<=in_tag; end end
 end
end`,
    tb: `reg clk=0; always #5 clk=~clk;
reg rst_n=0,flush=0,in_valid=0,out_ready=0; reg [31:0] a=0,b=0; reg [3:0] active=0; reg [7:0] in_tag=0;
wire in_ready,out_valid; wire [63:0] result; wire [7:0] out_tag;
gpu_elastic_pipeline d(clk,rst_n,flush,in_valid,in_ready,a,b,active,in_tag,out_valid,out_ready,result,out_tag);
reg [63:0] queue[0:1023]; reg [7:0] tags[0:1023]; integer head=0,tail=0,n,i,x,y; reg [63:0] prod,held; reg [7:0] heldtag; reg stalled=0;
always @(posedge clk) begin
 if(!rst_n || flush) begin head=0;tail=0;stalled=0; end
 else begin
  if(stalled) begin check(out_valid); check(result===held && out_tag===heldtag); end
  if(out_valid && out_ready) begin check(head<tail);check(result===queue[head] && out_tag===tags[head]); head=head+1; end
  if(in_valid && in_ready) begin
   prod=0;
   for(i=0;i<4;i=i+1) begin
    x=(a>>(8*i))&255;if(x>=128)x=x-256;y=(b>>(8*i))&255;if(y>=128)y=y-256;
    if(active[i])prod[i*16+:16]=x*y;
   end
   queue[tail]=prod; tags[tail]=in_tag;tail=tail+1;
  end
  stalled=out_valid&&!out_ready; held=result;heldtag=out_tag;
 end
end
initial begin
 repeat(2) @(negedge clk); rst_n=1;
 for(n=0;n<160;n=n+1) begin
  @(negedge clk);
  // Change payload only after the previous input was accepted, or when idle.
  if(!in_valid || in_ready) begin in_valid=(n%5!=0);a=$random;b=$random;active=n%16;in_tag=n; end
  out_ready=(n%13>5);flush=(n==63);
 end
 @(negedge clk); flush=0;out_ready=1;
 // Complete any input held by the producer, then stop offering inputs.
 while(in_valid && !in_ready) @(negedge clk);
 @(negedge clk);in_valid=0;
 repeat(5) @(negedge clk);
 check(head==tail);check(!out_valid); ${pass}
end`,
  },
  {
    id: 'gpu-register-scoreboard', name: b('Scoreboard：RAW／WAW 與同拍 writeback', 'Scoreboard: RAW/WAW and same-cycle writeback'), block: 'scoreboard', sequential: true, flush: true,
    purpose: b('以 8-bit busy bitmap 追蹤八個 architectural register 的尚未完成寫入。練習相依性與同拍 clear/set 優先順序。', 'Track pending writes to eight architectural registers with an 8-bit busy bitmap. Practice dependencies and same-cycle clear/set priority.'),
    header: `module gpu_scoreboard(input wire clk,input wire rst_n,input wire flush,input wire issue_valid,input wire [2:0] src0,input wire [2:0] src1,input wire [2:0] dst,input wire dst_we,input wire wb_valid,input wire [2:0] wb_dst,output wire issue_ready,output reg [7:0] busy);`,
    ports: { ...reset,...flushPort,issue_valid:b('候選指令有效；與 issue_ready 同為 1 才提交。','Candidate instruction valid; commits only with issue_ready.'),src0:b('第一個來源 register，總是參與檢查。','First source register; always checked.'),src1:b('第二個來源 register，總是參與檢查。','Second source register; always checked.'),dst:b('目的 register，dst_we=1 才檢查／設 busy。','Destination register; checked/set only if dst_we=1.'),dst_we:b('是否寫回目的 register。','Whether this instruction writes a destination.'),wb_valid:b('本緣有已完成寫回；可先解除 busy。','A writeback completes on this edge; may release busy immediately.'),wb_dst:b('完成寫回的 register index。','Completing writeback register index.'),issue_ready:b('reset/flush 時為 0；否則 effective busy 無 RAW 與 WAW 時為 1。','Zero during reset/flush; otherwise one when effective busy has no RAW or WAW hazard.'),busy:b('目前已註冊的 busy bitmap。bit0 也是一般 register，不是固定零。','Current registered busy bitmap. Bit0 is ordinary, not a constant-zero register.')},
    rules:[b('effective = busy 清掉本拍 wb_dst。以 effective 檢查 src0/src1 的 RAW 和 dst 的 WAW。此簡化模型不處理 WAR。','Effective busy clears this cycle’s wb_dst. Check sources for RAW and destination for WAW against it. This reduced model does not track WAR.'),b('next_busy 先 clear writeback，再 set 已提交且 dst_we 的 dst；同 register 同拍 clear/set 必須 set 勝。','Next busy clears writeback first, then sets a committed destination. Set wins when both target the same register.'),b('同拍使用 writeback 的資料，假設 register file 已有 forwarding／相容的讀寫語意；scoreboard 本身不搬資料。','Same-cycle use of writeback assumes forwarding or compatible register-file read/write semantics; the scoreboard itself carries no data.')],
    examples:[['E0',b('busy=0；發射 src0=0、src1=1、dst=2。','busy=0; issue sources 0,1 to dst2.'),b('issue_ready=1；緣後 busy=00000100。','issue_ready=1; busy becomes 00000100.')],['E1',b('下一指令讀 r2，無 wb。','Next instruction reads r2; no writeback.'),b('RAW，issue_ready=0。','RAW: issue_ready=0.')],['E2',b('wb_dst=2；同拍新指令再寫 r2。','wb_dst=2; new instruction also writes r2.'),b('若來源無其他 hazard 可提交；緣後 r2 仍 busy。','May commit if sources are otherwise ready; r2 remains busy after the edge.')]],
    review:[b('為什麼不能用兩個 nonblocking assignment 各自從舊 busy 算 clear/set？','Why are independent clear/set nonblocking updates from old busy unsafe?'),b('若允許多筆寫同 register 或 out-of-order completion，這個 bitmap 還夠嗎？','Is this bitmap sufficient for multiple outstanding writes to one register or out-of-order completion?')],
    tests:[b('RAW、WAW、無目的寫入、同拍 wb/reissue、flush 與 256 組狀態轉移。','RAW, WAW, no destination write, same-cycle writeback/reissue, flush, 256 state transitions.')],
    hints:[b('用組合 effective 與 next_busy，加上一個 sequential busy register。','Use combinational effective/next_busy and one sequential busy register.'),b('ready 不應依 issue_valid 決定；真正 set busy 才需要 valid && ready。','Ready need not depend on valid; setting busy requires valid && ready.')],
    body:`reg [7:0] effective,next_busy;
always @* begin
 effective=busy; if(wb_valid)effective[wb_dst]=0;
 next_busy=effective;
 if(issue_valid && issue_ready && dst_we)next_busy[dst]=1;
end
assign issue_ready=rst_n&&!flush&&!effective[src0]&&!effective[src1]&&(!dst_we||!effective[dst]);
always @(posedge clk) if(!rst_n||flush)busy<=0;else busy<=next_busy;`,
    tb:`reg clk=0;always #5 clk=~clk;
reg rst_n=0,flush=0,issue_valid=0,dst_we=0,wb_valid=0;reg [2:0] src0=0,src1=1,dst=2,wb_dst=0;wire issue_ready;wire [7:0] busy;
gpu_scoreboard d(clk,rst_n,flush,issue_valid,src0,src1,dst,dst_we,wb_valid,wb_dst,issue_ready,busy);
reg [7:0] model=0,eff;reg expected_ready;integer n;
initial begin
 @(posedge clk);#1;check(busy===0);@(negedge clk);rst_n=1;
 for(n=0;n<260;n=n+1) begin
  issue_valid=1;dst_we=1;wb_valid=0;src0=0;src1=1;dst=2;flush=0;
  if(n==1)src0=2;
  if(n==2)begin wb_valid=1;wb_dst=2;end
  if(n>2)begin src0=$random;src1=$random;dst=$random;wb_dst=$random;dst_we=$random;wb_valid=$random;issue_valid=$random;flush=(n%47==0);end
  eff=model;if(wb_valid)eff[wb_dst]=0;
  expected_ready=!flush&&!eff[src0]&&!eff[src1]&&(!dst_we||!eff[dst]);
  #1;check(issue_ready===expected_ready);
  if(flush)model=0;else begin model=eff;if(issue_valid&&expected_ready&&dst_we)model[dst]=1;end
  @(posedge clk);#1;check(busy===model);@(negedge clk);
 end
 ${pass}
end`,
  },
  {
    id:'gpu-ready-warp-scheduler',name:b('Latency hiding：ready-group 輪詢排程','Latency hiding: ready-group round-robin issue'),block:'scheduler',sequential:true,
    purpose:b('從四個 resident group 選一個可發射的工作；blocked group 不得阻塞其他 ready group。這裡 group 只是教學 slot，不限定任何廠商的 warp 大小。','Choose one issuable group out of four resident slots; blocked work must not block other ready work. A group here is a teaching slot without a vendor-specific warp size.'),
    header:`module gpu_scheduler(input wire clk,input wire rst_n,input wire [3:0] resident,input wire [3:0] dep_blocked,input wire [3:0] barrier,input wire [3:0] fu_ready,input wire commit,output reg [3:0] grant,output reg [1:0] rr);`,
    ports:{...reset,resident:b('已駐留的四個 group。','Four resident groups.'),dep_blocked:b('1 表示 operand 未就緒。','One means operands are not ready.'),barrier:b('1 表示被 barrier 阻擋。','One means blocked at a barrier.'),fu_ready:b('對應 group 所需的功能單元本拍可接受。','The function unit required by each group can accept this cycle.'),commit:b('下游接受所選候選；只有 commit && |grant 才移動 rr。','Downstream accepts the candidate; rr moves only on commit && |grant.'),grant:b('組合 onehot-or-zero 候選；由 rr 起循環找第一個 eligible。reset 時零。','Combinational one-hot-or-zero candidate: first eligible starting at rr. Zero during reset.'),rr:b('下一輪搜尋的起點；reset=0。','Next search starting index; reset=0.')},
    rules:[b('eligible=resident & ~dep_blocked & ~barrier & fu_ready；循環順序 rr、rr+1、rr+2、rr+3（mod 4）。','Eligible = resident & ~dep_blocked & ~barrier & fu_ready; search rr, rr+1, rr+2, rr+3 modulo four.'),b('候選並不是 ready/valid payload 保持合約；輸入 eligibility 改變時可重選。指標只在真正 commit 後設為 winner+1。','The candidate is not a held ready/valid payload; eligibility changes may change the choice. Advance the pointer to winner+1 only after actual commit.'),b('只有在持續 eligible 且持續 commit 的條件下才承諾公平；等待 DRAM 的實際延遲沒有縮短。','Fairness assumes sustained eligibility and commits. Scheduling other work does not shorten physical DRAM latency.')],
    examples:[['E0',b('resident=1111；dep_blocked=0001；其他允許；rr=0。','resident=1111, dep_blocked=0001; other conditions allow issue; rr=0.'),b('grant=0010。commit=0 時 rr 不變。','grant=0010. rr stays unchanged if commit=0.')],['E1',b('接受 group1。','Accept group1.'),b('rr=2；若皆 ready，下次選 group2。','rr=2; select group2 next if all are ready.')]],
    review:[b('為什麼 occupancy=100% 仍可能沒有任何 ready group？','Why can 100% occupancy coexist with no ready groups?'),b('無 commit 就旋轉指標會造成什麼問題？','What is the consequence of rotating without a commit?')],
    tests:[b('全 blocked、單候選、wrap、停頓不旋轉、固定 eligible 的公平性、隨機 masks。','All blocked, one candidate, wrap, no rotation under stalls, fairness with fixed eligibility, randomized masks.')],
    hints:[b('用 found flag 實現循環搜尋，記錄 winner。','Use a found flag for cyclic search and record the winner.'),b('先算 grant，再以 commit 更新 rr。','Compute grant, then update rr on commit.')],
    body:`reg [3:0] eligible;integer k,j;reg found;reg [1:0] winner;
always @* begin
 eligible=resident&~dep_blocked&~barrier&fu_ready;grant=0;found=0;winner=0;j=0;
 for(k=0;k<4;k=k+1)begin j=(rr+k)%4;if(rst_n&&!found&&eligible[j])begin grant[j]=1;winner=j;found=1;end end
end
always @(posedge clk)if(!rst_n)rr<=0;else if(commit&&found)rr<=winner+2'd1;`,
    tb:`reg clk=0;always #5 clk=~clk;reg rst_n=0,commit=0;reg [3:0] resident=0,dep_blocked=0,barrier=0,fu_ready=15;wire [3:0] grant;wire [1:0] rr;
gpu_scheduler d(clk,rst_n,resident,dep_blocked,barrier,fu_ready,commit,grant,rr);
integer n,k,j,start=0,winner;reg [3:0] eligible,expected;
initial begin @(posedge clk);#1;check(rr===0);check(grant===0);@(negedge clk);rst_n=1;
for(n=0;n<240;n=n+1)begin
 resident=(n<16)?15:$random;dep_blocked=(n<16)?1:$random;barrier=(n<16)?0:$random;fu_ready=(n<16)?15:$random;commit=(n%5!=0);
 eligible=resident&~dep_blocked&~barrier&fu_ready;expected=0;winner=-1;
 for(k=0;k<4;k=k+1)begin j=(start+k)%4;if(winner<0&&eligible[j])begin expected[j]=1;winner=j;end end
 #1;check(grant===expected);if(commit&&winner>=0)start=(winner+1)%4;
 @(posedge clk);#1;check(rr===start);@(negedge clk);
end ${pass} end`,
  },
  {
    id:'gpu-divergence-sequencer',name:b('Divergence：單層分支遮罩與 reconvergence','Divergence: one-level mask and reconvergence'),block:'decode',sequential:true,flush:true,minutes:60,
    purpose:b('將四 lane 的一次分支拆成 then／else 工作；序列化不同路徑並保留原始 tag。理解活躍 lane 比例，而不是假設 GPU 同時執行兩條分支。','Split one four-lane branch into then/else work, serialize paths, and preserve the original tag. Understand active-lane utilization instead of assuming both paths execute together.'),
    header:`module gpu_divergence(input wire clk,input wire rst_n,input wire flush,input wire req_valid,output wire req_ready,input wire [3:0] active,input wire [3:0] predicate,input wire [7:0] req_tag,output wire out_valid,input wire out_ready,output wire [3:0] path_mask,output wire path_else,output wire last,output wire [7:0] out_tag);`,
    ports:{...reset,...flushPort,req_valid:b('新的分支請求。','New branch request.'),req_ready:b('沒有 pending 路徑且非 reset/flush；不支援完成舊工作同拍接新工作。','No pending path and not reset/flush; no same-edge replacement of completed work.'),active:b('原本活躍的四個 lane。','Four originally active lanes.'),predicate:b('1 走 then，0 走 else；inactive lane 必須排除。','One selects then, zero else; inactive lanes must be excluded.'),req_tag:b('本次分支 tag。','Branch tag.'),out_valid:b('至少一條 pending 非空路徑；reset/flush 時為 0。','At least one pending nonempty path; zero during reset/flush.'),out_ready:b('接受目前路徑。','Accept current path.'),path_mask:b('先 then 非空 mask，再 else 非空 mask。無效時為零。','Nonempty then mask first, then nonempty else mask; zero if invalid.'),path_else:b('目前是 else 路徑；無效時為 0。','Current path is else; zero when invalid.'),last:b('這是此請求最後一條非空路徑；無效時為 0。','Last nonempty path of this request; zero if invalid.'),out_tag:b('原 req_tag；無效時不要求值。','Original req_tag; unspecified when invalid.')},
    rules:[b('握手時保存 then=active & predicate、else=active & ~predicate；active=0 的請求消耗掉但不產生 output。','On request handshake, save then=active & predicate and else=active & ~predicate. An active=0 request is consumed without output.'),b('只清除已握手的當前路徑；out_valid && !out_ready 時 mask、path、last、tag 不變。','Clear only the accepted path. Mask, path, last, and tag remain stable while out_valid && !out_ready.'),b('last 代表序列完成，原 active 是兩路 mask 的聯集；本題不實作 PC、巢狀 stack、例外與真實 reconvergence 指令。','Last marks sequence completion; the union of both masks is original active. This lab omits PCs, nested stacks, exceptions, and real reconvergence instructions.')],
    examples:[['E0',b('接受 active=1111、predicate=0101。','Accept active=1111, predicate=0101.'),b('緣後 mask=0101、path_else=0、last=0。','After edge: mask=0101, path_else=0, last=0.')],['E1',b('out_ready=0。','out_ready=0.'),b('所有 output payload 保持。','All output payload holds.')],['E2',b('接受 then。','Accept then.'),b('緣後 mask=1010、path_else=1、last=1。','After edge: mask=1010, path_else=1, last=1.')],['E3',b('接受 else。','Accept else.'),b('out_valid=0，req_ready=1。','out_valid=0, req_ready=1.')]],
    review:[b('為什麼 divergent branch 兩條路都要走，但不等於每條指令都算兩次？','Why do both divergent paths execute without every instruction necessarily executing twice?'),b('如果一條路徑很長，只有一個 lane 活躍，有什麼利用率問題？','What utilization problem arises when a long path has just one active lane?')],
    tests:[b('16×16 active/predicate 組合、then/else 順序、空路徑跳過、停頓保持、flush。','All 16×16 active/predicate combinations, path order, empty-path skipping, stall stability, flush.')],
    hints:[b('保存兩個 pending mask，是否非零本身即可表示 valid。','Store two pending masks; nonzero masks encode validity.'),b('then 優先；只有 then=0 才輸出 else。','Then has priority; output else only when then is zero.')],
    body:`reg [3:0] then_pending,else_pending;reg [7:0] tag;
wire has_then=|then_pending;wire pending=has_then||(|else_pending);
assign req_ready=rst_n&&!flush&&!pending;
assign out_valid=rst_n&&!flush&&pending;
assign path_mask=out_valid?(has_then?then_pending:else_pending):4'b0;
assign path_else=out_valid&&!has_then;
assign last=out_valid&&(!has_then||else_pending==0);
assign out_tag=tag;
always @(posedge clk)begin
 if(!rst_n||flush)begin then_pending<=0;else_pending<=0;tag<=0;end
 else if(req_valid&&req_ready)begin then_pending<=active&predicate;else_pending<=active&~predicate;tag<=req_tag;end
 else if(out_valid&&out_ready)begin if(has_then)then_pending<=0;else else_pending<=0;end
end`,
    tb:`reg clk=0;always #2 clk=~clk;reg rst_n=0,flush=0,req_valid=0,out_ready=0;reg [3:0] active=0,predicate=0;reg [7:0] req_tag=0;
wire req_ready,out_valid,path_else,last;wire [3:0] path_mask;wire [7:0] out_tag;
gpu_divergence d(clk,rst_n,flush,req_valid,req_ready,active,predicate,req_tag,out_valid,out_ready,path_mask,path_else,last,out_tag);
integer a,p,k;reg [3:0] t,e,m;
task consume;input [3:0] mask;input is_else,is_last;begin
 check(out_valid);check(path_mask===mask);check(path_else===is_else && last===is_last);check(out_tag===req_tag);
 repeat(2)begin @(posedge clk);#1;check(out_valid && path_mask===mask && out_tag===req_tag && path_else===is_else && last===is_last);@(negedge clk);end
 out_ready=1;@(posedge clk);#1;@(negedge clk);out_ready=0;
end endtask
initial begin repeat(2)@(negedge clk);rst_n=1;#1;
for(a=0;a<16;a=a+1)for(p=0;p<16;p=p+1)begin
 check(req_ready);active=a;predicate=p;req_tag=a*16+p;req_valid=1;
 t=a&p;e=a&(~p);@(posedge clk);#1;@(negedge clk);req_valid=0;
 if(t!=0)consume(t,0,e==0);if(e!=0)consume(e,1,1);
 check(!out_valid && req_ready);
end
active=15;predicate=5;req_valid=1;@(posedge clk);#1;@(negedge clk);req_valid=0;flush=1;
 #1;check(!out_valid&&!req_ready);@(posedge clk);#1;@(negedge clk);flush=0;#1;check(req_ready&&!out_valid);${pass}
end`,
  },
  {
    id:'gpu-occupancy-budget',name:b('Occupancy：register／shared-memory 資源上限','Occupancy: register and shared-memory limits'),block:'registers',
    purpose:b('計算縮小核心最多能駐留幾個 group，區分「駐留數量」與「實際可發射工作」。這是配置時計算器，不是 ALU utilization 計數器。','Calculate resident-group capacity on a reduced core, distinguishing residency from issuable work. This is a configuration calculator, not ALU utilization telemetry.'),
    header:`module gpu_occupancy(input wire [4:0] regs_per_thread,input wire [5:0] smem_per_group,output reg [2:0] groups,output reg [4:0] threads,output reg [2:0] limiting);`,
    ports:{regs_per_thread:b('每 thread 使用幾個 register，1–31；0 為非法配置。','Registers per thread, 1–31; zero is invalid.'),smem_per_group:b('每 group 使用幾個 shared-memory 單位，0–63；0 表示不用。','Shared-memory units per group, 0–63; zero means no use.'),groups:b('min(4, floor(64/(4*regs)), floor(32/smem))，smem=0 不限制。regs=0 時為 0。','min(4, floor(64/(4*regs)), floor(32/smem)); smem=0 imposes no limit. Zero when regs=0.'),threads:b('groups*4，最多 16；4 是本題群組大小。','groups*4, up to 16; four is this lab’s group size.'),limiting:b('bit0=slot、bit1=register、bit2=shared；等於原始最小值的限制全部設 1。smem=0 不設 shared；regs=0 時全零。','bit0=slots, bit1=registers, bit2=shared; set every bound equal to the raw minimum. No shared bit if smem=0; all zero if regs=0.')},
    rules:[b('slot 上限 4、總 register 64、每 group 4 threads、shared budget 32。先向下整除，再取最小；保留資源限制並列情況。','Four slots, 64 registers, four threads per group, shared budget 32. Floor each quotient before taking the minimum; preserve tied limits.'),b('smem=0 不做除零；regs=0 判非法。一般配置除法可能很貴，不應直接宣稱適合 critical datapath。','Avoid division by zero for smem=0; regs=0 is invalid. Configuration division may be expensive and is not claimed suitable for a critical datapath.')],
    examples:[['config',b('regs=8、smem=0。','regs=8, smem=0.'),b('register 允許 2 group；groups=2、threads=8、limiting=010。','Registers allow two groups: groups=2, threads=8, limiting=010.')],['config',b('regs=4、smem=8。','regs=4, smem=8.'),b('三者都限制在 4；groups=4、limiting=111。','All bounds are four: groups=4, limiting=111.')]],
    review:[b('提高 occupancy 為什麼可能使 cache 或資源競爭更嚴重？','Why can higher occupancy worsen cache or resource contention?'),b('降低 register 數若產生 spill，效能會一定改善嗎？','Does reducing register use necessarily help when it introduces spills?')],
    tests:[b('32×64 全配置、除零、零駐留、限制並列。','All 32×64 configurations, division by zero, zero residency, tied limits.')],
    hints:[b('用足夠寬的中間值，特別是 4*regs。','Use wide enough intermediates, especially for 4*regs.'),b('limiting 要和未 clamp 的 bound 比較，不要把所有 >4 的 bound 都誤列為限制。','Compare limiting flags with unclamped bounds; bounds greater than four are not tied bottlenecks.')],
    body:`integer rb,sb,g;
always @* begin
 groups=0;threads=0;limiting=0;rb=0;sb=0;g=0;
 if(regs_per_thread!=0)begin
  rb=64/(4*regs_per_thread);sb=(smem_per_group==0)?33:32/smem_per_group;
  g=4;if(rb<g)g=rb;if(sb<g)g=sb;
  groups=g;threads=g*4;limiting[0]=(g==4);limiting[1]=(g==rb);limiting[2]=(smem_per_group!=0&&g==sb);
 end
end`,
    tb:`reg [4:0] regs_per_thread;reg [5:0] smem_per_group;wire [2:0] groups,limiting;wire [4:0] threads;
gpu_occupancy d(regs_per_thread,smem_per_group,groups,threads,limiting);
integer r,s,g,rb,sb;reg [2:0] lim;
initial begin for(r=0;r<32;r=r+1)for(s=0;s<64;s=s+1)begin
 regs_per_thread=r;smem_per_group=s;g=0;lim=0;
 if(r!=0)begin rb=64/(4*r);sb=(s==0)?33:32/s;g=4;if(rb<g)g=rb;if(sb<g)g=sb;lim[0]=(g==4);lim[1]=(g==rb);lim[2]=(s!=0&&g==sb);end
 #1;check(groups===g);check(threads===g*4);check(limiting===lim);
end ${pass} end`,
  },
  {
    id:'gpu-memory-coalescer',name:b('Global memory：四 lane 位址合併','Global memory: four-lane address coalescing'),block:'lsu',
    purpose:b('將一群 thread 的四個 4-byte 存取合併成不重複的 16-byte segment request。練習位址、mask、對齊與交易數，不假設真實 GPU 的 transaction 大小。','Combine four 4-byte lane accesses into unique 16-byte segment requests. Practice addresses, masks, alignment, and transaction counts without assuming real-GPU transaction sizes.'),
    header:`module gpu_coalescer(input wire [63:0] addresses,input wire [3:0] active,output reg [47:0] segments,output reg [3:0] seg_valid,output reg [2:0] count,output reg align_error);`,
    ports:{addresses:b('lane i 的 16-bit byte address 位於 [i*16 +:16]。','Lane i’s 16-bit byte address is at [i*16 +:16].'),active:b('有效 lane；inactive 位址不影響對齊或合併。','Valid lanes; inactive addresses affect neither alignment nor coalescing.'),segments:b('最多四個 12-bit segment ID=addr[15:4]；依第一次出現的 lane 順序壓緊，未用欄位零。','Up to four 12-bit segment IDs=addr[15:4], compacted in first-lane occurrence order; unused entries zero.'),seg_valid:b('低 count 個 bit 為 1，無洞。','Lowest count bits are one, with no holes.'),count:b('不重複 segment 數，0–4。','Number of unique segments, 0–4.'),align_error:b('任何 active address[1:0]!=0 則 1；整筆 request 拒絕，其他輸出全零。','One if any active address[1:0]!=0; reject the entire request and zero all other outputs.')},
    rules:[b('由 lane0→lane3 掃描；只加入第一次出現的 segment。四個相同 word 或同一 segment 都只產生一筆 segment request。','Scan lanes 0 through 3; insert only first occurrences. Duplicate words and distinct words in one segment both generate one segment request.'),b('這裡不計 cache hit/miss，也沒有 shared-memory bank；4-byte 對齊確保單次存取不跨 16-byte segment。','This block does not model cache hits/misses or shared-memory banks. Four-byte alignment prevents one access spanning two 16-byte segments.')],
    examples:[['settle',b('active=1111；地址 0、4、8、12。','active=1111; addresses 0,4,8,12.'),b('count=1、segments[11:0]=0、seg_valid=0001。','count=1, segments[11:0]=0, seg_valid=0001.')],['settle',b('地址 0、16、0、32。','Addresses 0,16,0,32.'),b('依序 segment 0、1、2；count=3。','Segments 0,1,2 in order; count=3.')]],
    review:[b('Coalescing 良好為什麼還可能 cache miss 或受頻寬限制？','Why can well-coalesced accesses still miss caches or be bandwidth-bound?'),b('若支援不對齊 8-byte load，這個模型哪裡需要改？','What must change to support unaligned eight-byte loads?')],
    tests:[b('連續、重複、跨 segment、稀疏 mask、active/inactive 不對齊、隨機位址。','Contiguous, duplicate, crossing-segment, sparse-mask, active/inactive misalignment, random addresses.')],
    hints:[b('先檢查所有 active 位址對齊，再開始 compaction。','Check all active addresses for alignment before compaction.'),b('用已加入的 segment 清單做去重，不能只和前一個 lane 比。','Compare against all inserted segments, not just the preceding lane.')],
    body:`integer i,j,n;reg found;reg [15:0] addr;
always @* begin
 segments=0;seg_valid=0;count=0;align_error=0;addr=0;found=0;n=0;
 for(i=0;i<4;i=i+1)if(active[i]&&addresses[i*16+:2]!=0)align_error=1;
 if(!align_error)begin
  for(i=0;i<4;i=i+1)begin
   addr=addresses[i*16+:16];found=0;
   for(j=0;j<4;j=j+1)if(j<n&&segments[j*12+:12]==addr[15:4])found=1;
   if(active[i]&&!found)begin segments[n*12+:12]=addr[15:4];seg_valid[n]=1;n=n+1;end
  end
  count=n;
 end
end`,
    tb:`reg [63:0] addresses;reg [3:0] active;wire [47:0] segments;wire [3:0] seg_valid;wire [2:0] count;wire align_error;
gpu_coalescer d(addresses,active,segments,seg_valid,count,align_error);
integer n,i,j,c,id;integer list[0:3];reg found,err;reg [47:0] expected;
initial begin for(n=0;n<600;n=n+1)begin
 addresses={$random,$random};active=n%16;
 for(i=0;i<4;i=i+1)begin addresses[i*16+:16]=((n+i*7)%9)*4;if(n%7==0)addresses[i*16+:16]=i*16;if(n%11==0)addresses[i*16+:2]=1;end
 if(n>300)addresses={$random,$random};
 c=0;err=0;expected=0;for(i=0;i<4;i=i+1)if(active[i]&&addresses[i*16+:2]!=0)err=1;
 if(!err)for(i=0;i<4;i=i+1)if(active[i])begin
 id=addresses[i*16+4+:12];found=0;for(j=0;j<c;j=j+1)if(list[j]==id)found=1;
 if(!found)begin list[c]=id;expected[c*12+:12]=id;c=c+1;end end
 #1;check(align_error===err);check(count===c);check(segments===expected);check(seg_valid===((1<<c)-1));
end ${pass} end`,
  },
  {
    id:'gpu-shared-bank-conflicts',name:b('Shared memory：bank conflict 與讀取 broadcast','Shared memory: bank conflicts and read broadcast'),block:'memory',
    purpose:b('四個單埠 bank 接收四 lane 讀取。相同 word 可 broadcast，不同 word 落在同 bank 則需多輪；將它與 global-memory coalescing 分開。','Four single-ported banks serve four lane reads. Identical words may broadcast; distinct words in one bank require multiple rounds. Distinguish this from global-memory coalescing.'),
    header:`module gpu_bank_conflicts(input wire [31:0] addresses,input wire [3:0] active,output reg [2:0] rounds,output reg [2:0] unique_words,output reg [3:0] conflict_lanes);`,
    ports:{addresses:b('四個 8-bit byte address；保證 4-byte 對齊。bank=addr[3:2]，word=addr[7:2]。','Four eight-bit byte addresses, guaranteed four-byte aligned. bank=addr[3:2], word=addr[7:2].'),active:b('有效讀取 lane。','Active read lanes.'),rounds:b('各 bank 不重複 word 數的最大值；active=0 時為 0。','Maximum number of distinct words in any bank; zero if active=0.'),unique_words:b('所有 active lane 的不重複 word 總數，0–4。','Total distinct words across active lanes, 0–4.'),conflict_lanes:b('active lane 所在 bank 若有超過一個 distinct word，該 lane 設 1（包含 broadcast 的伙伴）。','Set for each active lane whose bank has more than one distinct word, including its broadcast partners.')},
    rules:[b('同 word 的重複讀取只消耗該 bank 一次服務；不同 bank 可同輪服務。每 bank 每輪最多一個 word。','Duplicate reads of the same word consume one bank service. Different banks serve in parallel; each bank serves one word per round.'),b('沒有 cache tag、miss 或 DRAM timing；只計算本次 shared-memory 讀取衝突。write-to-same-word 語意不在範圍內。','No cache tags, misses, or DRAM timing are modeled; count this shared-memory read conflict only. Same-word write semantics are out of scope.')],
    examples:[['settle',b('地址 0、4、8、12；四 lane 活躍。','Addresses 0,4,8,12; all lanes active.'),b('四個 bank，rounds=1、unique_words=4、conflict_lanes=0。','Four banks: rounds=1, unique_words=4, conflict_lanes=0.')],['settle',b('地址 0、16、0、32。','Addresses 0,16,0,32.'),b('都在 bank0，三個不同 word；rounds=3、conflict_lanes=1111。','All bank0, three distinct words: rounds=3, conflict_lanes=1111.')],['settle',b('四個地址都是 0。','All addresses are zero.'),b('broadcast，rounds=1，不是四輪。','Broadcast: rounds=1, not four rounds.')]],
    review:[b('相同 bank 等於 conflict 嗎？相同 word 的讀取例外是什麼？','Does sharing a bank always mean a conflict? What is the identical-word read exception?'),b('global coalescing 與 shared bank conflict 可以用同一個數字判斷嗎？','Can one metric characterize both global coalescing and shared-bank conflicts?')],
    tests:[b('全 broadcast、四 bank 平行、同 bank 不同 word、稀疏 mask、隨機對齊讀取。','Full broadcast, four parallel banks, distinct words in one bank, sparse masks, randomized aligned reads.')],
    hints:[b('每個 bank 分別計不重複 word，再取最大。','Count distinct words per bank, then take the maximum.'),b('把 lane 數直接當 word 數會把 broadcast 誤判。','Counting lanes as words incorrectly treats broadcasts as conflicts.')],
    body:`integer counts[0:3];integer i,j,bank;reg duplicate;
always @* begin
 rounds=0;unique_words=0;conflict_lanes=0;duplicate=0;bank=0;
 for(i=0;i<4;i=i+1)counts[i]=0;
 for(i=0;i<4;i=i+1)begin
  duplicate=0;
  for(j=0;j<4;j=j+1)if(j<i&&active[j]&&addresses[j*8+2+:6]==addresses[i*8+2+:6])duplicate=1;
  if(active[i]&&!duplicate)begin bank=addresses[i*8+2+:2];counts[bank]=counts[bank]+1;unique_words=unique_words+1;end
 end
 for(i=0;i<4;i=i+1)if(counts[i]>rounds)rounds=counts[i];
 for(i=0;i<4;i=i+1)if(active[i]&&counts[addresses[i*8+2+:2]]>1)conflict_lanes[i]=1;
end`,
    tb:`reg [31:0] addresses;reg [3:0] active;wire [2:0] rounds,unique_words;wire [3:0] conflict_lanes;
gpu_bank_conflicts d(addresses,active,rounds,unique_words,conflict_lanes);
integer n,i,w,bank,maxr,total;integer counts[0:3];reg [63:0] seen;reg [3:0] expected;
initial begin for(n=0;n<640;n=n+1)begin
 addresses=$random;active=n%16;
 for(i=0;i<4;i=i+1)addresses[i*8+:2]=0;
 if(n<16)addresses=0;if(n>=16&&n<32)addresses=32'h20100000;
 seen=0;total=0;maxr=0;expected=0;for(i=0;i<4;i=i+1)counts[i]=0;
 for(i=0;i<4;i=i+1)if(active[i])begin w=addresses[i*8+2+:6];if(!seen[w])begin seen[w]=1;counts[w%4]=counts[w%4]+1;total=total+1;end end
 for(i=0;i<4;i=i+1)if(counts[i]>maxr)maxr=counts[i];
 for(i=0;i<4;i=i+1)if(active[i]&&counts[addresses[i*8+2+:2]]>1)expected[i]=1;
 #1;check(rounds===maxr && unique_words===total && conflict_lanes===expected);
end ${pass} end`,
  },
  {
    id:'gpu-stall-counters',name:b('瓶頸分析：互斥 stall 分類與飽和計數','Bottleneck analysis: exclusive stall counters'),block:'telemetry',sequential:true,
    purpose:b('用互斥優先序將每個採樣 cycle 分成 issue／idle／memory／dependency／unit-busy，學會用證據判斷瓶頸，而不是只看 occupancy。','Classify each sampled cycle exclusively as issue, idle, memory, dependency, or unit-busy. Diagnose bottlenecks with evidence instead of occupancy alone.'),
    header:`module gpu_stall_counters #(parameter COUNT_WIDTH=16)(input wire clk,input wire rst_n,input wire clear,input wire sample_enable,input wire issued,input wire resident_any,input wire eligible_any,input wire memory_wait,output reg [COUNT_WIDTH-1:0] issue_cycles,output reg [COUNT_WIDTH-1:0] idle_cycles,output reg [COUNT_WIDTH-1:0] memory_cycles,output reg [COUNT_WIDTH-1:0] dependency_cycles,output reg [COUNT_WIDTH-1:0] unit_cycles);`,
    ports:{...reset,clear:b('同步清零所有 counters，優先於 sample。','Synchronously clear all counters, above sample.'),sample_enable:b('1 才分類並累加一個 counter。','Classify and increment one counter only when one.'),issued:b('本拍確實提交指令；分類最高優先。','An instruction actually committed; highest classification priority.'),resident_any:b('至少有一個駐留工作。','At least one resident group.'),eligible_any:b('至少有一個 operand／barrier 已就緒的候選，尚未計入 FU readiness。','At least one operand/barrier-ready candidate, before considering FU readiness.'),memory_wait:b('沒有 eligible 時的簡化原因：1=memory，0=其他 dependency。','Reduced reason when none are eligible: one=memory, zero=other dependency.'),issue_cycles:b('有 issue 的採樣 cycle 數。','Sampled cycles with issue.'),idle_cycles:b('無 issue 且沒有 resident 的 cycle 數。','No-issue cycles with no resident work.'),memory_cycles:b('有 resident、無 eligible、memory_wait=1。','Resident work, no eligible candidate, memory_wait=1.'),dependency_cycles:b('有 resident、無 eligible、memory_wait=0。','Resident work, no eligible candidate, memory_wait=0.'),unit_cycles:b('有 eligible 但無 issue；此模型歸為 unit/issue backpressure。','Eligible but no issue; classified as unit/issue backpressure in this model.')},
    rules:[b('reset > clear > sample_enable；分類為 issued > !resident_any > !eligible_any (memory/dependency) > unit。即使輸入互相矛盾也遵守此順序。','Reset > clear > sample_enable. Classification: issued > !resident_any > !eligible_any (memory/dependency) > unit. This priority applies even to contradictory inputs.'),b('COUNT_WIDTH 預設 16（至少 1），counter 各自於 2^COUNT_WIDTH−1 飽和；TB 使用 8-bit 驗證飽和，不能 wrap。未飽和且無 clear 的區間，五者增量總和等於 sample 次數。','COUNT_WIDTH defaults to 16 (minimum one). Each counter saturates at 2^COUNT_WIDTH−1; the testbench uses eight bits to exercise saturation without wrap. Before saturation and without clear, the sum of increments equals sampled cycles.'),b('分類不代表廠商 profiler 的正式定義，也無法只靠這五個 counter 證明 compute-bound 或 bandwidth-bound；還要對照 bytes、operations、峰值與延遲。','These are not vendor profiler definitions. These counters alone cannot prove compute- or bandwidth-bound behavior; compare bytes, operations, peaks, and latency too.')],
    examples:[['E0',b('sample=1、issued=1，其他輸入任意。','sample=1, issued=1; other inputs arbitrary.'),b('只 issue_cycles +1。','Only issue_cycles increments.')],['E1',b('issued=0、resident=1、eligible=0、memory_wait=1。','issued=0, resident=1, eligible=0, memory_wait=1.'),b('只 memory_cycles +1。','Only memory_cycles increments.')],['E2',b('clear=1 且 sample=1。','clear=1 and sample=1.'),b('全部歸零，不累加。','All zero, no increment.')]],
    review:[b('高 memory-wait 比例是頻寬飽和的充分證據嗎？還需要哪些量測？','Is high memory-wait share sufficient evidence of bandwidth saturation? What else must be measured?'),b('為什麼 counters 互斥仍不代表只有一個底層瓶頸？','Why does exclusive classification not imply only one underlying bottleneck?')],
    tests:[b('輸入重疊優先序、sample disable、clear、五種分類、參數化飽和不回捲（TB 使用 8-bit）。','Overlapping input priority, sample disable, clear, all five classes, parameterized saturation (8-bit test configuration).')],
    hints:[b('使用 if/else if 互斥分類，不是五個獨立 if。','Use exclusive if/else-if classification, not five independent ifs.'),b('累加前先比較所有 COUNT_WIDTH 位元均為 1。','Check for an all-ones counter before incrementing.')],
    body:`always @(posedge clk)begin
 if(!rst_n||clear)begin issue_cycles<=0;idle_cycles<=0;memory_cycles<=0;dependency_cycles<=0;unit_cycles<=0;end
 else if(sample_enable)begin
  if(issued)begin if(issue_cycles!={COUNT_WIDTH{1'b1}})issue_cycles<=issue_cycles+1'b1;end
  else if(!resident_any)begin if(idle_cycles!={COUNT_WIDTH{1'b1}})idle_cycles<=idle_cycles+1'b1;end
  else if(!eligible_any)begin
   if(memory_wait)begin if(memory_cycles!={COUNT_WIDTH{1'b1}})memory_cycles<=memory_cycles+1'b1;end
   else begin if(dependency_cycles!={COUNT_WIDTH{1'b1}})dependency_cycles<=dependency_cycles+1'b1;end
  end else begin if(unit_cycles!={COUNT_WIDTH{1'b1}})unit_cycles<=unit_cycles+1'b1;end
 end
end`,
    tb:`reg clk=0;always #5 clk=~clk;reg rst_n=0,clear=0,sample_enable=0,issued=0,resident_any=0,eligible_any=0,memory_wait=0;
wire [7:0] issue_cycles,idle_cycles,memory_cycles,dependency_cycles,unit_cycles;
gpu_stall_counters #(.COUNT_WIDTH(8)) d(clk,rst_n,clear,sample_enable,issued,resident_any,eligible_any,memory_wait,issue_cycles,idle_cycles,memory_cycles,dependency_cycles,unit_cycles);
integer c[0:4];integer n,i,k;
initial begin for(i=0;i<5;i=i+1)c[i]=0;repeat(2)@(negedge clk);rst_n=1;
for(n=0;n<430;n=n+1)begin
 {issued,resident_any,eligible_any,memory_wait}=(n<140)?n%16:15;
 sample_enable=(n%17!=0 || n>=140);clear=(n==130);
 if(clear)for(i=0;i<5;i=i+1)c[i]=0;
 else if(sample_enable)begin if(issued)k=0;else if(!resident_any)k=1;else if(!eligible_any)k=memory_wait?2:3;else k=4;if(c[k]<255)c[k]=c[k]+1;end
 @(posedge clk);#1;check(issue_cycles===c[0]&&idle_cycles===c[1]&&memory_cycles===c[2]&&dependency_cycles===c[3]&&unit_cycles===c[4]);@(negedge clk);
end check(issue_cycles===8'hff);${pass} end`,
  },
];

const formatHeader = (header: string) => header.replace(/\(input wire/g, '(\n  input wire').replace(/,\s*(input|output) /g, ',\n  $1 ').replace(/\);$/, '\n);');
export const gpuChallenges: Challenge[] = entries.map((entry, index) => ({
  id: entry.id, order: 57 + index, track: 'gpu', title: entry.name,
  difficulty: entry.id === 'gpu-elastic-pipeline' || entry.id === 'gpu-divergence-sequencer' ? 'advanced' : 'intermediate',
  minutes: entry.minutes ?? 40, points: 100, kind: 'build', judge: 'simulation', language: 'Verilog-2005',
  description: entry.purpose, specs: entry.rules, testGroups: entry.tests, hints: entry.hints,
  starter: `${formatHeader(entry.header)}\n// TODO: implement the micro-spec. Lane 0 is packed at the least-significant bits.\n// Separate combinational decisions from registered state; preserve payload during stalls.\nendmodule\n`,
  referenceSolution: `${formatHeader(entry.header)}\n${entry.body}\nendmodule\n`,
  testbench: `\u0060timescale 1ns/1ps\nmodule tb;\n${check}\n${entry.tb}\nendmodule\n`,
}));

export const gpuSpecs: Record<string, LabSpec> = Object.fromEntries(entries.map((entry) => [entry.id, {
  purpose: entry.purpose, clocking: entry.sequential ? sync : comb, ports: entry.ports, algorithm: entry.rules,
  priority: entry.sequential ? [entry.id === 'gpu-stall-counters' ? b('reset > clear > sample_enable；只累加一個分類，全部計數器分別飽和。', 'Reset > clear > sample_enable; increment one class only, with independent saturation.') : b(entry.flush ? 'reset > flush > 正常工作；flush 當拍不提交 input/output。' : 'reset > 正常更新；只有明訂的 commit／sample 條件才改狀態。', entry.flush ? 'Reset > flush > normal work; no input/output commit during flush.' : 'Reset > normal updates; state changes only under the specified commit/sample condition.')] : [],
  example: entry.examples.map(([cycle, drive, expect]) => ({ cycle, drive, expect })), assumptions: [scope],
}]));
export const gpuContext: Record<string, LabContext> = Object.fromEntries(entries.map((entry) => [entry.id, {
  blockId: entry.block, placement: entry.purpose, why: [entry.rules[0], entry.rules[1]], review: entry.review, boundary: scope,
}]));
