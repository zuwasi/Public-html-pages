# MantiQ QPE bounded evidence

Independent educational code for the ideal, noiseless Quantum Phase Estimation (QPE) distribution. It supports a separate public presentation and gate simulator; it is not copied from private MantiQ sources.

Reference: IBM Quantum Learning, [Phase estimation procedure](https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/phase-estimation-and-factoring/phase-estimation-procedure).

## Derivation and assumptions

For `m` estimation qubits, let `N = 2^m`, `0 <= phi < 1`, and outcome `y` be displayed as an `m`-bit MSB-first string. The inverse-QFT amplitude and probability are

`a_y = (1/N) sum_{x=0}^{N-1} exp(2 pi i x (phi-y/N))`,  `p_y = |a_y|^2`.

Writing `delta = phi-y/N`, the finite geometric series independently gives

`p_y = [sin(pi N delta)/(N sin(pi delta))]^2`,

with its continuous limiting value `1` when `delta` is an integer. For orthogonal eigenstates with phases `phiA`, `phiB` and population weight `w`, tracing out the eigenstate register removes cross terms, so the marginal is `w p(phiA) + (1-w) p(phiB)`. Assumptions: orthogonal eigenstates, ideal gates, exact inverse QFT, noiseless measurement, and normalized input populations.

## Claims and evidence

| Claim | Evidence | Scope |
|---|---|---|
| `m=3, phi=3/8` yields outcome 3 with probability 1 | `QPE.wl`, `reference.json` | Exact symbolic |
| All dyadic phases for `m=1..5` are exact | validation suite | Finite exact enumeration, 62 cases |
| Non-dyadic, wrap-near-one, normalization | direct sum and sine-ratio comparison | Finite high-precision numerical tests |
| Orthogonal mixture has `p1=.25`, `p5=.75` | exact mixture check | Exact symbolic |
| Repeated controlled-U cost is `2^m-1` | `lean/QPECost.lean` | Formal proof of resource count only |

The Lean result does **not** formally verify QPE, the probability formula, the simulator, or physical hardware. Those are symbolic and bounded numerical evidence only.

## Files and commands

- `QPE.wl`: reusable package API and validation suite.
- `QPE.nb`: executable notebook with separate prose/Input cells and interactive phase/qubit controls.
- `build.wls`: generates `reference.json`, reports, and `probability.png`.
- `lean/`: dependency-free (core/Std only) resource-count proof.

From this directory:

```powershell
wolframscript -file .\build.wls
Set-Location .\lean
lake build
```

Tested with WolframScript 15.0.1 and Lean 4.34.0. No 15-only API is required. The Wolfram 15 incompatible-changes review found no relevant changed API in this project; explicit `"RawJSON"` and `"PNG"` export formats are used. Generated artifact paths and JSON keys are relative and disclose no home-directory path.
