# Sign-off boundary

## What this repository can demonstrate

- deterministic synthesizable RTL patterns;
- protocol and timing-rule decomposition into executable guards;
- self-checking simulation, waveform debugging, structural checks, and basic formal concepts;
- reproducible browser build and regression;
- awareness of transaction ordering, refresh, low power, credit, tag, and replay mechanisms.

These are prerequisites for controller ownership. They are not sufficient evidence that a physical product is ready to manufacture.

## Required gates for a real controller IP

| Gate | Required evidence |
|---|---|
| Specification | Licensed applicable standards, product profile, speed bins, legal command/state tables, requirement IDs, errata process |
| Architecture | bandwidth/latency model, queue sizing, starvation bounds, refresh/RAS policy, clock/reset/power architecture, error containment |
| PHY integration | selected PHY hard macro or chiplet interface, DFI/vendor contract, calibration/training firmware, reset/clock sequence, loopback/BIST |
| Functional DV | executable reference model, constrained-random regression, assertions, coverage closure, error injection, performance tests |
| Static/Formal | zero unexplained lint, CDC, RDC and formal failures; reviewed waivers with owner and rationale |
| Logic implementation | synthesis constraints, equivalence, scan/DFT, MBIST, UPF/low-power checks, ECO strategy |
| Physical sign-off | MMMC STA, SI-aware timing, IR/EM, power, congestion, antenna, DRC/LVS/ERC, extraction and foundry-qualified decks |
| 2.5D/3D package | bump map, interposer/package routing, SI/PI, power delivery, thermal/mechanical, warpage and manufacturing constraints |
| Compliance | JEDEC or PCI-SIG test plan as applicable, interoperability matrix, lab equipment, margining and documented pass criteria |
| Production | boot/training telemetry, diagnosability, yield and reliability data, firmware compatibility, field update and failure-analysis plan |

## HBM-specific boundary

An FPGA such as PYNQ-Z2 can host time-scaled logical controller RTL and a behavioral memory/PHY model. It cannot directly become an HBM4 physical interface: it does not provide the HBM stack microbump interface, licensed HBM PHY hard macro, interposer, channel training, or package power/thermal environment. Do not assign abstract HBM signals to arbitrary FPGA pins or present FPGA timing as HBM4 electrical compliance.

## Standards handling

The public course uses independently written reduced profiles. It intentionally does not copy normative tables, diagrams, pin definitions, or protected compliance material from JEDEC, PCI-SIG, vendor PHY documentation, or confidential company specifications. Product implementations must trace to lawfully obtained source documents and record the exact revision and errata used.

## Release language

Use these claims:

- “browser-verified educational RTL” after the automated lab regression passes;
- “RTL sign-off candidate” only after project-specific lint, CDC/RDC, formal, synthesis, and STA evidence is reviewed;
- “tapeout-ready” only after all applicable front-end, physical, package, compliance, and organizational sign-offs are complete.

Never infer a job title, standard compliance, or tapeout readiness solely from course completion.
