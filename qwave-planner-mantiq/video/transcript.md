# Demo transcript

## Scene 01

Q Wave Planner. In about four minutes, we plan a post quantum cryptography migration the way Q Dot Security frames it, and we prove the plan is optimal before anyone spends a week on it.

## Scene 02

Harvest now, decrypt later means every system that speaks classical cryptography is on a clock. A migration budget arrives in engineer weeks, not years. And the simplest ranked list never says whether it was the best possible spend. The paper behind this demo models exactly that race.

## Scene 03

Here is the planner. Meridian Bank, a fictional bank, has six candidate projects: payments, VPN, signing, portal, gateway and single sign on. Each has a cost in engineer weeks and a risk score in points. The portal depends on the gateway, so the order matters. The budget this quarter is twelve weeks.

## Scene 04

At twelve weeks, the exact search says the best plan is payments plus VPN, worth seventy points. The naive ranked list walks down its order and picks portal, gateway and single sign on. That is feasible, but it is worth only sixty four. Six points left on the table, with no way to know.

## Scene 05

We do not just claim this. The same instance runs through three independent pipelines: a Wolfram Quantum Framework simulation, a Lean four proof, and the executable planner you are watching. If any two disagree, the demo fails. The method is MantiQ: simulate, prove, execute, in that order.

## Scene 06

The quantum panel runs a QAOA statevector in your browser, live. At the angles Wolfram's search found, the exact optimum is the single most likely outcome, six percent, about four times the chance level. QAOA one is modest here: the enumeration, not the sampler, makes the decision. The total variation distance against Wolfram is ten to the minus sixteen. Same circuit, two implementations.

## Scene 07

This is Wolfram's view: the QAOA expectation landscape over the angle space, drawn on a dense grid, with the search-found point and the global minimum marked. Wolfram also verifies the encoding: fifty six non identity Pauli Z terms, fifty seven counting the identity, that reconstruct the cost table exactly.

## Scene 08

And the sampled distribution over all sixty four plans. Gold is the exact optimum, green is feasible, red is infeasible. A four thousand shot sample beats the naive ranked list about twelve percent of the time. Most shots do not beat it: the enumeration is the decision layer, the sampler is an illustration.

## Scene 09

The claims are theorems. Lean four proves, by exhaustive decision over all sixty four plans, that seventy is attained, that nothing feasible beats it, that it is unique, and that the ranked list loses. Three thousand build jobs, zero errors, zero sorries.

## Scene 10

Now move the budget to sixteen weeks, the scenario in the live event. The planner recomputes instantly, and the answer flips: payments, gateway and portal, worth ninety two points. A banner states the flip, and the remediation tickets re order to match. Lean proves no twelve week plan can ever reach ninety two.

## Scene 11

Four pipelines, one set of numbers: Python, Wolfram, Lean, and the browser, all agree on seventy, ninety two, sixty four, and uniqueness. The browser statevector matches Wolfram's stored distribution at machine precision at both budgets.

## Scene 12

Why act this quarter? The paper's exposure model, drawn live in the planner: the expected exposed fraction of each asset's hackable lifetime climbs as the migration start slips. Starting in twenty twenty six leaves about thirty seven percent of the window exposed. Waiting to twenty thirty raises it to fifty four. Optimality matters because the clock does not wait.

## Scene 13

The simulation is local by design. The same cost layer is already written as a Classiq QMOD model, written with the Classiq SDK's own writer, with the search-found angles embedded. Enumeration stays the decision layer at this size; past roughly thirty projects, exact methods hand over to integer programming, and Lean moves from decision procedures to real proofs.

## Scene 14

Q Wave Planner, by Engineering Software Lab. Thank you for watching.
