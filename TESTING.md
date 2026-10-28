# Verification and release gates

The course treats every exercise as an executable contract. A release is accepted only when the curriculum checks, static site build, and artifact audit all pass.

## Automated regression

```bash
pnpm test
```

The current suite checks all 65 bilingual controller/system/GPU challenges (the final check total is printed by the runner):

- challenge IDs and order are unique, contiguous, and the expected count is exactly 65;
- none of the foundation challenge IDs from `rtl-interview-lab` are reused;
- every protocol track has a multi-stage path and a complete architecture diagram;
- every lab resolves to a highlighted block, explains why it exists, states the PHY/analog boundary, and includes senior design-review questions;
- every lab has a complete implementation micro-spec, at least one cycle example, and ordered behavior rules;
- every HBM lab has a bilingual JESD270-4A topic trace and clearly labels its reduced educational timing/profile values;
- every HBM lab starts with a bilingual plain-language goal and analogy, resolves every glossary term, and provides a complete circuit flow, expected waveform, and incremental coding recipe;
- every Verilog port parsed from the starter module has a bilingual definition, with no nonexistent “ghost” ports in the spec;
- every challenge has Chinese and English content, specifications, test groups, hints, starter code, and an explicit judge type;
- all simulation reference solutions compile and pass their self-checking testbench;
- intentionally incomplete starter implementations fail rather than receiving false passes;
- nine compiling GPU mutations are rejected during simulation: inactive-lane execution, blocked-stage overwrite, missing busy allocation, uncommitted rotation, inactive-mask revival, capacity error, duplicate coalescing, broadcast conflict, and saturation wrap;
- `node scripts/check-labs.mjs --gpu` runs a focused GPU check using the already-prepared engine; the full `pnpm test` remains the release gate;
- timeout/watchdog handling rejects non-terminating simulations;
- VCD-producing exercises emit parseable waveform data;
- browser engine manifests, integrity metadata, and licenses are present.

## Production build

```bash
pnpm build:github
node scripts/release-audit.mjs
```

The build must create `gh-pages/index.html`, hashed static assets, the browser runner, compiler manifest, licenses, and third-party notices. The audit rejects missing release files and unapproved remote runtime dependencies.

## Manual browser acceptance

Before tagging a release, check both desktop and narrow/mobile widths:

1. Chinese/English switching changes titles, specifications, hints, and guidance.
2. Track filtering and text search select only matching challenges.
3. Editing and reset work without navigating away.
4. A correct RTL solution passes; a syntax error reports a compile failure; a functional error reports a simulation failure.
5. Every lab produces a downloadable VCD with expected signal transitions.
6. Yosys reports generic cells for the user and reference implementation.
7. Reload preserves local progress and edited code.
8. The site works under `/HBM4_Controller/`, not only at domain root.
9. Source, license, privacy, and third-party links resolve.
10. The layout toolbar contains only the Focus mode toggle, which controls both panels; preferences survive reload and results remain available when focused.
11. The GPU guide has eight topic selectors and 24 total expandable reference answers, assessment criteria, and follow-up answers, showing only one topic at a time. The first answer is open by default and the remaining questions have explicit Show answer controls. Each topic has a visual; SIMD masks, scoreboard completion, latency hiding, occupancy and memory controls update correctly. Links to all nine executable exercises work.
12. GPU lab URLs restore the selected exercise, and source links explain vendor/teaching-model boundaries.
13. The page never describes a browser pass as CDC, STA, APR, protocol-compliance, or silicon sign-off.

## Controller RTL acceptance model

Passing a lab proves only the contract encoded in that lab. A production controller block should additionally have:

- traceable requirements and legal/illegal command tables;
- synthesizable assertions or bindable SVA for safety and liveness;
- constrained-random and directed regressions with functional coverage;
- reference-model comparison and exactly-once transaction accounting;
- lint, CDC/RDC, formal, synthesis, and multi-corner STA reports;
- reset, clock, power, error injection, retry, recovery, and observability plans;
- versioned waiver ownership and zero unexplained failures.

The complete silicon boundary is documented in `docs/SIGNOFF_BOUNDARY.md`.


## GPU reference learning material

- `pnpm traces:gpu` regenerates nine small reference VCDs using the same pinned Icarus engine. Each teaching testbench self-checks its stated scenario.
- Every nonempty line of each GPU reference has a bilingual explanation; ports use the precise micro-spec definitions.
- Reference traces are checked against source/testbench hashes and saved-VCD integrity hashes. The teaching scenarios also run during regression.
- Reference diagrams are clearly separate from the learner's regression waveforms. Combinational labs explicitly have no clock.
- Glossary terms and per-topic term IDs must be complete and resolvable.
- Browser acceptance: an unsolved exercise can open its complete reference; the GPU line/code/timing views work; switching back preserves edited code and progress; copying is explicit; reference viewing does not award a pass. Shader/LSU definitions and glossary search work in both languages.
