(* ::Package:: *)

(* GPU health symbolic package example.
   .m is the traditional Wolfram Language package-file extension.
   It is useful when teams want package-style APIs, usage messages,
   contexts, and reusable symbolic helpers. *)

BeginPackage["GpuHealthExample`"];

SymbolicHealthScore::usage =
  "SymbolicHealthScore[] returns the symbolic health-score formula used to explain model sensitivities.";

ScoreSensitivityRules::usage =
  "ScoreSensitivityRules[] returns symbolic derivatives of the health score with respect to each risk component.";

ThermalThresholdSeconds::usage =
  "ThermalThresholdSeconds[currentTemp, slope, threshold] solves for the number of seconds until the thermal forecast reaches threshold.";

AnalyzeGpuTelemetry::usage =
  "AnalyzeGpuTelemetry[samples] calculates the GPU health report through the package API.";

Begin["`Private`"];

Get[FileNameJoin[{DirectoryName[$InputFileName], "GpuHealthReference.wl"}]];

SymbolicHealthScore[] :=
  100 (1 - 0.30 thermalRisk - 0.20 powerInstability -
    0.15 memoryPressure - 0.15 anomalyRisk - 0.20 throttleRisk);

ScoreSensitivityRules[] := Association[
  "thermalRisk" -> D[SymbolicHealthScore[], thermalRisk],
  "powerInstability" -> D[SymbolicHealthScore[], powerInstability],
  "memoryPressure" -> D[SymbolicHealthScore[], memoryPressure],
  "anomalyRisk" -> D[SymbolicHealthScore[], anomalyRisk],
  "throttleRisk" -> D[SymbolicHealthScore[], throttleRisk]
];

ThermalThresholdSeconds[currentTemp_, slope_, threshold_: 90] := Module[{seconds},
  If[slope == 0, Return[Indeterminate]];
  seconds /. First@Solve[currentTemp + seconds slope == threshold, seconds]
];

AnalyzeGpuTelemetry[samples_List] := analyzeGpuTelemetry[samples];

End[];

EndPackage[];
