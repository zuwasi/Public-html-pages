# Claim ledger

Scope: Phases 1–2 only. Citations refer to the arXiv PDF page number.

| ID | Paper claim/equation | Source | Executable evidence | Status |
|---|---|---|---|---|
| C1 | Mean GraphSAGE neighborhood aggregate: `h_N(i)^(l+1)=mean(h_j^l, j in N(i))`. | Method, pp. 2–3 | `MeanSAGEAggregate`; exact audit | Reproduced |
| C2 | Vertex update is activation of separate affine self and neighborhood terms. | Method, p. 3 | `GraphSAGEUpdate`; exact identity-activation test | Reproduced |
| C3 | `L_LAT=(1/N) sum_i alpha_i ||y_i-yhat_i||^2`, with alpha 2 at measurements and 1 elsewhere. | Training Procedure, p. 3 | `WeightedLATMSE` | Reproduced; notation caveat I1 |
| C4 | QRS duration is max LAT minus min LAT; total loss is `L_LAT+L_qrs`. | Training Procedure, p. 3 | `QRSDuration`, `CombinedLoss` | Reproduced |
| C5 | `D=(1-r) f f^T+r I`, `r=1/3`; `l=sqrt(e^T D e)`; travel time/cost `w=l/c`. | Data Generation, p. 5 | anisotropy, virtual-length and travel-time functions | Reproduced |
| C6 | Activation follows shortest paths from activation points. | Data Generation, p. 5 | deterministic grid-wavefront experiment | Demonstrated synthetically |
| C7 | Architecture uses 20 GraphSAGE layers plus FC widths and leaky ReLU. | Architecture, p. 4 | documented only | Not trained/reproduced |
| C8 | About 8 ms whole-myocardium MAE at 50% sampling in >500 simulated patterns and 7 ms on one real-data experiment. | Abstract, p. 1; Results, pp. 7–10 | none available | Not reproducible from supplied evidence |
| C9 | Error generally decreases as sampling increases and wavefront features remain stable. | Figs. 3–6, pp. 7–11 | synthetic sampling/noise sweep | Qualitative demonstrator only |

No claim in this ledger upgrades synthetic demonstrator evidence to clinical validation.
