const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync(`${__dirname}/index.html`, "utf8");
const engine = html.match(
  /<script id="decision-engine">([\s\S]*?)<\/script>/,
)[1];
const { decide, seasonFor, DANIEL_REVIEWS, SOURCES } = vm.runInNewContext(
  `${engine}\n({decide, seasonFor, DANIEL_REVIEWS, SOURCES})`,
);
const base = {
  city: "tel-aviv",
  date: "2026-07-15",
  travel: "local",
  taste: "light",
  hunger: 3,
  seasonal: true,
  sources: ["humus101", "hummusai", "foodout", "daniel"],
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
  assert.throws(() => decide({ ...base, sources: [] }), /at least one source/);
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
test("Daniel's historical mentions stay selectable without turning anecdotes into restaurant evidence", () => {
  const input = { ...base, city: "haifa", sources: ["daniel"] };
  const result = decide(input);
  assert.equal(result.sourced, 7);
  assert.deepEqual(
    Array.from(result.rows, (r) => r.id),
    ["el-sham"],
  );
  const row = result.rows[0];
  assert.equal(row.score, 75); // 40 local + 15 unknown taste + 10 unknown season + 10 dated evidence
  assert.equal(row.tags.length, 0);
  assert.equal(row.date, "2022-08-12");
  assert.equal(row.url, "https://www.facebook.com/groups/Msabbaha");
  assert.equal(row.url, SOURCES.daniel.url);
  assert.equal(row.note, DANIEL_REVIEWS.elSham.note);
  assert.equal(decide({ ...input, date: "2026-01-15" }).rows[0].score, 75);
  assert.equal(decide({ ...input, hunger: 5 }).rows[0].score, 83);
  assert.equal(decide({ ...input, city: "jerusalem" }).rows.length, 0);
  assert.equal(decide({ ...input, travel: "any" }).rows.length, 7);
  assert.ok(
    decide({ ...input, sources: ["humus101"] }).rows.every(
      (r) => r.id !== "el-sham",
    ),
  );
  assert.equal(Object.keys(DANIEL_REVIEWS).length, 14);
  assert.equal(Object.values(DANIEL_REVIEWS).filter((r) => r.pages).length, 6);
  assert.deepEqual(
    Object.values(DANIEL_REVIEWS)
      .filter((r) => r.htmlPost)
      .map((r) => r.htmlPost)
      .sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  );
  assert.equal(DANIEL_REVIEWS.milos.date, null);
  assert.match(DANIEL_REVIEWS.hotel.note, /not a hummus menu price/);
  assert.match(DANIEL_REVIEWS.taha.note, /ful, not hummus/);
  assert.doesNotMatch(
    html,
    /723089582|facebook-visible-ocr|C:\\Amp_demos|C:\\Users\\danie\\Downloads/,
  );
});
test("HTML evidence changes taste choices without inventing lightness, dates or duplicate seats", () => {
  const input = { ...base, city: "kafr-qasim", sources: ["daniel"] };
  const chunky = decide({ ...input, taste: "chunky" }).rows[0];
  assert.equal(chunky.id, "abu-al-abed");
  assert.equal(chunky.score, 75); // 40 location + 30 taste + 0 summer + 5 undated
  const rich = decide({ ...input, taste: "rich", date: "2026-01-15" }).rows[0];
  assert.equal(rich.id, "hamza");
  assert.equal(rich.score, 95); // 40 + 30 + 20 + 5
  assert.match(rich.note, /personally prefers other styles/);
  for (const [city, id] of [
    ["fureidis", "abu-qassem"],
    ["rameh", "abu-rami"],
    ["al-lubban", "asumi"],
  ]) {
    const row = decide({ ...input, city }).rows[0];
    assert.equal(row.id, id);
    assert.equal(row.date, null);
    assert.equal(row.tags.length, 0);
    assert.equal(row.score, 70); // 40 + 15 unknown taste + 10 unknown season + 5 undated
  }
  const daniel = decide({ ...input, city: "tel-aviv" }).rows;
  assert.equal(daniel.length, 1);
  assert.equal(daniel[0].id, "abu-hassan");
  assert.equal(daniel[0].note, DANIEL_REVIEWS.abuHassan.note);
  const combined = decide({ ...base, travel: "any" });
  assert.equal(combined.sourced, 15);
  assert.equal(combined.rows.filter((r) => r.id === "abu-hassan").length, 1);
  assert.equal(
    combined.rows.find((r) => r.id === "abu-hassan").source,
    "humus101",
  );
  assert.equal(decide({ ...input, sources: ["hummusai"] }).rows[0].id, "basha");
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
    "fureidis",
    "rameh",
    "al-lubban",
  ];
  const sources = ["humus101", "hummusai", "foodout", "daniel"];
  for (const city of cities)
    for (const taste of ["light", "rich", "chunky", "any"])
      for (const hunger of [1, 3, 4, 5])
        for (const travel of ["local", "any"])
          for (const date of ["2026-01-15", "2026-07-15", "2026-10-15"])
            for (let mask = 1; mask < 1 << sources.length; mask++) {
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
              assert.equal(
                new Set(result.rows.map((r) => r.id)).size,
                result.rows.length,
              );
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
