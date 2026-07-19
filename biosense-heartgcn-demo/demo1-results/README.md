# HeartGCN paper reference — Phases 1 and 2

Evidence-backed Wolfram 14.3 reference for Meister et al., “Graph convolutional regression of cardiac depolarization from sparse endocardial maps,” arXiv:2009.14068v1 (2020).

This project reproduces the paper's core equations and deterministic synthetic wavefront/sampling tests. Its harmonic reconstruction is explicitly a demonstrator, **not** the unavailable trained 20-layer network. See `docs/` for claim traceability and limitations.

## Run with Wolfram 14.3 (PowerShell)

```powershell
Set-Location 'C:\Amp_demos\Biosense-19-7-2026\demo1-results'
& 'C:\Program Files\Wolfram Research\Wolfram\14.3\WolframKernel.exe' -script '.\build_project.wls'
& 'C:\Program Files\Wolfram Research\Wolfram\14.3\WolframKernel.exe' -script '.\proof_audit.wls'
```

Open `HeartGCNNotebook.nb` in Mathematica 14.3 and evaluate the notebook for interactive exploration. Generated evidence is under `exports/`.

## Map

- `src/HeartGCNModel.wl`: public equation, wavefront, reconstruction, and validation API.
- `HeartGCNNotebook.nb`: plain textual notebook (no box expressions).
- `build_project.wls`: validation, vectors, manifest, audit, and PNG generation.
- `proof_audit.wls`: standalone paper-specific audit.
- `docs/`: claim/issue ledgers, normalized specification, availability limits.
- `exports/`: machine-readable results, future C++ contracts, audit, CSV vectors, figures.

## Scope boundary

Workflow intentionally stopped after the Mathematica phase (Phase 2). No Lean, C++, Parasoft, baseline freeze, or final cross-language work was started. The future differential manifest defines contracts only and explicitly records `CppImplemented: false`.
