$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$qt = 'C:\Qt\6.10.3\mingw_64'
$tools = 'C:\Qt\Tools\mingw1310_64\bin'
$env:Path = "$tools;$qt\bin;$env:Path"
cmake -S $root -B "$root\build" -G 'MinGW Makefiles' -DCMAKE_PREFIX_PATH=$qt -DCMAKE_CXX_COMPILER="$tools\g++.exe" -DCMAKE_MAKE_PROGRAM="$tools\mingw32-make.exe"
if ($LASTEXITCODE) { throw 'CMake configure failed' }
cmake --build "$root\build" --parallel
if ($LASTEXITCODE) { throw 'Build failed' }
ctest --test-dir "$root\build" --output-on-failure
if ($LASTEXITCODE) { throw 'Tests failed' }
$verify = "$root\verify-export"
Remove-Item -Recurse -Force $verify -ErrorAction SilentlyContinue
$validation = Start-Process -FilePath "$root\build\HeartGCNApp.exe" -ArgumentList '--validate' -Wait -PassThru -NoNewWindow
if ($validation.ExitCode) { throw 'CLI validation failed' }
$export = Start-Process -FilePath "$root\build\HeartGCNApp.exe" -ArgumentList @('--export', $verify) -Wait -PassThru -NoNewWindow
if ($export.ExitCode) { throw 'CLI export failed' }
$required = 'validation_results.json', 'reference_vectors.csv', 'boundary_vectors.csv', 'sampling_noise_sweep.csv'
foreach ($file in $required) {
    $path = Join-Path $verify $file
    if (!(Test-Path $path) -or (Get-Item $path).Length -eq 0) { throw "Missing or empty CLI export: $file" }
}
$deploy = "$root\deploy"
New-Item -ItemType Directory -Force $deploy | Out-Null
Copy-Item "$root\build\HeartGCNApp.exe" $deploy -Force
& "$qt\bin\windeployqt.exe" --release --no-translations --compiler-runtime "$deploy\HeartGCNApp.exe"
if ($LASTEXITCODE) { throw 'Qt deployment failed' }
Write-Host "BUILD PASS - deployed to $deploy"
