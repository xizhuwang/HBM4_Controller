# Controller RTL curriculum

This curriculum turns the 40 browser exercises into an implementation and interview portfolio. The ordering is intentional: do not begin the protocol-specific labs until the underlying CDC, transaction, and timing contracts are understood.

## Stage 1 — Deterministic RTL

Complete exercises 1–3, then write a one-page microarchitecture note for each module containing interface timing, reset behavior, state, corner cases, and one rejected alternative.

Exit evidence:

- no inferred latch or accidental wrap-around;
- cycle-by-cycle explanation of nonblocking assignment semantics;
- a self-checking testbench that detects the original defect.

## Stage 2 — CDC and reset ownership

Complete exercises 4–8 and the async FIFO exercise. Draw the source and destination clock domains, synchronizer placement, reconvergence risks, reset convergence, and assumptions on event rate.

Exit evidence:

- can distinguish a level, pulse, counter, and multi-bit data crossing;
- can explain why two flip-flops reduce metastability propagation but do not make buses coherent;
- can state what must be constrained and reviewed by CDC/RDC tools.

## Stage 3 — Timing, latency, and PPA

Complete exercises 9–12 and the PPA exercises. For each transformation, document the external latency contract and whether throughput changed.

Exit evidence:

- can diagnose setup versus hold without proposing a frequency change for hold;
- keeps data, valid, ID, tag, byte enable, and error metadata aligned;
- treats generic cell count as a relative experiment, not process area.

## Stage 4 — SoC and AXI integration

Complete APB, arbitration, AXI4-Lite, AXI burst, and SRAM-wrapper exercises. Extend one block with sticky error status, interrupt clear semantics, and illegal-access handling.

Exit evidence:

- handles independent AXI address/data handshakes and back-pressure;
- separates control plane, data plane, and completion/error reporting;
- can define a register map consumable by RTL, DV, firmware, and documentation.

## Stage 5 — DRAM controller core

Complete address mapping, bank FSM, tRCD, FR-FCFS, refresh deadline, and write-drain exercises.

Build a design document that traces each candidate command through:

`request admission → address decode → queue → bank state → timing scoreboards → refresh arbitration → command issue → response`

Exit evidence:

- distinguishes correctness constraints from performance policy;
- never allows row-hit preference to violate age, refresh, or timing requirements;
- explains global, rank/channel, bank-group, and per-bank timing state;
- defines progress/fairness properties, saturation rules, and recovery behavior.

## Stage 6 — HBM, LPDDR, and GDDR specialization

Complete pseudo-channel mapping, bank-group spacing, LPDDR power sequencing, and GDDR turnaround.

Exit evidence:

- treats HBM pseudo-channels as a scheduling hierarchy, not merely address bits;
- maintains same/different bank-group timing without a monolithic 1024-bank comparator;
- orders drain, clock gating, isolation, power state, power-good, and restore safely;
- distinguishes controller RTL from PHY training and analog/package responsibilities.

The numeric delays in the labs are reduced educational profiles. Product values must come from the licensed standard, selected speed bin, vendor PHY contract, operating corner, and system configuration.

## Stage 7 — PCIe controller mechanisms

Complete flow-control credit, tag tracking, and replay timer exercises. Then define three independent accounting domains: posted, non-posted, and completion traffic.

Exit evidence:

- cannot underflow advertised credits;
- detects duplicate allocation, unknown completion, and exactly-once violations;
- can explain sequence/replay responsibility and timer priority;
- knows that these exercises cover controller mechanisms, not a complete PCIe transaction/data-link/physical-layer implementation or compliance claim.

## Stage 8 — Verification ownership

Complete scoreboard, formal miter, CNF/SAT, UVM-structure, bit-true, and completion-checker exercises.

For a portfolio release, attach:

- requirement-to-test traceability table;
- assertion list and cover properties;
- directed corner-case matrix and constrained-random plan;
- coverage closure note;
- lint/CDC/RDC/formal/synthesis/STA summaries;
- one root-cause report with failing waveform, minimal reproducer, fix, and regression test.

## Capstone expected of an experienced candidate

Implement a parameterized, single-channel controller subsystem with AXI request acceptance, address mapping, read/write queues, per-bank state, hierarchical timing guards, refresh, write draining, tagged completion, CSR/error reporting, and bindable assertions. Verify it against a behavioral memory model and a transaction-level reference scheduler.

The capstone is “interview-complete” when another engineer can clone the repository, run one command, reproduce every result, and trace each important behavior to a written requirement. It becomes a silicon sign-off candidate only after the gates in `SIGNOFF_BOUNDARY.md` are satisfied for a real technology, PHY, package, and product configuration.
