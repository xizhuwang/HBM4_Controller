# Memory Controller RTL Lab

[繁體中文](#繁體中文) · [English](#english)

## 繁體中文

這是一套可直接在瀏覽器撰寫、編譯、模擬與檢視波形的 Controller RTL 互動式課程。專案由 26 題 RTL／CDC／timing／SoC／verification／PPA 基礎題，加上 14 題 DRAM／HBM／LPDDR／GDDR／PCIe controller 題組成，共 40 題。

它的目標不是用「做完題目」取代工作年資，而是把面試與實務會要求的能力變成可重現證據：規格拆解、cycle-accurate RTL、protocol/timing guard、self-checking testbench、波形除錯、合成比較，以及 sign-off 邊界判斷。

線上版（啟用 GitHub Pages 後）：`https://xizhuwang.github.io/HBM4_Controller/`

### 課程涵蓋

| 路徑 | 主題 | 代表題目 |
|---|---|---|
| RTL 基礎 | edge detect、counter、latch/debug | reset、邊界與完整賦值 |
| CDC/RDC | 2-FF、reset release、toggle、Gray pointer、async FIFO | metastability containment、bus coherence |
| Timing/PPA | pipeline、balanced tree、valid/tag retiming、hold repair | latency contract、max/min timing、generic synthesis |
| SoC/AXI | APB、AXI4-Lite、AXI read burst、SRAM wrapper、arbitration | back-pressure、memory-mapped control、IP integration |
| DRAM | address mapping、per-bank FSM、tRCD guard、FR-FCFS、refresh deadline、write draining | command legality、scheduler policy、refresh correctness |
| HBM | pseudo-channel mapping、bank-group tCCD | channel hierarchy、same/different bank-group constraints |
| LPDDR/GDDR | low-power sequence、read/write turnaround | power isolation ordering、direction-change timing |
| PCIe | credit manager、tag tracker、replay timer | flow control、non-posted tracking、reliability |
| Verification | scoreboard、formal miter、SAT/CNF、UVM structure、exactly-once completion | assertion mindset、transaction accounting |

完整的修課順序、每階段輸出與面試證據請見 [課程地圖](docs/CURRICULUM.md)。

### 線上互動功能

- 繁體中文／英文題目、規格、提示與職務對應。
- 瀏覽器內 Icarus Verilog 編譯與 self-checking simulation。
- VCD 波形檢視，讓失敗能以 cycle-by-cycle 訊號證明。
- 瀏覽器內 Yosys generic-cell 統計，用同一工具版本比較 RTL 相對複雜度。
- localStorage 保存程式、分數與完成進度；沒有上傳程式碼的後端。
- GitHub Pages 自動執行完整 regression、production build 與 release audit 後才部署。

### 本機開發

需求：Node.js 22.13+、pnpm 10。

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build:github
pnpm dev
```

`pnpm test` 會準備固定版本的瀏覽器工具並執行題庫檢查。詳細驗證項目見 [TESTING.md](TESTING.md)。

### GitHub Pages

1. 在 repository 的 **Settings → Pages → Build and deployment** 選擇 **GitHub Actions**。
2. push 到 `main`。
3. `.github/workflows/deploy-pages.yml` 會依序執行 install、177 項課程 regression、GitHub Pages build、release audit，成功後部署 `gh-pages/`。

若 repository 改名，請同步修改 `vite.github.config.ts` 的 `base`。

### 「可下線」的正確定義

本 repository 能提供的是 **RTL/DV sign-off candidate baseline**：可綜合的練習答案、明確介面契約、自動測試、版本固定的工具、license audit 與可重現 build。它不能單獨宣稱 silicon tapeout-ready，也不會重製非公開的 JEDEC 或 PCI-SIG 規範全文。

真正的 HBM／LPDDR／GDDR／PCIe silicon sign-off 還需要合法取得的標準與 compliance plan、實際 PHY hard macro/DFI 或 vendor interface、training firmware、CDC/RDC/lint/formal、STA/MMMC、UPF、DFT、APR、IR/EM、DRC/LVS、package/interposer/PI/SI/thermal model，以及 foundry、PHY vendor 與系統實驗室的簽核。詳細 gate checklist 見 [SIGNOFF_BOUNDARY.md](docs/SIGNOFF_BOUNDARY.md)。

因此，完成全部課程可作為應徵與能力審查的作品證據，但不自動等同「資深工程師」職級。資深程度仍需能在真實專案中處理模糊規格、跨團隊決策、corner-case failure、PPA/sign-off trade-off 與量產問題。

## English

Memory Controller RTL Lab is a browser-based course for writing, compiling, simulating, debugging, and comparing controller RTL. It contains 40 challenges: 26 foundations in RTL, CDC, timing, SoC integration, verification, and PPA, plus 14 controller labs covering DRAM, HBM, LPDDR, GDDR, and PCIe.

The course produces reproducible evidence of specification decomposition, cycle-accurate RTL, protocol and timing guards, self-checking verification, waveform debugging, and synthesis reasoning. It does not claim that completing a challenge set substitutes for senior-level project ownership.

### Development

Requires Node.js 22.13+ and pnpm 10.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build:github
pnpm dev
```

The GitHub Pages workflow runs the complete regression, production build, and release audit before deployment. See [TESTING.md](TESTING.md), [the curriculum](docs/CURRICULUM.md), and [the sign-off boundary](docs/SIGNOFF_BOUNDARY.md).

### Scope

The project is an RTL/DV sign-off candidate baseline, not a claim of silicon tapeout readiness. Actual HBM, LPDDR, GDDR, or PCIe products require licensed specifications, a real PHY and integration contract, firmware and training, full CDC/RDC/lint/formal/STA/UPF/DFT/physical verification, package and SI/PI/thermal models, and sign-off by the foundry and relevant vendors.

## License

Project code is GPL-3.0-or-later. Browser compiler components retain their respective licenses; see `public/THIRD_PARTY_NOTICES.txt`.
