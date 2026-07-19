# HeartGCN paper-to-C++ verification demo

This directory is a full mirror of the HeartGCN research-paper verification
demonstrator created on 19 July 2026. It contains the source papers,
presentations, Mathematica reference project, generated evidence, C++/Qt
application source, build outputs, deployed application, and supporting assets.

## Public presentation

https://zuwasi.github.io/Public-html-pages/biosense-heartgcn-demo/paper-to-cpp-verification-presentation.html

## Main project areas

- `paper-to-cpp-verification-presentation.html` — 25-slide master presentation.
- `assets/` — workflow diagram, logos, paper preview, and actual Qt screenshots.
- `demo1-results/` — Mathematica reference model, notebook, audits, and exports.
- `demo1-results/CPP/` — C++20 numerical core, Qt 6 GUI, tests, build, and deployment.
- `START_PROCESS_PROMPT.md` — original end-to-end verification workflow prompt.

## Evidence status

- Mathematica audit: 12/12 checks passed.
- C++ validation: 12/12 checks passed.
- CTest: 1/1 passed.
- Qt application: built, deployed, launched, and captured in the presentation.
- Parasoft C/C++test: illustrative stage only; not executed.
- Lean 4: not performed.
- Trained clinical HeartGCN and reported clinical results: not reproduced because
  the original data, meshes, preprocessing constants, code, and weights were not
  available.

## Licensing

Original project material is available under the MIT License. Bundled papers,
Qt/MinGW runtime files, and other third-party components retain their own terms;
see `THIRD_PARTY_NOTICES.md`.
