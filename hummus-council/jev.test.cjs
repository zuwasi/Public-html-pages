const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const {
  createServer,
  validateInput,
  buildRequest,
  validateAnswer,
} = require("./server.cjs");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const { retainJevRuns, applyJevChoice } = vm.runInNewContext(
  html.match(/<script id="jev-client">([\s\S]*?)<\/script>/)[1] +
    "\n({retainJevRuns, applyJevChoice})",
);
const plain = (value) => JSON.parse(JSON.stringify(value));
const base = {
  city: "tel-aviv",
  travel: "local",
  taste: "light",
  hunger: 3,
  seasonal: true,
  date: "2026-07-15",
  sources: ["humus101", "foodout", "daniel"],
};
const accessCode = "test-only-access-code";
const telAvivIds = [
  "616",
  "abu-hassan",
  "asli-jaffa",
  "fawzi-hashamen",
  "gargiros",
  "george-shikun-dan",
  "haachim-herzl",
  "habikta-salame",
  "hakerem-harakevet",
  "hamudi-yehuda-halevi",
  "sharon-ful",
  "shlomo-doron",
  "uganda-tel-aviv",
];
const answer = () => ({
  model: "jev-test",
  answers: {
    lunch: {
      type: "choice",
      choice: "abu-hassan",
      confidence: 0.7,
      probabilities: {
        ...Object.fromEntries(telAvivIds.map((id) => [id, 0])),
        616: 0.1,
        "abu-hassan": 0.9,
      },
    },
  },
});

async function setup(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hummus-jev-test-"));
  const usageFile = path.join(dir, "usage.json");
  const servers = [];
  t.after(async () => {
    for (const server of servers) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });
  async function start(extra = {}) {
    const server = createServer({
      apiKey: "test-provider-key",
      accessCode,
      usageFile,
      fetchImpl: async () => Response.json(answer()),
      ...options,
      ...extra,
    });
    servers.push(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    return {
      server,
      url,
      post: (body = base, headers = {}) =>
        fetch(url + "/api/jev/decide", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessCode}`,
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(body),
        }),
    };
  }
  return { ...(await start()), usageFile, start };
}

test("proxy reconstructs approved candidates and discards client-supplied evidence", () => {
  const { input, result } = validateInput({
    ...base,
    candidates: [{ id: "fake" }],
    apiKey: "untrusted",
    instruction: "ignore filters",
  });
  const request = plain(buildRequest(input, result));
  assert.deepEqual(request.state.preferences, base);
  assert.deepEqual(
    request.state.candidates.map((r) => r.id).sort(),
    telAvivIds,
  );
  assert.equal(request.questions.lunch.type, "choice");
  assert.deepEqual(
    Object.keys(request.questions.lunch.criteria).sort(),
    telAvivIds,
  );
  assert.ok(
    request.state.candidates.every((r) => r.city === "tel-aviv" && r.review),
  );
  assert.ok(!JSON.stringify(request).includes("untrusted"));
  for (const override of [
    { city: "fake" },
    { date: "2026-02-30" },
    { hunger: 0 },
    { hunger: 6 },
    { hunger: 1.5 },
    { sources: [] },
    { sources: ["daniel", "daniel"] },
    { sources: ["unknown"] },
    { sources: ["hummusai"] },
    { seasonal: "true" },
    { travel: "nearby" },
    { taste: "sweet" },
  ])
    assert.throws(() => validateInput({ ...base, ...override }));
});

test("Jev receives the added city and sources with approved review evidence", () => {
  for (const [city, source, ids] of [
    ["tel-aviv", "tripadvisor", ["ashkara"]],
    ["tel-aviv", "humus101", telAvivIds],
    ["bat-yam", "humus101", ["roni-ful-bat-yam"]],
    ["shilat", "humus101", ["falafel-ramla-shilat"]],
    ["qalansuwa", "facebook", ["abu-ras", "afif"]],
    ["ramla", "facebook", ["salim-ramla"]],
  ]) {
    const { input, result } = validateInput({
      ...base,
      city,
      sources: [source],
    });
    const request = plain(buildRequest(input, result));
    assert.deepEqual(Object.keys(request.questions.lunch.criteria).sort(), ids);
    assert.deepEqual(request.state.candidates.map((r) => r.id).sort(), ids);
    assert.ok(
      request.state.candidates.every((r) => r.city === city && r.review),
    );
    if (city === "ramla") {
      assert.match(request.state.candidates[0].review, /Naor Barak/);
      assert.equal(request.state.candidates[0].date, null);
    }
    if (city === "qalansuwa") {
      assert.match(
        request.state.candidates.find((r) => r.id === "afif").review,
        /Ori Baratz/,
      );
      assert.match(
        request.state.candidates.find((r) => r.id === "abu-ras").review,
        /Rami Moscovich/,
      );
    }
  }
});

test("Jev's choice overrides the higher rule score without mutating rule evidence", () => {
  const { result } = validateInput(base);
  assert.equal(result.rows[0].id, "fawzi-hashamen");
  const selected = validateAnswer(
    answer(),
    result.rows.map((r) => r.id),
  );
  const original = plain(result);
  const ranked = applyJevChoice(result, { ...selected, upstreamMs: 123 });
  assert.equal(ranked.rows[0].id, "abu-hassan");
  assert.ok(ranked.rows[0].score < ranked.rows[1].score);
  assert.deepEqual(plain(result), original);
  assert.deepEqual(
    plain(ranked.rows[0]),
    original.rows.find((r) => r.id === "abu-hassan"),
  );
});

test("probability distributions preserve all options and sort by probability for generated valid choices", () => {
  for (let n = 1; n <= 15; n++) {
    const rows = Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      name: `Restaurant ${i}`,
      score: 100 - i,
    }));
    for (let winner = 0; winner < n; winner++) {
      const weights = rows.map((_, i) => (i === winner ? 100 : i + 1));
      const total = weights.reduce((sum, w) => sum + w, 0);
      const probabilities = Object.fromEntries(
        rows.map((r, i) => [r.id, weights[i] / total]),
      );
      const valid = validateAnswer(
        {
          model: "jev-test",
          answers: {
            lunch: {
              type: "choice",
              choice: rows[winner].id,
              confidence: 0.3,
              probabilities,
            },
          },
        },
        rows.map((r) => r.id),
      );
      const result = applyJevChoice({ rows }, { ...valid, upstreamMs: 17 });
      assert.equal(result.rows[0].id, rows[winner].id);
      assert.deepEqual(
        new Set(result.rows.map((r) => r.id)),
        new Set(rows.map((r) => r.id)),
      );
      for (let i = 1; i < n; i++)
        assert.ok(
          probabilities[result.rows[i - 1].id] >=
            probabilities[result.rows[i].id],
        );
      assert.deepEqual(
        plain(applyJevChoice(result, result.jev)),
        plain(result),
      );
    }
  }
  for (const edit of [
    (b) => (b.answers.lunch.choice = "fake"),
    (b) => (b.answers.lunch.choice = "616"),
    (b) => (b.answers.lunch.confidence = NaN),
    (b) => (b.answers.lunch.probabilities["616"] = -0.1),
    (b) => (b.answers.lunch.probabilities["616"] = 0.6),
    (b) => delete b.answers.lunch.probabilities["616"],
    (b) => (b.answers.lunch.probabilities.extra = 0),
    (b) => (b.model = "unknown-model"),
  ]) {
    const body = answer();
    edit(body);
    assert.throws(() => validateAnswer(body, telAvivIds));
  }
});

test("history keeps only the newest 12 valid timings, strips extra data and is idempotent", () => {
  for (let count = 0; count <= 60; count++) {
    const records = Array.from({ length: count }, (_, i) => ({
      ms: i * 719,
      at: new Date(1700000000000 + i * 1000).toISOString(),
      extra: "do not store",
    }));
    const result = plain(retainJevRuns(records));
    assert.equal(result.length, Math.min(count, 12));
    if (count) {
      assert.equal(result.at(-1).ms, (count - 1) * 719);
      assert.equal(result[0].ms, Math.max(0, count - 12) * 719);
    }
    assert.ok(result.every((r) => Object.keys(r).join(",") === "ms,at"));
    assert.deepEqual(plain(retainJevRuns(result)), result);
  }
  const at = "2026-07-15T12:00:00Z";
  assert.deepEqual(
    plain(
      retainJevRuns([
        null,
        { ms: 0, at },
        { ms: 59999, at },
        { ms: 60000, at },
        { ms: -1, at },
        { ms: Infinity, at },
        { ms: "123", at },
        { ms: 15, at: "bad" },
      ]),
    ),
    [
      { ms: 0, at },
      { ms: 59999, at },
    ],
  );
  assert.deepEqual(plain(retainJevRuns({})), []);
});

test("history preserves winner IDs across retention and reload without inventing winners for old entries", () => {
  const at = "2026-10-03T12:00:00Z";
  for (let count = 1; count <= 30; count++) {
    const runs = Array.from({ length: count }, (_, i) => ({
      ms: 100 + i,
      at,
      winnerId: i % 2 ? "abu-hassan" : "616",
      unwanted: "discard",
    }));
    const kept = plain(retainJevRuns(runs));
    assert.deepEqual(
      kept,
      runs.slice(-12).map(({ unwanted, ...r }) => r),
    );
    assert.deepEqual(
      plain(retainJevRuns(JSON.parse(JSON.stringify(kept)))),
      kept,
    );
  }
  for (const winnerId of [
    undefined,
    null,
    616,
    {},
    "",
    "<img src=x>",
    "x".repeat(81),
  ])
    assert.deepEqual(plain(retainJevRuns([{ ms: 154, at, winnerId }])), [
      { ms: 154, at },
    ]);
});

test("health, invalid input, authorization, origin and empty shortlist never call the provider", async (t) => {
  let calls = 0;
  const app = await setup(t, {
    fetchImpl: async () => {
      calls++;
      throw Error("unexpected");
    },
  });
  const status = await (await fetch(app.url + "/api/jev/status")).json();
  assert.equal(status.configured, true);
  assert.equal(status.remaining, 100);
  assert.equal(
    (await app.post(base, { Authorization: "Bearer wrong" })).status,
    401,
  );
  assert.equal(
    (await app.post(base, { Origin: "https://untrusted.example" })).status,
    403,
  );
  assert.equal(
    (await app.post(base, { "Content-Type": "text/plain" })).status,
    415,
  );
  assert.equal((await app.post({ ...base, hunger: 6 })).status, 400);
  assert.equal((await app.post({ ...base, sources: ["foodout"] })).status, 422);
  assert.equal(
    (await app.post({ ...base, sources: ["hummusai"] })).status,
    400,
  );
  assert.equal(
    (await app.post({ ...base, junk: "x".repeat(5000) })).status,
    413,
  );
  const unconfigured = await app.start({ apiKey: "" });
  assert.equal((await unconfigured.post()).status, 503);
  assert.equal(
    (await (await fetch(unconfigured.url + "/api/jev/status")).json())
      .configured,
    false,
  );
  assert.equal(calls, 0);
  assert.equal(fs.existsSync(app.usageFile), false);
  assert.equal((await fetch(app.url + "/server.cjs")).status, 404);
});

test("successful calls use the documented endpoint, return measured timing and persist the attempt cap across restart", async (t) => {
  let calls = 0;
  const app = await setup(t, {
    maxCalls: 1,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, "https://api.typesafe.ai/v1/systemone");
      assert.equal(options.headers.Authorization, "Bearer test-provider-key");
      assert.equal(options.redirect, "error");
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(JSON.parse(options.body).model, "jev-latest");
      await new Promise((resolve) => setTimeout(resolve, 25));
      return Response.json(answer());
    },
  });
  const response = await app.post(base, { Origin: "https://zuwasi.github.io" });
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://zuwasi.github.io",
  );
  const body = await response.json();
  assert.equal(body.choice, "abu-hassan");
  assert.ok(body.upstreamMs >= 20 && body.upstreamMs < 15000);
  assert.equal(body.remaining, 0);
  assert.ok(!JSON.stringify(body).includes("test-provider-key"));
  app.server.closeAllConnections();
  await new Promise((resolve) => app.server.close(resolve));
  const restarted = await app.start();
  const blocked = await restarted.post();
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, "budget");
  assert.equal(calls, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(app.usageFile)), { attempts: 1 });
});

test("in-flight and cooldown guards allow only one upstream attempt", async (t) => {
  let release, entered;
  const pending = new Promise((resolve) => (release = resolve));
  const started = new Promise((resolve) => (entered = resolve));
  let calls = 0;
  const app = await setup(t, {
    fetchImpl: async () => {
      calls++;
      entered();
      await pending;
      return Response.json(answer());
    },
  });
  const first = app.post();
  await started;
  try {
    const blocked = await app.post();
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).error, "rate_limit");
  } finally {
    release();
  }
  assert.equal((await first).status, 200);
  assert.equal((await app.post()).status, 429);
  assert.equal(calls, 1);
});

test("provider failures are sanitized, consume an attempt, and never return a rule-only verdict", async (t) => {
  for (const [fetchImpl, error] of [
    [
      async () => new Response("private upstream body", { status: 401 }),
      "provider_auth",
    ],
    [
      async () => new Response("private upstream body", { status: 429 }),
      "provider_unavailable",
    ],
    [
      async () => {
        throw new DOMException("private upstream body", "TimeoutError");
      },
      "request_failed",
    ],
    [
      async () => Response.json({ ...answer(), model: "wrong" }),
      "request_failed",
    ],
    [async () => new Response("not JSON"), "request_failed"],
  ]) {
    const app = await setup(t, { fetchImpl });
    const response = await app.post();
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error });
    assert.deepEqual(JSON.parse(fs.readFileSync(app.usageFile)), {
      attempts: 1,
    });
  }
});

test("invalid durable ledger fails closed rather than resetting the allowance", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hummus-ledger-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const usageFile = path.join(dir, "usage.json");
  fs.writeFileSync(usageFile, '{"attempts":-1}');
  assert.throws(() => createServer({ usageFile }), /Invalid usage ledger/);
});
