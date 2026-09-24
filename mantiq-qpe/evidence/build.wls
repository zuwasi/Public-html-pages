#!/usr/bin/env wolframscript
projectDir = DirectoryName[$InputFileName];
SetDirectory[projectDir];
Get[FileNameJoin[{projectDir, "QPE.wl"}]];

tolerance = 10^-12;
checks = RunValidationSuite[tolerance];
failed = Select[checks, #status =!= "pass" &];

environment = <|
  "wolframVersion" -> $Version,
  "wolframVersionNumber" -> $VersionNumber,
  "system" -> $System,
  "processorType" -> $ProcessorType
|>;

numericList[x_] := N[x, 17] /. z_Complex :> {Re[z], Im[z]};
vectors = {
  <|"name" -> "nonDyadicOneThird", "m" -> 3, "phiA" -> "1/3", "phiB" -> Null,
    "weight" -> Null, "probabilities" -> numericList[QPEProbabilities[3, 1/3]]|>,
  <|"name" -> "wrapNearOne", "m" -> 5, "phiA" -> "1-10^-9", "phiB" -> Null,
    "weight" -> Null, "probabilities" -> numericList[QPEProbabilities[5, 1 - 10^-9]]|>,
  <|"name" -> "weightedOrthogonal", "m" -> 3, "phiA" -> "1/8", "phiB" -> "5/8",
    "weight" -> 0.25, "probabilities" -> numericList[MixtureProbabilities[3, 1/8, 5/8, 1/4]]|>
};

plot = BarChart[N[QPEProbabilities[3, 1/3]],
  ChartLabels -> Table[IntegerString[y, 2, 3], {y, 0, 7}],
  PlotRange -> {0, 1}, AxesLabel -> {"MSB-first outcome", "probability"},
  PlotLabel -> "Ideal QPE: m=3, phi=1/3", ImageSize -> 700,
  ImagePadding -> {{65, 30}, {65, 45}}];
Export[FileNameJoin[{projectDir, "probability.png"}], plot, "PNG"];

sourceFiles = {"QPE.wl", "QPE.nb", "build.wls", "README.md", "lean/QPECost.lean", "lean/lakefile.toml", "lean/lean-toolchain"};
fileHash[path_] := FileHash[FileNameJoin[{projectDir, path}], "SHA256", "HexString"];
sourceHashes = Association@Table[path -> fileHash[path], {path, sourceFiles}];

reference = <|
  "environment" -> environment,
  "timestampUTC" -> DateString[Now, "ISODateTime", TimeZone -> 0] <> "Z",
  "tolerance" -> tolerance,
  "checks" -> checks,
  "vectors" -> vectors,
  "sourceHashes" -> sourceHashes
|>;
Export[FileNameJoin[{projectDir, "reference.json"}], reference, "RawJSON"];

passedCount = Count[checks[[All, "status"]], "pass"];
auditLines = Join[
  {"MantiQ QPE bounded evidence audit", "", "PASS: " <> ToString[passedCount], "FAIL: " <> ToString[Length[failed]], ""},
  ((ToUpperCase[#status] <> ": " <> #name <> " [" <> #scope <> "]") & /@ checks),
  {"", "Scope: exact symbolic identities plus finite high-precision tests; no claim of full QPE formal verification."}
];
Export[FileNameJoin[{projectDir, "audit_report.txt"}], StringRiffle[auditLines, "\n"], "Text"];

validation = StringRiffle[{
  "# Validation report", "",
  "- Wolfram checks: " <> ToString[passedCount] <> " passed, " <> ToString[Length[failed]] <> " failed.",
  "- Exact dyadic enumeration: 62 phase/register cases (m=1 through 5).",
  "- Independent numerical comparison: direct Fourier sums versus geometric-series sine ratios.",
  "- Lean status is recorded separately in `lean_build_report.txt`.", "",
  "## Scope", "",
  "The QPE distribution and selected identities are symbolically or numerically validated in a bounded ideal-noiseless model. Only the resource-count recurrence is intended for Lean formal proof."
}, "\n"];
Export[FileNameJoin[{projectDir, "validation_report.md"}], validation, "Text"];

required = {"reference.json", "audit_report.txt", "validation_report.md", "probability.png"};
If[Length[failed] > 0 || !And @@ (FileExistsQ[#] && FileByteCount[#] > 0 & /@ required),
  Print["BUILD FAILED: ", Length[failed], " failed checks."]; Exit[1]];
Print["BUILD PASSED: ", passedCount, " checks; generated ", StringRiffle[required, ", "], "."];
