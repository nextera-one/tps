/**
 * Quick verification of new calendar drivers against known dates.
 * Run: npx ts-node test/new-drivers.test.ts
 */
import { TPS, TPSComponents, DefaultCalendars } from "../src/index";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${name} - ${(e as Error).message}`);
    failed++;
  }
}

function eq(a: any, b: any): boolean {
  return a === b;
}

// ═══════════════════════════════════════════════════════════
// Persian (Jalali) Driver
// ═══════════════════════════════════════════════════════════
console.log("\n=== Persian (Jalali) Driver ===\n");

const perDriver = TPS.getDriver("per")!;

// 2026-01-09 UTC = 1404-10-21 Jalali
const jan9 = new Date("2026-01-09T00:00:00Z");
const perComp = perDriver.getComponentsFromDate(jan9);
const perFullYear =
  ((perComp.millennium ?? 0) - 1) * 1000 +
  ((perComp.century ?? 0) - 1) * 100 +
  (perComp.year ?? 0);
test("Persian: 2026-01-09 → year 1404", () => eq(perFullYear, 1404));
test("Persian: 2026-01-09 → month 10 (Dey)", () => eq(perComp.month, 10));
test("Persian: 2026-01-09 → day 21", () => eq(perComp.day, 21));

// Roundtrip
const perBack = perDriver.getDateFromComponents(perComp);
test("Persian: roundtrip preserves date", () =>
  eq(perBack.toISOString().slice(0, 10), "2026-01-09"));

// Nowruz 1404 → ~2025-03-20/21
const nowruz = perDriver.getDateFromComponents({
  year: 1404,
  month: 1,
  day: 1,
});
test("Persian: Nowruz 1404 in March 2025", () => {
  const s = nowruz.toISOString().slice(0, 7);
  return s === "2025-03";
});

// parseDate / format
const parsed = perDriver.parseDate("1404-10-21");
test("Persian: parseDate works", () => {
  const fy =
    ((parsed.millennium ?? 0) - 1) * 1000 +
    ((parsed.century ?? 0) - 1) * 100 +
    (parsed.year ?? 0);
  return eq(fy, 1404) && eq(parsed.month, 10);
});
test("Persian: format works", () =>
  perDriver.format(perComp).startsWith("1404-10-21"));

// validate
test("Persian: valid date passes", () => perDriver.validate("1404-06-15"));
test("Persian: month 13 invalid", () =>
  !perDriver.validate({ year: 1404, month: 13, day: 1 }));

// TPS.fromDate / TPS.toDate roundtrip
const perTps = TPS.fromDate(jan9, "per");
test("Persian: TPS.fromDate produces per calendar", () =>
  perTps.startsWith("T:per"));
const perDate = TPS.toDate(perTps);
test("Persian: TPS.toDate roundtrip", () =>
  eq(perDate?.toISOString().slice(0, 10), "2026-01-09"));

// metadata
test("Persian: metadata name", () =>
  eq(perDriver.getMetadata().name, "Persian (Jalali/Solar Hijri)"));
test("Persian: not lunar", () => eq(perDriver.getMetadata().isLunar, false));

// ═══════════════════════════════════════════════════════════
// Hijri (Islamic Tabular) Driver
// ═══════════════════════════════════════════════════════════
console.log("\n=== Hijri (Islamic Tabular) Driver ===\n");

const hijDriver = TPS.getDriver("hij")!;

// Known conversion: 1 Muharram 1 AH = 16 July 622 CE (Julian) ≈ 19 July 622 (Gregorian)
// We'll test a modern date: 2026-01-09 ≈ 1447-07-09 Hijri (approximate)
const hijComp = hijDriver.getComponentsFromDate(jan9);
const hijFullYear =
  ((hijComp.millennium ?? 0) - 1) * 1000 +
  ((hijComp.century ?? 0) - 1) * 100 +
  (hijComp.year ?? 0);
test("Hijri: year is ~1447", () => eq(hijFullYear, 1447));
test("Hijri: month in valid range", () =>
  (hijComp.month ?? 0) >= 1 && (hijComp.month ?? 0) <= 12);

// Roundtrip
const hijBack = hijDriver.getDateFromComponents(hijComp);
test("Hijri: roundtrip preserves date", () =>
  eq(hijBack.toISOString().slice(0, 10), "2026-01-09"));

// parseDate / format
test("Hijri: parseDate", () => {
  const hp = hijDriver.parseDate("1447-07-21");
  const hfy =
    ((hp.millennium ?? 0) - 1) * 1000 +
    ((hp.century ?? 0) - 1) * 100 +
    (hp.year ?? 0);
  return eq(hfy, 1447);
});
test("Hijri: format", () => hijDriver.format(hijComp).startsWith("1447-07-20"));
test("Hijri: format long", () =>
  hijDriver.format(hijComp, "long").includes("Rajab"));

// validate
test("Hijri: valid date", () =>
  hijDriver.validate({ year: 1447, month: 1, day: 30 }));
test("Hijri: month 13 invalid", () =>
  !hijDriver.validate({ year: 1447, month: 13, day: 1 }));
test("Hijri: day 31 invalid (even month)", () =>
  !hijDriver.validate({ year: 1447, month: 2, day: 30 }));

// TPS roundtrip
const hijTps = TPS.fromDate(jan9, "hij");
test("Hijri: TPS.fromDate produces hij calendar", () =>
  hijTps.startsWith("T:hij"));
const hijDate = TPS.toDate(hijTps);
test("Hijri: TPS.toDate roundtrip", () =>
  eq(hijDate?.toISOString().slice(0, 10), "2026-01-09"));

// metadata
test("Hijri: lunar calendar", () => eq(hijDriver.getMetadata().isLunar, true));

// ═══════════════════════════════════════════════════════════
// Julian Driver
// ═══════════════════════════════════════════════════════════
console.log("\n=== Julian Driver ===\n");

const julDriver = TPS.getDriver("jul")!;

// 2026-01-09 Gregorian → 2025-12-27 Julian (Gregorian is 13 days ahead)
const julComp = julDriver.getComponentsFromDate(jan9);
const julFullYear =
  ((julComp.millennium ?? 0) - 1) * 1000 +
  ((julComp.century ?? 0) - 1) * 100 +
  (julComp.year ?? 0);
test("Julian: year is 2025", () => eq(julFullYear, 2025));
test("Julian: month is 12", () => eq(julComp.month, 12));
test("Julian: day is 27", () => eq(julComp.day, 27));

// Roundtrip
const julBack = julDriver.getDateFromComponents(julComp);
test("Julian: roundtrip preserves date", () =>
  eq(julBack.toISOString().slice(0, 10), "2026-01-09"));

// parseDate / format
test("Julian: parseDate", () => {
  const jp = julDriver.parseDate("2025-12-27");
  const jfy =
    ((jp.millennium ?? 0) - 1) * 1000 +
    ((jp.century ?? 0) - 1) * 100 +
    (jp.year ?? 0);
  return eq(jfy, 2025);
});
test("Julian: format", () =>
  julDriver.format(julComp).startsWith("2025-12-27"));

// validate
test("Julian: valid date", () =>
  julDriver.validate({ year: 2025, month: 2, day: 28 }));
test("Julian: leap year (every 4 years)", () =>
  julDriver.validate({ year: 1900, month: 2, day: 29 }));
test("Julian: non-leap year", () =>
  !julDriver.validate({ year: 1901, month: 2, day: 29 }));

// TPS roundtrip
const julTps = TPS.fromDate(jan9, "jul");
test("Julian: TPS.fromDate produces jul calendar", () =>
  julTps.startsWith("T:jul"));

// metadata
test("Julian: not lunar", () => eq(julDriver.getMetadata().isLunar, false));

// ═══════════════════════════════════════════════════════════
// Holocene (Human Era) Driver
// ═══════════════════════════════════════════════════════════
console.log("\n=== Holocene (Human Era) Driver ===\n");

const holoDriver = TPS.getDriver("holo")!;

// 2026 CE = 12026 HE
const holoComp = holoDriver.getComponentsFromDate(jan9);
const holoFullYear =
  ((holoComp.millennium ?? 0) - 1) * 1000 +
  ((holoComp.century ?? 0) - 1) * 100 +
  (holoComp.year ?? 0);
test("Holocene: 2026 CE → 12026 HE", () => eq(holoFullYear, 12026));
test("Holocene: same month as Gregorian", () => eq(holoComp.month, 1));
test("Holocene: same day as Gregorian", () => eq(holoComp.day, 9));

// Roundtrip
const holoBack = holoDriver.getDateFromComponents(holoComp);
test("Holocene: roundtrip preserves date", () =>
  eq(holoBack.toISOString().slice(0, 10), "2026-01-09"));

// TPS roundtrip
const holoTps = TPS.fromDate(jan9, "holo");
test("Holocene: TPS.fromDate produces holo calendar", () =>
  holoTps.startsWith("T:holo"));
const holoDate = TPS.toDate(holoTps);
test("Holocene: TPS.toDate roundtrip", () =>
  eq(holoDate?.toISOString().slice(0, 10), "2026-01-09"));

// metadata
test("Holocene: name", () =>
  eq(holoDriver.getMetadata().name, "Holocene (Human Era)"));

// ═══════════════════════════════════════════════════════════
// Cross-calendar conversion
// ═══════════════════════════════════════════════════════════
console.log("\n=== Cross-Calendar Conversion ===\n");

const gregTps = TPS.fromDate(jan9, "greg");
test("Cross: greg → per succeeds", () => TPS.to("per", gregTps) !== null);
test("Cross: greg → hij succeeds", () => TPS.to("hij", gregTps) !== null);
test("Cross: greg → jul succeeds", () => TPS.to("jul", gregTps) !== null);
test("Cross: greg → holo succeeds", () => TPS.to("holo", gregTps) !== null);

// All registered drivers
console.log("\n=== Registered Drivers ===\n");
const codes = ["tps", "greg", "unix", "per", "hij", "jul", "holo"];
for (const code of codes) {
  const d = TPS.getDriver(code);
  test(`Driver '${code}' registered`, () => d !== undefined && d.code === code);
}

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════
console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
