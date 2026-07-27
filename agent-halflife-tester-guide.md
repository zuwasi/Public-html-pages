# Agent Half-Life Tester — User Guide

## Table of Contents

1. [Installation](#installation)
2. [First Launch & Trial](#first-launch--trial)
3. [Setting Up Providers](#setting-up-providers)
4. [Running Benchmarks](#running-benchmarks)
5. [Understanding the Dashboard](#understanding-the-dashboard)
6. [Toby Ord's Scaling Rules Explained](#toby-ords-scaling-rules-explained)
7. [Exporting Reports](#exporting-reports)
8. [License Activation](#license-activation)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Installation

### System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk**: 200 MB free space
- **Display**: 1280×720 minimum resolution
- **Internet**: Required for API-based providers; not required for CLI-based testing

### Steps

1. Download `AgentHalfLifeTester.exe` from the [Releases](https://github.com/eswlab/agent-halflife-tester/releases) page.
2. Place the executable in any folder (e.g., `C:\Tools\AgentHalfLifeTester\`).
3. Double-click to launch — no installation or admin rights needed.
4. On first launch, the application creates a configuration folder at `%APPDATA%\AgentHalfLifeTester\`.

> **Note**: Windows SmartScreen may show a warning on first run. Click **More info → Run anyway** to proceed.

---

## First Launch & Trial

When you launch the application for the first time:

1. A **Welcome dialog** appears confirming your 7-day free trial has started.
2. The trial start date is recorded locally — all features are fully unlocked during the trial.
3. The remaining trial days are shown in the status bar at the bottom of the window.
4. After 7 days, you will be prompted to enter a license key to continue using the software.

---

## Setting Up Providers

Navigate to **Settings → Providers** to configure your AI agent connections.

### Claude Code CLI

Claude Code CLI is the recommended provider for testing Anthropic's Claude agent.

1. **Install Claude Code** if you haven't already:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
2. In the Providers tab, select **Claude Code CLI**.
3. Set the **CLI Path** — the application auto-detects the default location. If not found, browse to the `claude` executable manually.
4. Optionally set a **Working Directory** — the sandbox folder where benchmark tasks are executed.
5. Click **Test Connection** to verify the CLI is reachable and responsive.

### Anthropic API

1. Select **Anthropic API** in the Providers tab.
2. Enter your **API Key** (starts with `sk-ant-`).
3. Select the **Model** (e.g., `claude-sonnet-4-20250514`, `claude-3-5-haiku-20241022`).
4. Optionally adjust **Max Tokens** and **Temperature**.
5. Click **Test Connection** to verify.

### OpenAI API

1. Select **OpenAI API** in the Providers tab.
2. Enter your **API Key** (starts with `sk-`).
3. Select the **Model** (e.g., `gpt-4o`, `gpt-4-turbo`, `o1-preview`).
4. Optionally adjust **Max Tokens** and **Temperature**.
5. Click **Test Connection** to verify.

### Custom Agent

For any agent accessible via CLI or HTTP API:

1. Select **Custom Agent** in the Providers tab.
2. Choose the **Interface Type**: CLI or REST API.
3. For **CLI**: provide the command template with `{prompt}` and `{workspace}` placeholders:
   ```
   my-agent --prompt "{prompt}" --dir "{workspace}"
   ```
4. For **REST API**: provide the endpoint URL, method, headers, and body template.
5. Configure the **Response Parser** — a JSONPath or regex pattern to extract the agent's output.
6. Click **Test Connection** to verify.

---

## Running Benchmarks

### Auto Mode (Recommended)

1. Go to the **Benchmark** tab.
2. Select a provider from the dropdown.
3. Click **Run All** to execute the complete benchmark suite across all difficulty tiers.
4. The progress bar shows current task execution status.
5. Tasks are run sequentially; results populate the results table in real time.
6. When complete, the dashboard automatically updates with the calculated half-life.

### Manual Mode

1. Go to the **Benchmark** tab.
2. Select a provider and a specific **Tier** (Easy, Medium, Hard, Expert).
3. Optionally select individual tasks from the task list.
4. Click **Run Selected** to execute only the chosen tasks.
5. Manual results are merged into the overall statistics for half-life calculation.

### Re-Running Tasks

- To re-run a specific task, right-click it in the results table and select **Re-run**.
- To clear all results and start fresh, click **Reset All Results**.
- Previous runs are saved in the history and can be compared via **History → Compare Runs**.

---

## Understanding the Dashboard

The dashboard presents four key elements after a benchmark run:

### Half-Life Value

Displayed prominently at the top of the dashboard:

```
Half-Life: 13.5 tasks
```

This is the number of sequential tasks at which the agent's cumulative success probability drops to 50%. Higher is better.

### Verdict

A qualitative assessment based on the half-life value:

| Half-Life       | Verdict       | Color  | Meaning                                      |
|-----------------|---------------|--------|----------------------------------------------|
| ≥ 50 tasks      | **Excellent** | 🟢 Green  | Highly reliable for extended autonomous runs |
| 20–49 tasks     | **Good**      | 🟢 Green  | Suitable for moderate task chains            |
| 10–19 tasks     | **Marginal**  | 🟡 Yellow | Use with human checkpoints                   |
| 5–9 tasks       | **Poor**      | 🟠 Orange | Requires frequent human oversight            |
| < 5 tasks       | **Unreliable**| 🔴 Red    | Not suitable for autonomous operation        |

### Survival Curve

An exponential decay plot showing:

- **X-axis**: Number of sequential tasks (n)
- **Y-axis**: Cumulative success probability P(n) = p^n
- **Red dashed line**: The 50% threshold
- **Vertical marker**: The half-life point where the curve crosses 50%

The curve visually demonstrates how quickly reliability degrades with sequential task chaining.

### Tier Breakdown Chart

A bar chart showing per-tier pass rates:

- **Easy**: Expected 95–100% for capable agents
- **Medium**: Expected 80–95%
- **Hard**: Expected 60–85%
- **Expert**: Expected 40–70%

Bars are color-coded: green (above expected), yellow (within range), red (below expected).

---

## Toby Ord's Scaling Rules Explained

Toby Ord's 2025 analysis provides a framework for understanding AI agent reliability at scale:

### The Core Insight

Even a small per-task error rate compounds dramatically over sequential tasks. An agent that succeeds 95% of the time on individual tasks will fail at least once within just 14 tasks with 50% probability.

### The Mathematics

Given:
- **p** = per-task success probability (e.g., 0.95)
- **n** = number of sequential tasks
- **P(n)** = probability of completing all n tasks = p^n

The half-life is:

```
n½ = log(0.5) / log(p) = -0.693 / log(p)
```

### Scaling Table

| Per-Task Rate | Half-Life | Implication                          |
|---------------|-----------|--------------------------------------|
| 99%           | 69 tasks  | Reliable for long autonomous runs    |
| 97%           | 23 tasks  | Good for medium workflows            |
| 95%           | 14 tasks  | Marginal — checkpoint every ~10 tasks|
| 90%           | 7 tasks   | Poor — needs constant oversight      |
| 85%           | 4 tasks   | Unreliable for chaining              |
| 80%           | 3 tasks   | Effectively single-task only         |

### Why This Matters

Many AI agent benchmarks report individual task accuracy (e.g., "95% on SWE-Bench"). Ord's model shows that this headline number is misleading for real-world use, where agents must complete **chains** of tasks. The half-life metric provides a more honest assessment of practical reliability.

---

## Exporting Reports

### PDF Report

1. After a benchmark run, go to **File → Export Report → PDF**.
2. The report includes:
   - Summary (agent, model, date, half-life, verdict)
   - Survival curve chart
   - Tier breakdown chart
   - Full task results table
   - Toby Ord methodology citation
3. Choose save location and filename.

### HTML Report

1. Go to **File → Export Report → HTML**.
2. Generates a self-contained HTML file with interactive charts.
3. Suitable for sharing via email or embedding in documentation.

### CSV Export

1. Go to **File → Export Results → CSV**.
2. Exports raw task results for further analysis in Excel or Python.

---

## License Activation

1. Purchase a license key at [sales@eswlab.com](mailto:sales@eswlab.com) — $50 USD per seat per year.
2. Go to **Settings → License Activation**.
3. Enter your **License Key** (format: `AHLT-XXXX-XXXX-XXXX-XXXX`).
4. Click **Activate**.
5. The application validates the key online and unlocks continued use.
6. Your license status and expiration date are shown in the Settings panel.

> **Note**: Each license key is valid for one user on one machine. Contact sales@eswlab.com to transfer a license.

---

## Troubleshooting

### Claude Code CLI Not Found

**Symptom**: "CLI not found" error when testing the Claude Code connection.

**Solutions**:
1. Verify Claude Code is installed: run `claude --version` in a terminal.
2. If installed via npm, ensure the npm global bin directory is in your `PATH`.
3. Manually set the CLI path in **Settings → Providers → Claude Code CLI → CLI Path**.
4. Restart the application after updating PATH.

### API Key Errors

**Symptom**: "401 Unauthorized" or "Invalid API Key" when testing API connections.

**Solutions**:
1. Verify your API key is correct and has not expired.
2. Check that your API key has sufficient permissions/credits.
3. For Anthropic: ensure the key starts with `sk-ant-`.
4. For OpenAI: ensure the key starts with `sk-`.
5. Check your firewall/proxy settings if behind a corporate network.

### Benchmark Tasks Timing Out

**Symptom**: Tasks show "Timeout" status in the results table.

**Solutions**:
1. Increase the timeout in **Settings → Benchmark → Task Timeout** (default: 120 seconds).
2. Check your internet connection for API-based providers.
3. For CLI providers, ensure the agent process is not hanging — check the task log for details.

### Dashboard Not Updating

**Symptom**: The dashboard shows stale data after a new benchmark run.

**Solutions**:
1. Click **Dashboard → Refresh** to force a recalculation.
2. Ensure the benchmark run completed (check the progress bar).
3. If issues persist, go to **Help → Reset Dashboard Cache**.

### Application Won't Start

**Symptom**: The application closes immediately or shows a crash dialog.

**Solutions**:
1. Ensure you are running Windows 10/11 64-bit.
2. Install the latest [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe).
3. Try running as Administrator.
4. Delete the config folder (`%APPDATA%\AgentHalfLifeTester\`) to reset settings.
5. Check the log file at `%APPDATA%\AgentHalfLifeTester\logs\` for error details.

### License Activation Failed

**Symptom**: "Activation failed" or "Invalid license key" error.

**Solutions**:
1. Verify the key format: `AHLT-XXXX-XXXX-XXXX-XXXX` (case-insensitive).
2. Ensure you have an active internet connection for online validation.
3. Check that the key has not already been activated on another machine.
4. Contact [support@eswlab.com](mailto:support@eswlab.com) for assistance.

---

## FAQ

### Q: What is a "half-life" in this context?

**A:** The half-life is the number of sequential tasks an AI agent can attempt before the cumulative probability of all tasks being correct drops to 50%. It's derived from the per-task success rate using the formula `n½ = log(0.5) / log(p)`, based on Toby Ord's exponential decay model.

### Q: How many tasks does the benchmark suite include?

**A:** The full suite includes 60 tasks across 4 tiers: 20 Easy, 20 Medium, 12 Hard, and 8 Expert. Running the full suite typically takes 30–90 minutes depending on the agent and connection speed.

### Q: Can I add my own benchmark tasks?

**A:** Yes. Go to **Settings → Benchmark → Custom Tasks** and add tasks with a prompt, expected output criteria, and difficulty tier. Custom tasks are included in the half-life calculation alongside built-in tasks.

### Q: Is the testing deterministic?

**A:** Agent responses are inherently non-deterministic. We recommend running the benchmark at least 3 times and using the average half-life for a reliable estimate. The **History → Compare Runs** feature helps track variance across runs.

### Q: Does it work offline?

**A:** CLI-based providers (Claude Code CLI, custom CLI agents) work offline as long as the agent itself runs locally. API-based providers require an internet connection.

### Q: Can I test agents other than Claude and GPT?

**A:** Yes. Use the **Custom Agent** provider to connect any agent accessible via CLI command or REST API. See [Setting Up Providers → Custom Agent](#custom-agent).

### Q: How is the verdict determined?

**A:** The verdict is based on the calculated half-life value: Excellent (≥50), Good (20–49), Marginal (10–19), Poor (5–9), Unreliable (<5). These thresholds are calibrated to practical autonomous workflow requirements.

### Q: What data is collected?

**A:** All benchmark data is stored locally on your machine at `%APPDATA%\AgentHalfLifeTester\`. No data is sent to ESW Lab servers. The only network call is license key validation during activation.

### Q: Can I use this for CI/CD pipelines?

**A:** Not yet, but a CLI-only mode for headless execution is on the roadmap. Contact [support@eswlab.com](mailto:support@eswlab.com) if this is a priority for your team.

### Q: Where can I learn more about Toby Ord's research?

**A:** Toby Ord's 2025 research on AI agent reliability and exponential decay models is the theoretical foundation. The key insight is that per-task accuracy is insufficient for evaluating agents in sequential workflows — the half-life metric provides a more practical measure. See the [Scaling Rules](#toby-ords-scaling-rules-explained) section for details.

---

© 2025-2026 ESW Lab Ltd. All rights reserved.
