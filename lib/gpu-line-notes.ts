import type { Localized, Challenge } from './challenges';
import type { LabSpec } from './lab-specs';
const b=(zh:string,en:string):Localized=>({zh,en});
const n=(zh:string,en:string):Localized=>b(zh,en);
export const gpuLineNotes:Record<string,Record<string,Localized>>={
 'gpu-masked-simd-alu':{
  'integer i; reg signed [7:0] x,y; reg signed [15:0] sx,sy;':n('i 是展開四個 lane 的迴圈索引；x/y 暫存 signed 8-bit operand；sx/sy 是擴成 16-bit 的版本。組合 always 中的 reg 不代表一定產生 flip-flop。','i indexes four lanes; x/y are signed 8-bit temporaries and sx/sy their 16-bit extensions. A reg in combinational logic is not necessarily a flip-flop.'),
  'result=0; x=0; y=0; sx=0; sy=0;':n('先給所有組合輸出與暫存變數預設值，避免未賦值路徑推導出 latch；inactive lane 因此維持零。','Default all outputs/temporaries to avoid inferred latches; inactive lanes therefore stay zero.'),
  'for(i=0;i<4;i=i+1) begin':n('逐一描述 lane0 到 lane3 的相同電路；組合 for 並不是花四個 clock 才算完。','Describe the same circuitry for lanes 0–3; a combinational for-loop does not consume four clock cycles.'),
  'x=a[i*8+:8]; y=b[i*8+:8]; sx=x; sy=y;':n('[起點 +:寬度] 是向高位取固定寬度的 slice。把各 lane 放入 signed x/y，再賦值到較寬 signed sx/sy，保留符號。','[start +:width] selects an upward fixed-width slice. Signed x/y then widen into signed sx/sy, preserving the sign.'),
  'if(active[i]) case(op)':n('只有 active[i]=1 才運算該 lane；再依 opcode 選擇操作，未啟用者沿用預設零。','Compute only an active lane, selecting its operation by opcode; inactive lanes retain zero.'),
  '0: result[i*16+:16]=sx+sy;':n('opcode 0：用已擴寬的 signed 值相加，將 16-bit 結果放回 lane i，避免先做 8-bit 加法就截斷。','Opcode 0 adds widened signed values and stores a 16-bit lane result, avoiding premature 8-bit truncation.'),
  '1: result[i*16+:16]=sx*sy;':n('opcode 1：計算乘積。原始 operand 為 signed 8-bit，所以完整乘積可放在 16-bit，不做飽和。','Opcode 1 multiplies the original signed 8-bit operands; their full product fits 16 bits without saturation.'),
  '2: result[i*16+:16]=(sx>sy)?sx:sy;':n('opcode 2：比較 signed sx/sy，較大者作為輸出；?: 是二選一的組合選擇。','Opcode 2 selects the larger signed operand; ?: is a combinational two-way selection.'),
  'default: result[i*16+:16]=0;':n('其他 opcode（本題是 3）輸出零，定義非法／保留情況，不留下不確定路徑。','Other opcodes, here 3, produce zero, defining reserved behavior.'),
 },
 'gpu-elastic-pipeline':{
  'reg v0,v1; reg [31:0] a0,b0; reg [3:0] m0; reg [7:0] tag0;':n('v0/v1 表示兩級是否占用；a0/b0、m0、tag0 一起保存第一級的資料、有效 lane 與身分。','v0/v1 track stage occupancy; a0/b0, m0, and tag0 hold stage0 operands, mask, and identity together.'),
  'wire ready1=!v1||out_ready; wire ready0=!v0||ready1;':n('第一級輸出位置空著，或舊結果本拍能被拿走，stage1 就能收資料；stage0 同理。這條 ready 反向鏈也可能成為 timing path。','Stage1 can accept if empty or its old result can leave; stage0 follows the same rule. This backward ready chain can become a timing path.'),
  'assign in_ready=rst_n&&!flush&&ready0; assign out_valid=rst_n&&!flush&&v1;':n('reset/flush 期間把介面握手關掉；正常時對外表示 stage0 是否可收、stage1 是否有結果。','Disable handshakes during reset/flush; otherwise expose stage0 capacity and stage1 validity.'),
  'integer i; reg signed [15:0] x,y;':n('i 展開四個 lane；x/y 是乘法前的 signed 暫存值，在本程序中先被 blocking assignment 寫入，再使用。','i indexes lanes; signed x/y are blocking-assigned temporaries used immediately for multiplication.'),
  'if(!rst_n || flush) begin v0<=0;v1<=0;a0<=0;b0<=0;m0<=0;tag0<=0;result<=0;out_tag<=0; end':n('reset 或 flush 優先清空兩級 valid 和暫存內容；<= 是非阻塞更新，同一緣的右值先依舊狀態計算。','Reset/flush clears both valid bits and payload registers. Nonblocking updates evaluate right-hand sides from the current state before updating.'),
  'if(ready1) begin':n('只有 stage1 可接收時才能更換它的 valid 與 payload；否則保留輸出，避免覆蓋尚未被拿走的結果。','Update stage1 only when it can accept; otherwise hold its output to avoid overwriting unconsumed work.'),
  'v1<=v0;':n('把舊 stage0 是否有效傳給 stage1；即使 v0=0 也要更新，才能把 bubble 正確傳下去。','Propagate old v0 into v1, including zero, so bubbles move correctly.'),
  'if(v0) begin':n('舊 stage0 有工作才更新運算結果與 tag；無效時 payload 的數值不重要。','Update result/tag only when old stage0 contains valid work; invalid payload values are unspecified.'),
  'out_tag<=tag0;':n('結果的身分和乘積使用相同 enable 更新，避免 result 保持但 tag 前進。','Update identity with the same enable as the product, preventing tag/result misalignment.'),
  'for(i=0;i<4;i=i+1) begin':n('為四個 lane 分別建立相同的乘法與遮罩處理。','Describe multiplication and masking for each of the four lanes.'),
  'x=$signed(a0[i*8+:8]); y=$signed(b0[i*8+:8]);':n('slice 後明確轉為 signed，再擴成 16-bit；例如 ff 應被解釋為 -1，不是 255。','Explicitly cast sliced operands to signed before widening; ff means -1 rather than 255.'),
  "result[i*16+:16]<=m0[i]?x*y:16'b0;":n('該 lane 活躍就註冊乘積，否則註冊零；使用第一級保存的 m0，不能偷用下一筆輸入的 mask。','Register the product for an active lane or zero otherwise. Use saved m0, not the next input mask.'),
  'if(ready0) begin v0<=in_valid; if(in_valid) begin a0<=a;b0<=b;m0<=active;tag0<=in_tag; end end':n('stage0 可接收時更新 valid；輸入有效才一起保存 operand/mask/tag。若 stage0 不能收，所有暫存保持。','When stage0 can accept, update valid and capture operands/mask/tag only for valid input; otherwise hold all state.'),
 },
 'gpu-register-scoreboard':{
  'reg [7:0] effective,next_busy;':n('兩個組合暫存 bitmap：effective 用於本拍 hazard 判斷；next_busy 是下一拍要寫入的狀態。','Two combinational bitmaps: effective for hazard checks and next_busy for the next registered state.'),
  'effective=busy; if(wb_valid)effective[wb_dst]=0;':n('先複製目前 busy，再解除本拍 writeback 的 register。假設資料路徑支援同拍使用該結果。','Copy current busy and release the completing register, assuming same-cycle data availability.'),
  'next_busy=effective;':n('以已處理完成事件的狀態作為下一狀態預設，避免清除事件被後面的整體賦值覆蓋。','Default next state to the completion-adjusted bitmap so later updates preserve the release.'),
  'if(issue_valid && issue_ready && dst_we)next_busy[dst]=1;':n('真的接受一條會寫 register 的指令才設 busy；此 set 放在 clear 後面，所以同 register 新工作不會被誤清。','Allocate only an accepted writing instruction. Setting after clearing preserves new ownership on a same-register collision.'),
  'assign issue_ready=rst_n&&!flush&&!effective[src0]&&!effective[src1]&&(!dst_we||!effective[dst]);':n('非 reset/flush，兩個來源皆無 RAW，且需要寫入時目的地無 WAW，才允許發射。ready 不依賴 issue_valid。','Allow issue outside reset/flush when both sources are free and any writing destination is free. Ready does not depend on valid.'),
  'always @(posedge clk) if(!rst_n||flush)busy<=0;else busy<=next_busy;':n('每個上升緣只更新一個 busy register；reset/flush 優先清空，其餘寫入已組合好的 next_busy。','On each rising edge, clear busy for reset/flush or register the computed next_busy.'),
 },
 'gpu-ready-warp-scheduler':{
  'reg [3:0] eligible;integer k,j;reg found;reg [1:0] winner;':n('eligible 表示可選群組；k/j 走訪循環順序；found 避免重複選取；winner 記錄勝出位置。','Eligible marks candidates; k/j scan circularly, found prevents multiple selections, and winner records the chosen index.'),
  'eligible=resident&~dep_blocked&~barrier&fu_ready;grant=0;found=0;winner=0;j=0;':n('駐留、相依解除、沒有 barrier、且單元可收，四條件同時成立才 eligible；其餘組合輸出先給預設值。','Eligibility requires residency, resolved dependencies, no barrier, and unit capacity; default the other combinational outputs.'),
  'for(k=0;k<4;k=k+1)begin j=(rr+k)%4;if(rst_n&&!found&&eligible[j])begin grant[j]=1;winner=j;found=1;end end':n('從 rr 起繞一圈找第一個 eligible，找到後設 onehot grant 和 winner；found 保證之後不再選第二個。','Search circularly from rr for the first eligible group. Found ensures a one-hot grant and only one winner.'),
  "always @(posedge clk)if(!rst_n)rr<=0;else if(commit&&found)rr<=winner+2'd1;":n('只有真的 commit 才把搜尋起點移到 winner 的下一位；2-bit 自然回捲 3→0。選到但沒接受時不能旋轉。','Advance to winner+1 only on actual commit. Two-bit arithmetic wraps 3 to 0; an unaccepted selection cannot rotate rr.'),
 },
 'gpu-divergence-sequencer':{
  'reg [3:0] then_pending,else_pending;reg [7:0] tag;':n('保存尚未送出的 then/else mask 和原始工作 tag。mask 非零本身就代表還有該路徑。','Store pending then/else masks and the original tag; a nonzero mask represents pending path work.'),
  'wire has_then=|then_pending;wire pending=has_then||(|else_pending);':n('|vector 是 reduction OR：檢查是否至少一個 bit 為 1；任一路徑非空就 pending。','Reduction OR tests whether any mask bit is set; either nonempty path makes pending true.'),
  'assign req_ready=rst_n&&!flush&&!pending;':n('只有沒有舊路徑、且非 reset/flush，才接受新分支；本題不做同拍替換。','Accept a branch only with no old pending work and outside reset/flush; this lab does not support same-edge replacement.'),
  'assign out_valid=rst_n&&!flush&&pending;':n('有 pending 路徑才宣告輸出有效，reset/flush 時不交接。','Assert output valid for pending work, with transfers suppressed during reset/flush.'),
  "assign path_mask=out_valid?(has_then?then_pending:else_pending):4'b0;":n('then 優先輸出，then 空了才輪到 else；無有效輸出時 mask 為零。','Present then before else, with zero mask when invalid.'),
  'assign path_else=out_valid&&!has_then;':n('有效輸出且已無 then，才標示目前是 else。','Mark else only for a valid output with no remaining then path.'),
  'assign last=out_valid&&(!has_then||else_pending==0);':n('目前是 else，或只有 then 而沒有 else，這一筆就是最後一路。','The output is last if it is else or if then is the sole remaining path.'),
  'assign out_tag=tag;':n('沿用這個分支請求保存的 tag，兩條路徑都屬於同一原始工作。','Both paths carry the tag saved for their common branch request.'),
  'if(!rst_n||flush)begin then_pending<=0;else_pending<=0;tag<=0;end':n('reset/flush 丟棄兩條待處理路徑，不產生後續幽靈工作。','Reset/flush discards both paths, preventing ghost work.'),
  'else if(req_valid&&req_ready)begin then_pending<=active&predicate;else_pending<=active&~predicate;tag<=req_tag;end':n('接受時以原 active 篩出 then 和 else；~predicate 仍須和 active 相 AND，不能啟用原本無效的 lane。','On acceptance, form both masks from original active; complementing predicate must not reactivate inactive lanes.'),
  'else if(out_valid&&out_ready)begin if(has_then)then_pending<=0;else else_pending<=0;end':n('只清除已被下游接受的當前路徑；未 ready 時兩個 mask 和 tag 都保持。','Clear only the accepted current path; hold masks/tag during backpressure.'),
 },
 'gpu-occupancy-budget':{
  'integer rb,sb,g;':n('組合計算的整數暫存：register 上限、shared 上限、最後 group 數。','Combinational integer temporaries for register bound, shared bound, and group count.'),
  'groups=0;threads=0;limiting=0;rb=0;sb=0;g=0;':n('先定義所有預設值；非法 regs=0 將直接保留全零輸出。','Default all values; invalid regs=0 retains zero outputs.'),
  'if(regs_per_thread!=0)begin':n('先排除非法配置，避免後面除以零。','Exclude the invalid configuration before dividing.'),
  'rb=64/(4*regs_per_thread);sb=(smem_per_group==0)?33:32/smem_per_group;':n('每 group 四 threads，所以 register 上限為 floor(64/(4*regs))；shared=0 用 33 當不限制的哨兵值，否則 floor(32/shared)。','Four threads per group give floor(64/(4*regs)); zero shared use gets a nonlimiting sentinel 33, otherwise floor(32/shared).'),
  'g=4;if(rb<g)g=rb;if(sb<g)g=sb;':n('四個 slot、register 容量、shared 容量三個上限取最小值。','Take the minimum of four slots and the register/shared capacity bounds.'),
  'groups=g;threads=g*4;limiting[0]=(g==4);limiting[1]=(g==rb);limiting[2]=(smem_per_group!=0&&g==sb);':n('輸出 group 與 thread 數；逐一標記等於最小值的限制，並列時可同時多個 bit=1。shared=0 不列為限制。','Output groups/threads and all tied limiting bounds; unused shared memory is not a limit.'),
 },
 'gpu-memory-coalescer':{
  'integer i,j,n;reg found;reg [15:0] addr;':n('i 走訪 lanes，j 查已加入的 segment，n 記有效 segment 數；addr 暫存本 lane 位址。','i scans lanes, j checks inserted segments, n counts them, and addr holds the current lane address.'),
  'segments=0;seg_valid=0;count=0;align_error=0;addr=0;found=0;n=0;':n('所有輸出先歸零；出錯時就不會留下上一筆的 segment。','Default outputs to zero so an error cannot expose segments from a previous request.'),
  'for(i=0;i<4;i=i+1)if(active[i]&&addresses[i*16+:2]!=0)align_error=1;':n('只檢查 active lane 位址低兩 bit；不等於 0 表示不是 4-byte 對齊，整筆請求拒絕。','Check active addresses’ low two bits; any nonzero value rejects the whole request as misaligned.'),
  'if(!align_error)begin':n('所有 active lane 對齊才開始去重；不能一邊輸出部分交易、一邊才發現錯誤。','Deduplicate only after all active addresses pass alignment, avoiding partial output on error.'),
  'for(i=0;i<4;i=i+1)begin':n('依 lane0→3 順序處理，確保輸出以第一次出現的順序壓緊。','Scan lane0→3 to preserve first-occurrence order in compact output.'),
  'addr=addresses[i*16+:16];found=0;':n('取本 lane 的 16-bit byte address，並重新開始這個 lane 的去重搜尋。','Extract the lane’s 16-bit byte address and restart its duplicate search.'),
  'for(j=0;j<4;j=j+1)if(j<n&&segments[j*12+:12]==addr[15:4])found=1;':n('只比已插入的 j<n 欄位；addr[15:4] 等於 byte address 除以 16 的 segment ID。','Compare only inserted slots j<n. addr[15:4] is the address divided by the 16-byte segment size.'),
  'if(active[i]&&!found)begin segments[n*12+:12]=addr[15:4];seg_valid[n]=1;n=n+1;end':n('active 且未重複才追加 segment、設 valid，再增加 n。不能漏掉 !found，否則同 segment 會發多次。','Append and mark valid only for active nonduplicates, then increment n; omitting !found duplicates transactions.'),
  'count=n;':n('最終不重複 segment 數就是 n，範圍 0–4。','The final unique-segment count is n, from zero to four.'),
 },
 'gpu-shared-bank-conflicts':{
  'integer counts[0:3];integer i,j,bank;reg duplicate;':n('counts 分別計四個 bank 的 distinct words；duplicate 判斷是否可共用一次 broadcast。','counts tracks distinct words in each bank; duplicate detects shared read broadcasts.'),
  'rounds=0;unique_words=0;conflict_lanes=0;duplicate=0;bank=0;':n('先清組合輸出；完全沒有 active lane 時服務輪數為零。','Default outputs; no active lanes means zero service rounds.'),
  'for(i=0;i<4;i=i+1)counts[i]=0;':n('每次重新計算前把四個 bank 的計數清零；這不是跨拍累積的統計。','Reset all four combinational bank counts for this request; these are not persistent counters.'),
  'for(i=0;i<4;i=i+1)begin':n('逐 lane 分析有效的 word 讀取。','Analyze each lane’s word read.'),
  'duplicate=0;':n('每個新 lane 先假設不是重複，再和前面 lanes 比較。','Start each lane as nonduplicate before comparing earlier lanes.'),
  'for(j=0;j<4;j=j+1)if(j<i&&active[j]&&addresses[j*8+2+:6]==addresses[i*8+2+:6])duplicate=1;':n('只看較早且 active 的 lanes；去掉 byte offset 後 word address 相同，就能共用一次讀取。','An earlier active lane with the same word address allows the read to share a broadcast.'),
  'if(active[i]&&!duplicate)begin bank=addresses[i*8+2+:2];counts[bank]=counts[bank]+1;unique_words=unique_words+1;end':n('新的有效 word 依 addr[3:2] 選 bank，再增加該 bank 與總 distinct word 計數。','Map each new active word by addr[3:2] and increment its bank count and the total unique count.'),
  'for(i=0;i<4;i=i+1)if(counts[i]>rounds)rounds=counts[i];':n('不同 bank 可平行，所以總服務輪數取最忙 bank 的 word 數，而不是四個 bank 加總。','Banks operate in parallel, so total rounds are the maximum bank count, not their sum.'),
  'for(i=0;i<4;i=i+1)if(active[i]&&counts[addresses[i*8+2+:2]]>1)conflict_lanes[i]=1;':n('active lane 所在 bank 有多個 distinct words，就標記有衝突；包括同 bank 裡共享 broadcast 的 lane。','Flag active lanes whose bank has multiple distinct words, including their broadcast partners.'),
 },
 'gpu-stall-counters':{
  'if(!rst_n||clear)begin issue_cycles<=0;idle_cycles<=0;memory_cycles<=0;dependency_cycles<=0;unit_cycles<=0;end':n('reset 或 clear 優先把五個計數器清零，即使 sample_enable=1 也不累加。','Reset/clear zero all five counters before sampling, even if sample_enable is high.'),
  'else if(sample_enable)begin':n('只有啟用採樣才分類；未啟用時所有計數器保持。','Classify only enabled samples; otherwise hold all counters.'),
  "if(issued)begin if(issue_cycles!={COUNT_WIDTH{1'b1}})issue_cycles<=issue_cycles+1'b1;end":n('最高優先分類為本拍有發射；只有還沒到全 1 上限才加一，避免回捲。{N{bit}} 是重複 N 次。','Issued cycles have highest priority. Increment only below the all-ones maximum; {N{bit}} replicates a bit N times.'),
  "else if(!resident_any)begin if(idle_cycles!={COUNT_WIDTH{1'b1}})idle_cycles<=idle_cycles+1'b1;end":n('沒有 issue 且沒有駐留工作，才計 idle；else if 保證一拍不會重複算多類。','Count idle only with no issue and no resident work; else-if makes classification exclusive.'),
  'else if(!eligible_any)begin':n('有駐留但沒有就緒候選時，再區分等待記憶體或其他資料相依。','For resident but ineligible work, distinguish memory waiting from other dependencies.'),
  "if(memory_wait)begin if(memory_cycles!={COUNT_WIDTH{1'b1}})memory_cycles<=memory_cycles+1'b1;end":n('無就緒候選且 memory_wait=1，只增加 memory 類，並各自做飽和保護。','With memory_wait and no eligible candidate, increment only the saturating memory counter.'),
  "else begin if(dependency_cycles!={COUNT_WIDTH{1'b1}})dependency_cycles<=dependency_cycles+1'b1;end":n('同一分支內 memory_wait=0，歸為其他 dependency 等待，不是再加一次 memory。','Without memory_wait, classify as another dependency rather than memory.'),
  "end else begin if(unit_cycles!={COUNT_WIDTH{1'b1}})unit_cycles<=unit_cycles+1'b1;end":n('有 eligible 卻沒 issue，這個縮小模型歸為 unit/issue backpressure；不等於廠商 profiler 的所有正式分類。','Eligible but unissued work is unit/issue backpressure in this reduced model, not a universal profiler taxonomy.'),
 },
};

export function referenceLineNote(line:string,challenge:Challenge,spec:LabSpec):Localized|null {
 const code=line.trim(); if(!code)return null;
 const exact=gpuLineNotes[challenge.id]?.[code];if(exact)return exact;
 if(code.startsWith('module '))return b('宣告模組名稱與介面；parameter 是編譯／實例化時的設定，不是執行時輸入。','Declare the module/interface; parameters are elaboration-time settings, not runtime inputs.');
 const port=code.match(/^(input|output)\s+(?:wire|reg)\s+(?:\[[^\]]+\]\s+)?(\w+)\s*,?$/);
 if(port&&spec.ports[port[2]])return spec.ports[port[2]];
 if(code===');')return b('介面宣告結束，下面開始描述內部電路。','End the interface declaration; internal circuitry follows.');
 if(code==='endmodule')return b('本模組定義結束；沒有新增操作或時脈週期。','End this module; no extra operation or clock cycle is introduced.');
 if(code==='always @* begin')return b('輸入或相關訊號改變就重算的組合邏輯；使用 blocking assignment，所有路徑要有定義。','Combinational logic recomputed when inputs change; use blocking assignments and define all paths.');
 if(/^always @\(posedge clk\)\s*begin$/.test(code))return b('只在 clk 上升緣執行的時序邏輯；暫存狀態通常使用 <= 更新。','Sequential logic evaluated on rising clk edges; state normally uses nonblocking updates.');
 if(code==='else begin')return b('前面的 if 條件不成立，才執行這個分支。','Execute this branch only when the preceding if condition is false.');
 if(code==='endcase')return b('結束 opcode 的 case 選擇。','End the opcode case selection.');
 if(code==='end')return b('結束目前這一層 begin/end 區塊；它不表示多等待一個 clock。','Close the current begin/end block; this does not wait another clock.');
 return null;
}
