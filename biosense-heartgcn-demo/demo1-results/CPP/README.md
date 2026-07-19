# HeartGCN synthetic/harmonic Qt demonstrator

A C++20 port of the numerical reference with a Qt Widgets UI. This application generates a synthetic rectangular-grid wavefront and reconstructs it using graph-Laplacian harmonic interpolation. It is **not a trained model and not for clinical use**.

## Build

Run `powershell -ExecutionPolicy Bypass -File .\build_app.ps1`. The script configures MinGW, builds, runs CTest and creates `deploy/` with Qt runtime files.

Launch the packaged desktop application with `deploy\HeartGCNApp.exe`.

## CLI

* `build\HeartGCNApp.exe --validate`
* `build\HeartGCNApp.exe --export <folder>`

Because `HeartGCNApp.exe` is a Windows GUI executable, PowerShell may return before a CLI command finishes. Use `Start-Process -Wait -NoNewWindow build\HeartGCNApp.exe -ArgumentList '--validate'` when scripting it.

The export contains `validation_results.json`, `reference_vectors.csv`, `boundary_vectors.csv`, and `sampling_noise_sweep.csv`.
