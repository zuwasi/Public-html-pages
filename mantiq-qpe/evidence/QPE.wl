BeginPackage["QPEEvidence`"];

QPEAmplitude::usage = "QPEAmplitude[m, phi, y] gives the normalized direct Fourier sum.";
QPEProbabilities::usage = "QPEProbabilities[m, phi] gives probabilities for outcomes 0 through 2^m-1.";
GeometricProbabilities::usage = "GeometricProbabilities[m, phi] evaluates the independently derived sine-ratio formula.";
MixtureProbabilities::usage = "MixtureProbabilities[m, phiA, phiB, w] gives the marginal distribution for orthogonal eigenstates.";
BitStringMSB::usage = "BitStringMSB[y, m] formats outcome y as an m-bit string, most-significant bit first.";
RunValidationSuite::usage = "RunValidationSuite[tolerance] runs exact, symbolic, boundary, mixture, and numerical checks.";

Begin["`Private`"];

validM[m_] := IntegerQ[m] && m >= 1;

QPEAmplitude[m_?validM, phi_, y_Integer] /; 0 <= y < 2^m :=
  Total[Exp[2 Pi I Range[0, 2^m - 1] (phi - y/2^m)]]/2^m;

QPEProbabilities[m_?validM, phi_] :=
  ComplexExpand[Abs[#]^2] & /@ Table[QPEAmplitude[m, phi, y], {y, 0, 2^m - 1}];

GeometricProbabilities[m_?validM, phi_] := Module[{n = 2^m},
  Table[With[{d = phi - y/n},
    If[TrueQ[PossibleZeroQ[Sin[Pi d]]], 1,
      (Sin[Pi n d]/(n Sin[Pi d]))^2]], {y, 0, n - 1}]
];

MixtureProbabilities[m_?validM, phiA_, phiB_, w_ /; 0 <= w <= 1] :=
  w QPEProbabilities[m, phiA] + (1 - w) QPEProbabilities[m, phiB];

BitStringMSB[y_Integer, m_?validM] /; 0 <= y < 2^m :=
  IntegerString[y, 2, m];

RunValidationSuite[tolerance_: 10^-12] := Module[
  {checks = {}, add, direct, geometric, dyadic, wrap, mix, symbolicVector,
   numericalPhases = {1/3, 7/19, 1 - 10^-6}, numericalPairs},
  add[name_, status_, scope_] := AppendTo[checks,
    <|"name" -> name, "status" -> If[TrueQ[status], "pass", "fail"], "scope" -> scope|>];

  add["exact m=3 phi=3/8", QPEProbabilities[3, 3/8] === {0, 0, 0, 1, 0, 0, 0, 0}, "exact symbolic"];
  symbolicVector = FullSimplify[QPEProbabilities[3, 3/8]];
  add["three-qubit symbolic vector", symbolicVector === {0, 0, 0, 1, 0, 0, 0, 0}, "exact symbolic"];
  add["three-qubit symbolic normalization", FullSimplify[Total[symbolicVector]] === 1, "exact symbolic"];

  dyadic = Flatten@Table[
    QPEProbabilities[m, k/2^m] === UnitVector[2^m, k + 1],
    {m, 1, 5}, {k, 0, 2^m - 1}];
  add["all dyadic phases m=1..5", And @@ dyadic, "finite exact enumeration (62 cases)"];

  direct = N[QPEProbabilities[3, 1/3], 30];
  geometric = N[GeometricProbabilities[3, 1/3], 30];
  add["non-dyadic phi=1/3 normalization", Abs[Total[direct] - 1] < tolerance, "high-precision numerical"];
  add["non-dyadic phi=1/3 direct vs geometric", Max[Abs[direct - geometric]] < tolerance, "independent formula numerical"];

  wrap = N[QPEProbabilities[5, 1 - 10^-9], 30];
  add["wrap-near-one normalization", Abs[Total[wrap] - 1] < tolerance, "high-precision numerical boundary"];
  add["wrap-near-one peaks at outcome zero", First@Ordering[wrap, -1] === 1, "finite numerical boundary"];

  mix = FullSimplify[MixtureProbabilities[3, 1/8, 5/8, 1/4]];
  add["weighted orthogonal eigenstates", mix === {0, 1/4, 0, 0, 0, 3/4, 0, 0}, "exact symbolic marginal"];
  add["mixture normalization", Total[mix] === 1, "exact symbolic"];
  add["MSB-first formatting", Table[BitStringMSB[y, 3], {y, 0, 7}] ===
    {"000", "001", "010", "011", "100", "101", "110", "111"}, "exact formatting"];

  numericalPairs = Table[
    With[{a = N[QPEProbabilities[5, p], 40], g = N[GeometricProbabilities[5, p], 40]},
      Max[Abs[a - g]] < tolerance && Abs[Total[a] - 1] < tolerance], {p, numericalPhases}];
  add["direct/geometric numerical sweep", And @@ numericalPairs, "finite high-precision tests (3 phases)"];
  checks
];

End[];
EndPackage[];
