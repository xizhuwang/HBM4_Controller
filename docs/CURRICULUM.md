# Advanced controller RTL curriculum

This is the second-stage course after `rtl-interview-lab`. It intentionally does not repeat generic counters, FIFOs, CDC synchronizers, AXI register slices, introductory verification, or other foundation exercises. The 42 labs turn those prerequisites into memory and PCIe controller mechanisms.

## How to complete a lab

A passing testbench is only the first gate. For every lab, produce five pieces of evidence:

1. a cycle-accurate interface and state contract;
2. a failing waveform and its root cause;
3. the corrected RTL and passing regression;
4. answers to the two design-review questions in the site;
5. one assertion, one cover scenario, and one PPA or scalability trade-off.

This is what makes the work useful in an interview: you can explain why the block exists, where it sits, which state it owns, what must never happen, and where the digital controller ends at the PHY boundary.

## Stage 1 — Generic DRAM command core (labs 1–8)

Build the path:

`address mapping → bank metadata → tRCD/timing deadlines → legal-candidate filtering → FR-FCFS/write drain/refresh policy → PRE/ACT/RD command generation`

Exit evidence:

- separate correctness constraints from performance policy;
- update timing state only on accepted command issue;
- explain timestamp, countdown, and shift-register implementations;
- define refresh deadline, starvation, row-hit, and bus-direction priorities;
- show how one-bank logic replicates and how global shared constraints are added.

## Stage 2 — HBM4 hierarchy and command legality (labs 9–25)

Build the path:

`address/PC decode → dual command-slot gate → bank state → row/column timing scoreboards → hierarchical arbitration → REF/RFM/DRFM maintenance → MRS/parity/power sequencing → 32-channel dispatch → dual-issue channel capstone`

The seventeen HBM labs are organized as six review gates:

1. **Organization (9–11):** pseudo-channel mapping, shared-command slot ownership, and explicit bank/open-row state.
2. **Core timing (12–15):** ACT→column delay, bank-group spacing, rolling activation window, and read/write turnaround.
3. **Scheduling (16):** local PC arbitration with a channel-level winner and commit-qualified state updates.
4. **Maintenance (17–20):** refresh credit/deadline, per-PC refresh domains, RAA-based RFM, and DRFM capture/drain sequencing.
5. **Configuration/RAS/power (21–23):** quiescent MRS, CA parity/AERR behavior, and safe power-state entry/exit.
6. **Stack integration (24–25):** 32-channel/64-PC/1024-bank steering followed by an independent row/column dual-issue capstone.

Each lab includes a topic-level trace to JESD270-4A. Numeric windows are intentionally reduced for executable learning; an implementation must load the applicable speed-bin, mode-register, PHY, package, and system values rather than treating the teaching constants as product parameters.

Exit evidence:

- explain why a flat 1024-bank arbiter is a timing and routing problem;
- identify per-bank, per-bank-group, per-PC, per-channel, and stack-wide state;
- prove one-hot issue and no issue from a timing- or refresh-blocked domain;
- propose pipeline cuts and explain how priority snapshots survive them;
- distinguish HBM controller RTL from PHY, microbump, interposer, SI/PI, and thermal work.

## Stage 3 — LPDDR control plane (labs 26–29)

Build the path:

`initialization/training contract → request admission → scheduler drain → low-power/DVFS handshake → DFI/PHY status → normal operation`

Exit evidence:

- order clock gating, isolation, power, power-good, and restore safely;
- demonstrate that accepted work drains before sleep or frequency change;
- define timeout, retry, rollback, and firmware-visible error behavior;
- identify retention state and CDC/RDC crossings;
- explain which training behavior is digital sequencing and which belongs in the PHY.

## Stage 4 — GDDR high-speed data path (labs 30–33)

Build the path:

`bank-aware scheduler → asymmetric direction guard → command parity → CRC retry ownership → PHY-ready commit gate`

Exit evidence:

- derive turnaround from command/data edges and burst behavior;
- preserve payload ownership until ACK and replay the identical transaction;
- define retry priority and avoid deadlock or starvation;
- explain parity/CRC coverage limits and error escalation;
- separate logical reliability state from IO sampling, equalization, and channel margin.

## Stage 5 — PCIe layered controller (labs 34–42)

Build the path:

`AXI/DMA request → TLP route → flow-control credit + tag atomic admission → DLL sequence/replay → completion match/reorder → LTSSM traffic gate → response`

Exit evidence:

- keep Transaction Layer, Data Link Layer, LTSSM/MAC, and PIPE responsibilities separate;
- account independently for posted, non-posted, and completion resources;
- prove no credit underflow, no duplicate tag ownership, and exactly-once completion;
- explain replay as retransmission of the same packet rather than a new transaction;
- define reset, FLR, Recovery, timeout, late completion, and malformed-packet behavior.

## Senior-level portfolio gate

Completing the site is evidence of senior-oriented practice, not an automatic job-title guarantee; it should be accompanied by an integration repository. Compose the capstone blocks into a parameterized controller subsystem with CSRs, error telemetry, assertions, a behavioral PHY/memory/link model, requirement-to-test traceability, constrained-random planning, lint/CDC/RDC/formal/synthesis/STA reports, and one written root-cause investigation.

The repository can reach an RTL/DV sign-off-candidate baseline. A silicon claim additionally needs the licensed product standard and errata, actual PHY/DFI/PIPE contract, technology libraries, UPF/DFT/APR/MMMC sign-off, package/interposer and SI/PI/thermal models, compliance testing, and organizational approval described in `SIGNOFF_BOUNDARY.md`.
