#!/usr/bin/env wolframscript

If[Length[$ScriptCommandLine] < 3,
  Print["Usage: wolframscript -script GpuHealthPackageRunner.wls input.json output.json"];
  Exit[2]
];

scriptDir = DirectoryName[$InputFileName];
inputPath = $ScriptCommandLine[[2]];
outputPath = $ScriptCommandLine[[3]];

Get[FileNameJoin[{scriptDir, "GpuHealthPackageExample.m"}]];

samples = Import[inputPath, "RawJSON"];
If[AssociationQ[samples] && KeyExistsQ[samples, "samples"], samples = samples["samples"]];

If[!ListQ[samples] || Length[samples] < 5,
  Export[outputPath, <|
    "healthScore" -> 0.0,
    "thermalRisk" -> 0.0,
    "powerInstability" -> 0.0,
    "memoryPressure" -> 0.0,
    "utilizationStability" -> 0.0,
    "predictedTemperature60s" -> 0.0,
    "anomalyCount" -> 0,
    "diagnosis" -> "Insufficient samples for Wolfram Engine package calculation."
  |>, "JSON"];
  Exit[3]
];

result = GpuHealthExample`AnalyzeGpuTelemetry[samples];
Export[outputPath, result, "JSON"];
