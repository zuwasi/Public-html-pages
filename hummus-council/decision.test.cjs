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
  sources: ["humus101", "foodout", "daniel"],
};

test("city and source are hard filters, including a genuinely empty shortlist", () => {
  assert.deepEqual(
    Array.from(
      decide({ ...base, city: "bat-yam", sources: ["humus101"] }).rows,
      (r) => r.id,
    ),
    ["roni-ful-bat-yam"],
  );
  assert.equal(decide({ ...base, sources: ["foodout"] }).rows.length, 0);
  const food = decide({ ...base, travel: "any", sources: ["foodout"] }).rows;
  assert.deepEqual(
    Array.from(food, (r) => r.id),
    ["asa"],
  );
  assert.equal(food[0].parts.location, 0);
  assert.throws(() => decide({ ...base, sources: [] }), /at least one source/);
});
test("taste changes the winner and exact component scores", () => {
  const light = decide(base).rows.find((r) => r.id === "616");
  assert.equal(light.score, 100); // 40 local + 30 taste + 20 summer + 10 evidence
  const chunky = decide({ ...base, taste: "chunky" }).rows.find(
    (r) => r.id === "abu-hassan",
  );
  assert.equal(chunky.score, 75); // 40 local + 30 taste + 0 summer + 5 old review
  assert.equal(decide(base).rows[0].id, "fawzi-hashamen");
  assert.equal(decide({ ...base, taste: "rich" }).rows[0].id, "616");
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
  const unknown = decide({ ...base, city: "fureidis" }).rows[0];
  assert.equal(unknown.id, "abu-qassem");
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
  assert.equal(combined.sourced, 24);
  assert.equal(combined.rows.filter((r) => r.id === "abu-hassan").length, 1);
  assert.equal(
    combined.rows.find((r) => r.id === "abu-hassan").source,
    "humus101",
  );
});
test("added reviews preserve attribution, dates and source/city restrictions", () => {
  const ashkara = decide({ ...base, sources: ["tripadvisor"] }).rows;
  assert.equal(ashkara.length, 1);
  assert.equal(ashkara[0].id, "ashkara");
  assert.equal(ashkara[0].date, "2020-02-21");
  assert.equal(ashkara[0].tags.length, 0);
  assert.equal(ashkara[0].score, 75); // Unknown texture is not a full taste or summer match.
  assert.match(ashkara[0].url, /d807968-Reviews-Hummus_Ashkara/);
  const shlomo = decide({ ...base, sources: ["humus101"] }).rows.find(
    (r) => r.id === "shlomo-doron",
  );
  assert.equal(shlomo.date, "2007-12-15");
  assert.equal(shlomo.url, "https://humus101.com/251");
  assert.equal(shlomo.parts.evidence, 5);
  assert.equal(shlomo.tags.join(), "chunky");
  const community = {
    ...base,
    city: "qalansuwa",
    sources: ["facebook"],
    taste: "chunky",
  };
  const rows = decide(community).rows;
  assert.deepEqual(
    Array.from(rows, (r) => [r.id, r.date, r.score]),
    [
      ["abu-ras", "2025-05-24", 80],
      ["afif", "2025-02-21", 80],
      ["abu-adam-qalansuwa", "2026-09-26", 75],
    ],
  );
  assert.match(rows[0].note, /Rami Moscovich/);
  assert.match(rows[1].note, /Ori Baratz/);
  assert.equal(
    rows[0].url,
    "https://www.facebook.com/groups/Msabbaha/posts/1607683863206544/",
  );
  assert.equal(
    rows[1].url,
    "https://www.facebook.com/groups/Msabbaha/posts/1544271516214446/",
  );
  assert.equal(decide({ ...community, sources: ["daniel"] }).rows.length, 0);
  assert.equal(decide({ ...community, city: "tel-aviv" }).rows.length, 0);
  assert.equal(
    decide({ ...community, city: "tel-aviv", travel: "any" }).rows.length,
    15,
  );
  assert.equal(
    decide({ ...base, travel: "any", sources: Object.keys(SOURCES) }).sourced,
    40,
  );
});
test("new community evidence preserves places, dates and conservative style tags", () => {
  const expected = [
    ["abu-ihsan-baqa", "baqa", "2026-09-23", "", "Nimrod Saidof"],
    ["madames-sakhnin", "sakhnin", "2026-09-25", "", "Ori Baratz"],
    [
      "abu-adham-kafr-yasif",
      "kafr-yasif",
      "2026-09-26",
      "chunky",
      "Ilan Ronen",
    ],
    ["zina-zarzir", "zarzir", "2026-10-02", "", "Idan Stiklaru"],
    ["arafat-jerusalem", "jerusalem", "2026-09-30", "chunky", "Roy Levy"],
    ["al-amir-tarshiha", "tarshiha", "2026-10-03", "", "Lior Peri"],
    ["al-sheikh-nazareth", "nazareth", "2026-10-03", "light", "Ori Baratz"],
    ["uzi-netanya", "netanya", "2026-10-02", "", "Noam Yarkoni"],
    [
      "abu-jamal-kafr-qara",
      "kafr-qara",
      "2026-08-19",
      "light,chunky",
      "Alex Sternick",
    ],
    ["abu-adam-qalansuwa", "qalansuwa", "2026-09-26", "", "Rami Moscovich"],
    ["neri-hod-hasharon", "hod-hasharon", "2026-06-23", "chunky", "Noam Atlas"],
    ["abu-ali-jerusalem", "jerusalem", "2026-09-28", "chunky", "Shay Iluz"],
  ];
  for (const [id, city, date, tags, author] of expected) {
    const input = { ...base, city, sources: ["facebook"] };
    const row = decide(input).rows.find((r) => r.id === id);
    assert.ok(row, id);
    assert.equal(row.date, date);
    assert.equal(row.tags.join(), tags);
    assert.ok(row.note.includes(author));
    assert.equal(row.parts.evidence, 10);
    assert.equal(row.parts.taste, tags.includes("light") ? 30 : tags ? 0 : 15);
    assert.equal(row.parts.season, tags.includes("light") ? 20 : tags ? 0 : 10);
    assert.ok(
      !decide({ ...input, sources: ["daniel"] }).rows.some((r) => r.id === id),
    );
    assert.ok(
      !decide({ ...input, city: "tel-aviv" }).rows.some((r) => r.id === id),
    );
    assert.match(html, new RegExp(`<option value="${city}">`));
  }
});
test("repeated community reviews keep both authors and links but only one seat", () => {
  const rows = decide({ ...base, travel: "any", sources: ["facebook"] }).rows;
  assert.equal(rows.length, 15);
  assert.equal(new Set(rows.map((r) => r.id)).size, 15);
  for (const [id, author, primary, additional] of [
    ["arafat-jerusalem", "Ronen Amit", "1989046911736902", "1987231548585105"],
    [
      "zina-zarzir",
      "Anan the locksmith",
      "1991146224860304",
      "1990922528216007",
    ],
  ]) {
    const row = rows.find((r) => r.id === id);
    assert.ok(row.note.includes(author));
    assert.equal(
      row.url,
      `https://www.facebook.com/groups/Msabbaha/permalink/${primary}/`,
    );
    assert.deepEqual(Array.from(row.additionalUrls), [
      `https://www.facebook.com/groups/Msabbaha/permalink/${additional}/`,
    ]);
  }
  const links = rows.flatMap((r) => [r.url, ...(r.additionalUrls || [])]);
  assert.equal(new Set(links).size, 17);
  assert.ok(!links.some((url) => url.includes("1986335968674663")));
  assert.match(html, /id="community-background"/);
  assert.match(html, /permalink\/1986335968674663\//);
  assert.match(
    rows.find((r) => r.id === "abu-adam-qalansuwa").note,
    /one-off curiosity/,
  );
  assert.match(
    rows.find((r) => r.id === "abu-ali-jerusalem").note,
    /liked the hummus-ful less/,
  );
});
test("Salim uses Naor's community review without inventing a date or Daniel attribution", () => {
  const input = {
    ...base,
    city: "ramla",
    sources: ["facebook"],
    taste: "chunky",
  };
  const rows = decide(input).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "salim-ramla");
  assert.equal(rows[0].date, null);
  assert.equal(rows[0].tags.join(), "chunky");
  assert.equal(rows[0].score, 75); // 40 local + 30 masabacha + 0 summer + 5 unconfirmed date
  assert.match(rows[0].note, /Naor Barak/);
  assert.match(rows[0].note, /personal opinion/);
  assert.equal(
    rows[0].url,
    "https://www.facebook.com/groups/Msabbaha/permalink/1990927588215501/",
  );
  assert.equal(decide({ ...input, sources: ["daniel"] }).rows.length, 0);
  assert.equal(decide({ ...input, sources: ["humus101"] }).rows.length, 0);
});
test("retired Hummusai source and its four unsupported profiles are absent", () => {
  assert.equal(Object.keys(SOURCES).length, 5);
  assert.equal(Object.hasOwn(SOURCES, "hummusai"), false);
  assert.doesNotMatch(html, /hummusai|The Hummusai/i);
  const rows = decide({
    ...base,
    travel: "any",
    sources: Object.keys(SOURCES),
  }).rows;
  for (const id of ["khalil", "el-sheikh", "petra", "basha"])
    assert.ok(!rows.some((r) => r.id === id));
});
test("crawl separates complete indexing from curated candidates and closure notices", () => {
  const index = JSON.parse(
    fs.readFileSync(`${__dirname}/humus101-index.json`, "utf8"),
  );
  assert.equal(index.complete, true);
  assert.equal(index.expectedPosts, 296);
  assert.equal(index.fetchedPosts, 296);
  assert.equal(index.posts.length, 296);
  assert.equal(new Set(index.posts.map((p) => p.url)).size, 296);
  assert.equal(index.posts.filter((p) => p.date >= "2020").length, 20);
  assert.ok(
    index.posts.every(
      (p) => Object.keys(p).sort().join() === "date,id,modified,title,url",
    ),
  );
  const rows = decide({ ...base, travel: "any", sources: ["humus101"] }).rows;
  assert.equal(rows.length, 17);
  const urls = rows.map((r) => r.url);
  for (const id of [9730, 9674, 9652, 9222, 75, 8625, 8571]) {
    assert.ok(index.posts.some((p) => p.id === id));
    assert.ok(!urls.includes(`https://humus101.com/${id}`));
  }
  for (const id of [
    9761, 8720, 8462, 9598, 9513, 9479, 9278, 9127, 9057, 8860, 8677, 8599,
  ]) {
    const row = rows.find((r) => r.url === `https://humus101.com/${id}`);
    assert.ok(row);
    assert.equal(
      row.date,
      index.posts.find((p) => p.id === id).date.slice(0, 10),
    );
  }
  assert.equal(
    decide({ ...base, city: "shilat" }).rows[0].id,
    "falafel-ramla-shilat",
  );
  assert.ok(
    !decide({ ...base, city: "ramla" }).rows.some(
      (r) => r.id === "falafel-ramla-shilat",
    ),
  );
  assert.equal(
    rows.find((r) => r.id === "uganda-tel-aviv").tags.join(),
    "rich",
  );
  assert.equal(rows.find((r) => r.id === "asli-jaffa").tags.length, 0);
  // Comparable recent light-texture evidence now exists without altering 616's tags or points.
  const summer = decide(base).rows;
  for (const id of ["fawzi-hashamen", "gargiros", "sharon-ful", "616"])
    assert.equal(summer.find((r) => r.id === id).score, 100);
});
test("all supported input combinations preserve filters, bounded additive scores and neutral-season invariance", () => {
  const cities = [
    "tel-aviv",
    "jerusalem",
    "haifa",
    "ramla",
    "kafr-qasim",
    "qalansuwa",
    "bat-yam",
    "shilat",
    "beit-dagan",
    "fureidis",
    "rameh",
    "al-lubban",
    "baqa",
    "sakhnin",
    "kafr-yasif",
    "zarzir",
    "tarshiha",
    "nazareth",
    "netanya",
    "kafr-qara",
    "hod-hasharon",
  ];
  const sources = ["humus101", "foodout", "daniel", "tripadvisor", "facebook"];
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
