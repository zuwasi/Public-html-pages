# Normalized specification

## Paper-stated model

For vertex `i`, aggregate `a_i = |N(i)|^-1 sum_{j in N(i)} h_j`. Update
`h'_i = sigma(W_i h_i + b_i + W_N a_i + b_N)`, with weights shared over vertices.

Given predictions `p`, truth `t`, and measurement mask `m`, set `alpha_i=2` when `m_i` and 1 otherwise:

`L_LAT = (1/N) sum alpha_i (p_i-t_i)^2`;
`QRS(z)=max(z)-min(z)`;
`L=L_LAT+(QRS(p)-QRS(t))^2` (p. 3).

For edge vector `e`, fiber `f`, and `r=1/3`:
`D=(1-r) f f^T+r I`, `l=sqrt(e^T D e)`, and `w=l/c` (p. 5).

## Function contracts

- Inputs and outputs use lists and `Association` metadata/results.
- Vector and matrix dimensions must agree. Fibers are normalized and must be nonzero.
- Empty neighborhoods return a zero vector only when output dimension is known.
- Speed must be positive; zero speed returns `Infinity`; negative speed does not match the API.
- LAT/QRS inputs must be non-empty and equally sized where paired.

## Implementation-added assumptions

The synthetic domain is a unit-edge rectangular graph; one source begins at time zero; speed is uniform unless a test says otherwise. Sparse vertices are chosen with `SeedRandom[42]`. The reconstruction is harmonic interpolation constrained by measured vertices. It is deliberately a **demonstrator**, not the unavailable trained 20-layer network. Gaussian noise is in synthetic LAT units. Full-sample reconstruction directly preserves all observations.

Exact arithmetic is used for equation oracles. Plot experiments use machine numbers; tolerances are explicit in the future interoperability manifest.
