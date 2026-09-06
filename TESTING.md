# Verification and release gates

The course treats every exercise as an executable contract. A release is accepted only when the curriculum checks, static site build, and artifact audit all pass.

## Automated regression

```bash
pnpm test
```

The current suite performs 230 checks across 30 bilingual advanced challenges:

- challenge IDs and order are unique, contiguous, and the expected count is exactly 30;
- none of the foundation challenge IDs from `rtl-interview-lab` are reused;
- every protocol track has a multi-stage path and a complete architecture diagram;
- every lab resolves to a highlighted block, explains why it exists, states the PHY/analog boundary, and includes senior design-review questions;
- every challenge has Chinese and English content, specifications, test groups, hints, starter code, and an explicit judge type;
- all simulation reference solutions compile and pass their self-checking testbench;
- intentionally incomplete starter implementations fail rather than receiving false passes;
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
10. The page never describes a browser pass as CDC, STA, APR, protocol-compliance, or silicon sign-off.

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
