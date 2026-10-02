const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync(`${__dirname}/index.html`, "utf8");
const engine = html.match(
  /<script id="decision-engine">([\s\S]*?)<\/script>/,
)[1];
const { decide, seasonFor } = vm.runInNewContext(
  `${engine}\n({decide, seasonFor})`,
);
const base = {
  city: "tel-aviv",
  date: "2026-07-15",
  travel: "local",
  taste: "light",
  hunger: 3,
  seasonal: true,
  sources: ["humus101", "hummusai", "foodout"],
};

test("city and source are hard filters, including a genuinely empty shortlist", () => {
  assert.deepEqual(
    Array.from(decide(base).rows, (r) => r.id),
    ["616", "abu-hassan"],
  );
  assert.equal(decide({ ...base, sources: ["hummusai"] }).rows.length, 0);
  const food = decide({ ...base, travel: "any", sources: ["foodout"] }).rows;
  assert.deepEqual(
    Array.from(food, (r) => r.id),
    ["asa"],
  );
  assert.equal(food[0].parts.location, 0);
  assert.throws(() => decide({ ...base, sources: [] }), /at least one blog/);
});
test("taste changes the winner and exact component scores", () => {
  const light = decide(base).rows[0];
  assert.equal(light.id, "616");
  assert.equal(light.score, 100); // 40 local + 30 taste + 20 summer + 10 evidence
  const chunky = decide({ ...base, taste: "chunky" }).rows[0];
  assert.equal(chunky.id, "abu-hassan");
  assert.equal(chunky.score, 75); // 40 local + 30 taste + 0 summer + 5 old review
});
test("changing only the date can change the verdict", () => {
  const trip = { ...base, city: "jerusalem", travel: "any", taste: "rich" };
  const summer = decide(trip).rows[0];
  const winter = decide({ ...trip, date: "2026-01-15" }).rows[0];
  assert.equal(summer.id, "lina");
  assert.equal(summer.score, 65); // 40 + 0 + 20 + 5
  assert.equal(winter.id, "616");
  assert.equal(winter.score, 60); // 0 + 30 + 20 + 10
  const hungry = decide({ ...trip, date: "2026-01-15", hunger: 4 }).rows[0];
  assert.equal(hungry.id, "lina");
  assert.equal(hungry.score, 60); // 55 + 0 + 0 + 5
});
test("season boundaries and invalid dates are not timezone-dependent", () => {
  for (const [date, season] of [
    ["2026-05-31", "mild"],
    ["2026-06-01", "summer"],
    ["2026-09-30", "summer"],
    ["2026-10-01", "mild"],
    ["2026-11-30", "mild"],
    ["2026-12-01", "winter"],
    ["2026-02-28", "winter"],
    ["2026-03-01", "mild"],
    ["2028-02-29", "winter"],
  ])
    assert.equal(seasonFor(date), season);
  for (const date of ["", "garbage", "2026-02-29", "2026-06-31", "2026-13-01"])
    assert.throws(() => seasonFor(date));
});
test("unknown style receives half credit, not a fabricated match", () => {
  const unknown = decide({ ...base, city: "ramla" }).rows[0];
  assert.equal(unknown.id, "khalil");
  assert.equal(unknown.parts.taste, 15);
  assert.equal(unknown.parts.season, 10);
  assert.equal(unknown.score, 70);
  const neutral = decide({ ...base, seasonal: false }).rows[0];
  assert.equal(neutral.parts.season, 10);
  assert.equal(neutral.score, 90);
});
test("all supported input combinations preserve filters, bounded additive scores and neutral-season invariance", () => {
  const cities = [
    "tel-aviv",
    "jerusalem",
    "haifa",
    "ramla",
    "nazareth",
    "ness-ziona",
    "kafr-qasim",
    "beit-dagan",
  ];
  const sources = ["humus101", "hummusai", "foodout"];
  for (const city of cities)
    for (const taste of ["light", "rich", "chunky", "any"])
      for (const hunger of [1, 3, 4, 5])
        for (const travel of ["local", "any"])
          for (const date of ["2026-01-15", "2026-07-15", "2026-10-15"])
            for (let mask = 1; mask < 8; mask++) {
              const input = {
                ...base,
                city,
                taste,
                hunger,
                travel,
                date,
                sources: sources.filter((_, i) => mask & (1 << i)),
              };
              const result = decide(input);
              for (const row of result.rows) {
                assert.ok(input.sources.includes(row.source));
                if (travel === "local") assert.equal(row.city, city);
                assert.ok(row.score >= 0 && row.score <= 100);
                assert.equal(
                  row.score,
                  Object.values(row.parts).reduce((a, b) => a + b, 0),
                );
              }
              for (let i = 1; i < result.rows.length; i++)
                assert.ok(result.rows[i - 1].score >= result.rows[i].score);
              assert.equal(
                JSON.stringify(decide({ ...input, seasonal: false }).rows),
                JSON.stringify(
                  decide({ ...input, date: "2026-04-15", seasonal: false })
                    .rows,
                ),
              );
              const restricted = decide({ ...input, travel: "local" }).rows;
              const broader = decide({ ...input, travel: "any" }).rows;
              assert.ok(
                restricted.every((r) => broader.some((b) => b.id === r.id)),
              );
            }
});
