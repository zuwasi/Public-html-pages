projectDir = DirectoryName[$InputFileName]; SetDirectory[projectDir];
If[!DirectoryQ["exports"], CreateDirectory["exports"]]; Get[FileNameJoin[{projectDir,"src","HeartGCNModel.wl"}]];
v = HeartGCNModel`RunValidationSuite[]; lines = {"HeartGCN Phase 2 paper-specific audit", "Paper: Meister et al., arXiv:2009.14068v1", ""};
Scan[AppendTo[lines, If[TrueQ[#Passed], "PASS: ", "FAIL: "] <> #Name] &, v["Tests"]];
AppendTo[lines, ""]; AppendTo[lines, "Coverage: equations, dimensions, weighted loss, QRS special case, anisotropy, propagation, zero-speed boundary, and full-observation reconstruction."];
AppendTo[lines, "Result: "<>ToString[v["Passed"]]<>"/"<>ToString[v["Total"]]<>" passed; "<>ToString[v["Failed"]]<>" failed."];
AppendTo[lines, "LIMITATION: no clinical data, trained weights, source code, or 20-layer network were available; reported clinical MAEs are not reproduced."];
Export[FileNameJoin[{projectDir,"exports","audit_report.txt"}], StringRiffle[lines,"\n"], "Text"]; Print[StringRiffle[lines,"\n"]]; If[v["Failed"] > 0, Exit[1], Exit[0]];
