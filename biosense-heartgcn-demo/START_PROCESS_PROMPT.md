# Kickoff Prompt: Biomedical Conduction-Velocity Verification Demo

Use the `wolfram-mathematica` skill and the relevant C/C++/Parasoft guidance to build an end-to-end research-paper verification demonstrator from:

`C:\Amp_demos\Biosense-19-7-2026\ieee-biomed-heart.pdf`

Create the project under:

`C:\Amp_demos\Biosense-19-7-2026\heart-cv-verification`

## Goal

Reproduce and verify the paper's triangle-based conduction-velocity algorithm using a traceable workflow:

1. paper claim extraction and issue ledger
2. normalized mathematical specification
3. executable Mathematica reference model and notebook
4. selective Lean 4 formal verification of central exact properties
5. frozen verified baseline and exported test vectors
6. standalone C++ implementation of the mathematical kernel
7. Mathematica-to-C++ differential and property testing
8. Parasoft C/C++test static analysis, unit/runtime testing, and coverage
9. final traceability and evidence report

The result is a technical demonstration, not a clinically validated medical product.

## Scope

Implement the paper's core conduction-velocity workflow:

- three non-collinear 3D electrode points and their local activation times
- triangle geometry and angle calculation
- conduction-speed calculation
- in-plane conduction direction/vector construction
- all four triangle-acceptance filters:
  - every vertex distance is at least 3 mm
  - activation time exists for all vertices
  - at least two side activation-time differences are at least 3 ms
  - circumcircle-area/triangle-area ratio is less than 10
- synthetic planar wavefront generation with known speed and direction
- controlled noise, near-degenerate, boundary, and invalid-input cases

Do not initially implement the Qt GUI, VTK clinical rendering, EnSite import, MRI registration, or patient-specific clinical analysis.

## Phase 1 — Paper analysis

Read the full four-page paper before coding. Produce:

- `docs/claim_ledger.md`
- `docs/paper_issue_ledger.md`
- `docs/normalized_specification.md`
- `docs/data_availability_and_limitations.md`

Record equation, figure, and section references. Separate paper-stated assumptions from assumptions added by the implementation.

Explicitly investigate these interpretation risks:

1. The printed `tan(alpha)` expression must be reconstructed with unambiguous parentheses and checked dimensionally.
2. The paper uses `v` for both scalar speed and a later vector construction. Determine whether `xpq - xps` is only a direction vector or should be normalized and scaled by the computed speed. Do not silently choose a convention; derive it, document it, and test it.
3. Define orientation, activation-time sign, vertex ordering, unit conversion, and behavior for simultaneous activation.
4. Define handling for collinear/nearly collinear points, zero time differences, `acos` arguments outside `[-1,1]` because of rounding, and small `sin(theta)`.

## Phase 2 — Mathematica reference project

Create a reusable Wolfram project, not only an inline notebook. Include at minimum:

- `HeartCVNotebook.nb`
- `src/HeartCVModel.wl`
- `build_project.wls`
- `proof_audit.wls`
- `README.md`
- `exports/validation_results.json`
- `exports/audit_report.txt`
- `exports/reference_vectors.csv`
- `exports/boundary_vectors.csv`
- `exports/differential_test_manifest.json`
- exported figures showing accepted/rejected triangles, recovered wavefront vectors, error versus noise, and near-degenerate behavior

The Mathematica model must:

- use exact arithmetic where practical and high precision for the numerical oracle
- implement each filter independently and as a combined decision
- generate deterministic synthetic wavefront datasets with `SeedRandom[42]`
- recover known wavefront speed and direction
- quantify angular and speed error
- test nominal, boundary, invalid, noisy, and near-singular cases
- reproduce the paper's algorithmic geometry without claiming reproduction of unavailable clinical results

Run the build and audit. Do not proceed to freeze the baseline until they pass and all required exports are non-empty.

## Phase 3 — Lean 4 formal-verification lane

Use a pinned Lean 4 and Mathlib project under `lean/`. Formalize only claims that provide meaningful independent assurance. Target, where feasible:

- triangle non-collinearity implies a nonzero cross-product norm
- the normalized triangle normal is orthogonal to both triangle edges
- the constructed perpendicular component is orthogonal to the selected edge
- the resulting direction lies in the triangle plane
- the circumcircle-area/triangle-area quality ratio is invariant under uniform scaling
- under explicit idealized assumptions, a constant planar wavefront is recovered by the three-point formulation
- any optimized formula used by C++ is equivalent to the normalized mathematical specification

Do not use unresolved `sorry`, `admit`, hidden axioms, or floating-point approximation as a substitute for proof. If a target is disproportionate or blocked by library theory, report it honestly instead of weakening the statement silently.

Create `docs/formalization_map.md` mapping each paper claim to its normalized statement, Mathematica function, Lean theorem, assumptions, and status. Run `lake build` and capture the result in `exports/lean_build_report.txt`.

## Phase 4 — Freeze the model baseline

After Mathematica validation and the selected Lean build:

- record tool versions and source hashes
- freeze deterministic golden, boundary, and invalid test vectors
- define the C++ API and numerical contract
- define output-specific absolute, relative, angular, or ULP tolerances
- document millimetre/millisecond to metre/second conversions

Do not choose one broad tolerance merely to make all cases pass.

## Phase 5 — C++ implementation

Create a small standalone C++ mathematical kernel with CMake. Keep it independent of Qt and VTK. Separate:

- geometry and conduction calculations
- triangle filtering
- unit conversion
- input validation and error reporting
- test-vector I/O

Use the repository's supported C++ standard and compiler conventions. Avoid undefined behavior, implicit narrowing, unchecked indexing, and unhandled non-finite values. Document floating-point and convergence behavior.

## Phase 6 — Differential, property, and robustness tests

Create C++ tests that consume Mathematica's exported vectors and compare results using the approved tolerance policy. Add property tests derived from the normalized specification and Lean results, including:

- normal and edge orthogonality
- in-plane direction
- scale invariance where applicable
- speed non-negativity under documented assumptions
- vertex-permutation consistency
- known planar-wave recovery
- independent behavior of all four filters

Add robustness tests for collinearity, near-collinearity, zero/small time differences, invalid `acos` inputs, small `sin(theta)`, NaN, infinity, overflow/underflow, and threshold values immediately below, at, and above 3 mm, 3 ms, and ratio 10.

Generate `exports/cpp_comparison_results.csv` and a human-readable cross-language report. Investigate systematic disagreement; do not hide it by widening tolerances.

## Phase 7 — Parasoft C/C++test

Run Parasoft C/C++test against the C++ kernel and tests using the available project policy. Include:

- static analysis appropriate to the project, with CWE/CERT and any required MISRA C++ or AUTOSAR rules
- unit and property test execution
- runtime error detection where supported
- statement, branch, condition, and required MC/DC coverage

Resolve findings or document each suppression with technical justification and claim/requirement traceability. Save reports under `reports/parasoft/`. If Parasoft cannot be invoked in the environment, prepare the exact project configuration and commands, mark execution as blocked, and do not claim that it passed.

## Phase 8 — Final evidence and release gate

Create `docs/traceability_matrix.md` linking:

`paper claim -> normalized requirement -> Mathematica evidence -> Lean evidence -> C++ function -> test IDs -> Parasoft evidence -> final status`

Create `exports/final_validation_report.md` that clearly distinguishes:

- formally proved
- symbolically verified
- numerically validated
- C++ implementation verified
- not reproduced because clinical data is unavailable
- blocked or requiring additional assumptions

The release gate requires:

1. Mathematica package, notebook build, and paper-specific audit pass.
2. Required Mathematica exports exist and are non-empty.
3. Selected Lean proofs compile without placeholders.
4. C++ builds cleanly with strict warnings.
5. Golden, boundary, property, and robustness tests pass.
6. Mathematica and C++ agree within justified tolerances.
7. Parasoft requirements pass or are explicitly reported as blocked—not silently omitted.
8. Every major claim has an evidence status.
9. Added assumptions and unavailable clinical data remain visible.

Perform an adversarial self-review before delivery. Report exact commands run, files created, validation results, unresolved limitations, and the smallest next action for any blocked item.
