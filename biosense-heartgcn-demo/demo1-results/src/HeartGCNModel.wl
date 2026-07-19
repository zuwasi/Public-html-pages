BeginPackage["HeartGCNModel`"];
MeanSAGEAggregate::usage = "MeanSAGEAggregate[neighbors] returns the componentwise mean, or a zero vector when an explicit Dimension option is supplied for an empty neighborhood.";
GraphSAGEUpdate::usage = "GraphSAGEUpdate[self, neighborhood, parameters] applies the paper's affine self-plus-neighborhood update and activation.";
WeightedLATMSE::usage = "WeightedLATMSE[prediction, truth, measuredMask] computes (1/N) Sum alpha_i (prediction_i-truth_i)^2 with alpha 2 at measured vertices and 1 elsewhere.";
QRSDuration::usage = "QRSDuration[times] returns Max[times]-Min[times].";
CombinedLoss::usage = "CombinedLoss[prediction, truth, measuredMask] returns an Association containing LAT, QRS, and total losses.";
AnisotropyTensor::usage = "AnisotropyTensor[f, r] returns (1-r) Outer[Times,f,f]+r IdentityMatrix with default r=1/3; f must be a nonzero vector and is normalized.";
VirtualEdgeLength::usage = "VirtualEdgeLength[e, f, r] computes Sqrt[e . D . e].";
EdgeTravelTime::usage = "EdgeTravelTime[length, speed] computes length/speed for positive speed and returns Infinity at zero speed.";
SyntheticWavefront::usage = "SyntheticWavefront[spec] generates deterministic shortest-path activation truth on a rectangular graph.";
SparseReconstruction::usage = "SparseReconstruction[experiment, fraction, noise] gives a demonstrator harmonic graph interpolation, not the paper's trained GCN.";
RunValidationSuite::usage = "RunValidationSuite[] runs exact equation, dimension, propagation, loss, and boundary checks and returns an Association.";
Begin["`Private`"];

(**
  Mean GraphSAGE neighborhood aggregation from Meister et al., pp. 2-3:

    h_N(i)^(l+1) = mean(h_j^l, j in N(i)).

  x is a list of equal-length feature vectors, one for each neighboring
  vertex. Mean[x] therefore returns their componentwise arithmetic mean.
  For an empty neighborhood, pass Dimension -> d to obtain a d-dimensional
  zero vector; without a known dimension the function returns
  Missing["EmptyNeighborhood"].

  Examples:
    MeanSAGEAggregate[{{1, 2}, {3, 4}}]              (* {2, 3} *)
    MeanSAGEAggregate[{}, Dimension -> 2]             (* {0, 0} *)
**)
Options[MeanSAGEAggregate] = {Dimension -> Automatic};
MeanSAGEAggregate[x_List, OptionsPattern[]] := Module[{d = OptionValue[Dimension]},
  If[x === {}, If[IntegerQ[d] && d > 0, ConstantArray[0, d], Missing["EmptyNeighborhood"]], Mean[x]]
];

GraphSAGEUpdate[self_List, neighborhood_List, p_Association] := Module[{agg, z, act},
  agg = MeanSAGEAggregate[neighborhood, Dimension -> Length[self]];
  z = p["SelfWeights"].self + p["SelfBias"] + p["NeighborWeights"].agg + p["NeighborBias"];
  act = Lookup[p, "Activation", (Max[#, 1/100 #] &)];
  act /@ z
];

WeightedLATMSE[p_List, y_List, mask_List] /; Length[p] == Length[y] == Length[mask] && Length[p] > 0 :=
  Total[MapThread[If[TrueQ[#3], 2, 1] (#1 - #2)^2 &, {p, y, mask}]]/Length[p];
QRSDuration[t_List] /; Length[t] > 0 := Max[t] - Min[t];
CombinedLoss[p_List, y_List, mask_List] := Module[{lat, qrs},
  lat = WeightedLATMSE[p, y, mask]; qrs = (QRSDuration[p] - QRSDuration[y])^2;
  <|"LATLoss" -> lat, "QRSLoss" -> qrs, "TotalLoss" -> lat + qrs|>
];

AnisotropyTensor[f_List, r_: 1/3] /; Length[f] > 0 && 0 < r <= 1 && Norm[f] > 0 := Module[{u = f/Norm[f]},
  (1-r) Outer[Times, u, u] + r IdentityMatrix[Length[u]]
];
VirtualEdgeLength[e_List, f_List, r_: 1/3] /; Length[e] == Length[f] := Sqrt[e.AnisotropyTensor[f, r].e];
EdgeTravelTime[l_?NonNegative, c_?Positive] := l/c;
EdgeTravelTime[l_?NonNegative, 0] := Infinity;

SyntheticWavefront[spec_: <||>] := Module[{nx, ny, coords, edges, source, speed, graph, truth},
  nx = Lookup[spec, "NX", 12]; ny = Lookup[spec, "NY", 9]; speed = Lookup[spec, "Speed", 1]; source = Lookup[spec, "Source", 1];
  coords = Flatten[Table[{i, j}, {j, 0, ny-1}, {i, 0, nx-1}], 1];
  edges = Join[Flatten[Table[UndirectedEdge[(j-1) nx+i, (j-1) nx+i+1], {j, ny}, {i, nx-1}]],
    Flatten[Table[UndirectedEdge[(j-1) nx+i, j nx+i], {j, ny-1}, {i, nx}]]];
  graph = Graph[Range[nx ny], edges, EdgeWeight -> ConstantArray[1/speed, Length[edges]], VertexCoordinates -> coords];
  truth = GraphDistance[graph, source, #] & /@ Range[nx ny];
  <|"Graph" -> graph, "Coordinates" -> coords, "Truth" -> truth, "Source" -> source, "Specification" -> <|"NX"->nx,"NY"->ny,"Speed"->speed|>|>
];

SparseReconstruction[exp_Association, fraction_: 1/2, noise_: 0] := Module[{g, y, n, ids, observed, unknown, lap, rhs, estimate},
  SeedRandom[42]; g = exp["Graph"]; y = exp["Truth"]; n = Length[y];
  ids = Sort[RandomSample[Range[n], Max[2, Round[fraction n]]]];
  observed = y[[ids]] + If[TrueQ[noise == 0], ConstantArray[0, Length[ids]], RandomVariate[NormalDistribution[0, noise], Length[ids]]];
  unknown = Complement[Range[n], ids]; estimate = ConstantArray[0., n]; estimate[[ids]] = N[observed];
  If[unknown =!= {}, lap = N[KirchhoffMatrix[g]]; rhs = -lap[[unknown, ids]].estimate[[ids]];
    estimate[[unknown]] = Quiet[LinearSolve[lap[[unknown, unknown]], rhs]]];
  <|"Estimate" -> estimate, "Truth" -> y, "MeasuredIndices" -> ids, "MeasuredValues" -> observed,
    "MAE" -> Mean[Abs[estimate-y]], "Fraction" -> fraction, "Noise" -> noise,
    "Method" -> "Harmonic graph interpolation demonstrator; not trained HeartGCN"|>
];

RunValidationSuite[] := Module[{tests, p, exp, rec},
  p = <|"SelfWeights"->IdentityMatrix[2], "SelfBias"->{0,0}, "NeighborWeights"->IdentityMatrix[2], "NeighborBias"->{0,0}, "Activation"->Identity|>;
  exp = SyntheticWavefront[<|"NX"->4,"NY"->3|>]; rec = SparseReconstruction[exp, 1, 0];
  tests = {
    <|"Name"->"mean aggregation exact", "Passed"->TrueQ[MeanSAGEAggregate[{{1,2},{3,4}}] == {2,3}]|>,
    <|"Name"->"vertex update exact", "Passed"->TrueQ[GraphSAGEUpdate[{1,2},{{3,4},{5,6}},p] == {5,7}]|>,
    <|"Name"->"weighted LAT MSE", "Passed"->TrueQ[WeightedLATMSE[{1,2},{0,0},{True,False}] == 3]|>,
    <|"Name"->"QRS duration", "Passed"->TrueQ[QRSDuration[{4,9,1}] == 8]|>,
    <|"Name"->"combined zero loss", "Passed"->TrueQ[CombinedLoss[{1,2},{1,2},{True,False}]["TotalLoss"] == 0]|>,
    <|"Name"->"anisotropy eigenvalues", "Passed"->TrueQ[Sort[Eigenvalues[AnisotropyTensor[{1,0,0}]]] == {1/3,1/3,1}]|>,
    <|"Name"->"fiber virtual length", "Passed"->TrueQ[VirtualEdgeLength[{2,0,0},{1,0,0}] == 2]|>,
    <|"Name"->"transverse virtual length", "Passed"->TrueQ[VirtualEdgeLength[{0,3,0},{1,0,0}] == Sqrt[3]]|>,
    <|"Name"->"travel time", "Passed"->TrueQ[EdgeTravelTime[6,3] == 2]|>,
    <|"Name"->"scar zero speed blocked", "Passed"->TrueQ[EdgeTravelTime[1,0] === Infinity]|>,
    <|"Name"->"grid propagation", "Passed"->TrueQ[exp["Truth"][[4]] == 3 && exp["Truth"][[9]] == 2]|>,
    <|"Name"->"full-sample demonstrator", "Passed"->TrueQ[rec["MAE"] < 10^-12]|>
  };
  <|"Seed"->42, "Tests"->tests, "Passed"->Count[tests, a_ /; TrueQ[a["Passed"]]], "Failed"->Count[tests, a_ /; !TrueQ[a["Passed"]]], "Total"->Length[tests]|>
];
End[];
EndPackage[];
