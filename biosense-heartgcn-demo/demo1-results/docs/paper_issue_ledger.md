# Paper issue and transcription ledger

| ID | Location | Issue | Resolution in this project |
|---|---|---|---|
| I1 | p. 3, loss paragraph | Prose calls `y_i` predicted and `yhat_i` ground truth, opposite a common hat convention. The squared error is symmetric, so the numeric loss is unaffected. | API names are `prediction` and `truth`; formula retained exactly. |
| I2 | pp. 2–3 | Aggregation superscript is written `l+1` although it aggregates layer-`l` neighbor states; this is output indexing, not a second update. | Implement one mean followed by one vertex update. |
| I3 | p. 3 | Neighbor weights/bias carry `N(i)` subscripts, potentially suggesting vertex-specific parameters, while prose says shared weights. | Treat matrices/biases as shared layer parameters. |
| I4 | p. 3 | Numerical-feature normalization uses training-set bounds that are not published. LAT normalization is described, but actual bounds and all preprocessing constants are absent. | No clinical normalization is claimed; synthetic values use explicit units/scales. |
| I5 | pp. 2–5 | Tetrahedral mesh sizes, connectivity, fiber fields, activation points, and interpolation details for edge velocity are not released. | Use an explicitly defined rectangular graph. |
| I6 | p. 5 | Formula uses `f_ij` without specifying precisely how endpoint fibers are combined or whether it is guaranteed unit length. | Normalize nonzero input fiber in the reference implementation; record this as implementation-added. |
| I7 | p. 5 | Scar speed is 0, making `l/c` undefined/infinite. Handling in shortest-path software is unstated. | Return `Infinity`, thereby making scar edges impassable. |
| I8 | entire paper | Code, trained weights, split identities, full synthetic database, MR/ECG/contact data, and generated meshes are unavailable here. | Block exact network and clinical-number reproduction. |
| I9 | p. 4 | Leaky-ReLU negative slope is unspecified. | Default demonstrator slope is 0.01, but exact tests pass an explicit activation. |
