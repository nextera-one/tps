/**
 * Chinese Lunisolar Calendar Driver Tests
 */

import { TPS, DefaultCalendars } from "../src/index";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name} — returned false`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${name} — ${(e as Error).message}`);
    failed++;
  }
}

console.log("\n=== Chinese Lunisolar Calendar Driver ===\n");

const chinDriver = TPS.getDriver("chin")!;
const testDate = new Date("2026-01-09T00:00:00Z"); // Gregorian reference

// Registration
test("chin driver is registered", () => chinDriver !== undefined);
test("chin driver code is 'chin'", () => chinDriver.code === "chin");

// Metadata
const meta = chinDriver.getMetadata();
test("metadata name is correct", () => meta.name === "Chinese Lunisolar");
test("metadata isLunar is true", () => meta.isLunar === true);
test("metadata monthsPerYear is 12", () => meta.monthsPerYear === 12);

// Conversion
const comp = chinDriver.getComponentsFromDate(testDate);
const huangdiYear =
  ((comp.millennium ?? 0) - 1) * 1000 +
  ((comp.century ?? 0) - 1) * 100 +
  (comp.year ?? 0);

test("year is in valid Huangdi range (~4722-4724)", () =>
  huangdiYear >= 4720 && huangdiYear <= 4730);
test("month is in valid range 1-12", () =>
  (comp.month ?? 0) >= 1 && (comp.month ?? 0) <= 12);
test("day is in valid range 1-30", () =>
  (comp.day ?? 0) >= 1 && (comp.day ?? 0) <= 30);

// Roundtrip
const back = chinDriver.getDateFromComponents(comp);
test("roundtrip preserves date within ±2 days", () => {
  const diff = Math.abs(back.getTime() - testDate.getTime());
  return diff <= 2 * 86_400_000;
});

// TPS string
const chinTps = TPS.fromDate(testDate, "chin");
test("TPS.fromDate produces chin calendar", () => chinTps.startsWith("T:chin"));
test("chin TPS validates", () => TPS.validate(chinTps));

const chinDate = TPS.toDate(chinTps);
test("TPS.toDate roundtrip within ±2 days", () => {
  if (!chinDate) return false;
  const diff = Math.abs(chinDate.getTime() - testDate.getTime());
  return diff <= 2 * 86_400_000;
});

// Format
test("format default outputs YYYY-MM-DD style", () => {
  const s = chinDriver.format(comp);
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
});
test("format 'zh' outputs Chinese characters", () => {
  const s = chinDriver.format(comp, "zh");
  return s.includes("年") && s.includes("月") && s.includes("日");
});
test("format 'ganzhi' includes zodiac animal", () => {
  const s = chinDriver.format(comp, "ganzhi");
  const animals = [
    "Rat",
    "Ox",
    "Tiger",
    "Rabbit",
    "Dragon",
    "Snake",
    "Horse",
    "Goat",
    "Monkey",
    "Rooster",
    "Dog",
    "Pig",
  ];
  return animals.some((a) => s.includes(a));
});

// parseDate
test("parseDate parses ISO-style year", () => {
  const parsed = chinDriver.parseDate("4724-01-15");
  const fy =
    ((parsed.millennium ?? 0) - 1) * 1000 +
    ((parsed.century ?? 0) - 1) * 100 +
    (parsed.year ?? 0);
  return fy === 4724 && parsed.month === 1 && parsed.day === 15;
});

// validate
test("validate valid date returns true", () =>
  chinDriver.validate({ year: 26, month: 1, day: 15 }));
test("validate month 13 returns false", () =>
  !chinDriver.validate({ year: 26, month: 13, day: 1 }));
test("validate day 31 returns false", () =>
  !chinDriver.validate({ year: 26, month: 1, day: 31 }));

// Cross-calendar
test("cross: greg → chin succeeds", () =>
  TPS.to("chin", TPS.fromDate(testDate, "greg")) !== null);
test("cross: chin → greg succeeds", () => {
  const greg = TPS.to("greg", chinTps);
  return greg !== null && greg.startsWith("T:greg");
});

// Spring Festival spot checks
const springFestDates: [number, [number, number]][] = [
  [2025, [1, 29]], // Year of Snake
  [2026, [2, 17]], // Year of Horse
  [2024, [2, 10]], // Year of Dragon
];
for (const [year, [month, day]] of springFestDates) {
  const sfDate = new Date(Date.UTC(year, month - 1, day));
  const sfComp = chinDriver.getComponentsFromDate(sfDate);
  test(`Spring Festival ${year} → month 1, day 1`, () =>
    sfComp.month === 1 && sfComp.day === 1);
}

// Summary
console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
