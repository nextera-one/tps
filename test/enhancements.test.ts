/**
 * Tests for TPS v0.5.35 enhancement methods:
 * - TPS.now()
 * - TPS.diff()
 * - TPS.add()
 * - TPS.driverManager
 * - Timezone-aware TPS.toDate() with tz= extension
 */

import { TPS, DefaultCalendars, TimeOrder } from "../src/index";
import { utcToLocal, localToUtc, getOffsetString } from "../src/utils/timezone";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name} — assertion returned false`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${name} — ${(e as Error).message}`);
    failed++;
  }
}

const T1 = "T:greg.m3.c1.y26.m1.d1.h0.m0.s0.m0";
const T2 = "T:greg.m3.c1.y26.m1.d2.h0.m0.s0.m0";

// ─── TPS.now() ───────────────────────────────────────────────────────────────
console.log("\n=== TPS.now() ===\n");

test("now() returns a string", () => typeof TPS.now() === "string");
test("now() starts with T:greg", () => TPS.now().startsWith("T:greg"));
test("now('hij') starts with T:hij", () => TPS.now("hij").startsWith("T:hij"));
test("now('per') starts with T:per", () => TPS.now("per").startsWith("T:per"));
test("now('chin') starts with T:chin", () =>
  TPS.now("chin").startsWith("T:chin"));
test("now(ASC) has ascending order", () => {
  const s = TPS.now(DefaultCalendars.GREG, { order: TimeOrder.ASC });
  return s.indexOf(".s") < s.indexOf(".c");
});
test("now() is valid TPS", () => TPS.validate(TPS.now()));

// ─── TPS.diff() ──────────────────────────────────────────────────────────────
console.log("\n=== TPS.diff() ===\n");

test("diff one day forward = 86_400_000ms", () => {
  return TPS.diff(T1, T2) === 86_400_000;
});
test("diff reversed is negative", () => {
  return TPS.diff(T2, T1) === -86_400_000;
});
test("diff same string = 0", () => {
  return TPS.diff(T1, T1) === 0;
});
test("diff invalid input returns NaN", () => {
  return isNaN(TPS.diff("garbage", T2));
});

// ─── TPS.add() ───────────────────────────────────────────────────────────────
console.log("\n=== TPS.add() ===\n");

test("add 1 day moves date forward", () => {
  const result = TPS.add(T1, { days: 1 });
  return result !== null && TPS.diff(T1, result) === 86_400_000;
});
test("add -1 hour moves date backward", () => {
  const result = TPS.add(T2, { hours: -1 });
  return result !== null && TPS.diff(result, T2) === 3_600_000;
});
test("add 0 returns same moment", () => {
  const result = TPS.add(T1, {});
  return result !== null && TPS.diff(T1, result) === 0;
});
test("add preserves calendar from Persian input", () => {
  const perNow = TPS.now("per");
  const result = TPS.add(perNow, { days: 1 });
  return result !== null && result.startsWith("T:per");
});
test("add returns null on invalid input", () => {
  return TPS.add("garbage", { days: 1 }) === null;
});
test("add 7 days to gregorian gives +7d", () => {
  const shifted = TPS.add(T1, { days: 7 });
  return shifted !== null && TPS.diff(T1, shifted) === 7 * 86_400_000;
});

// ─── DriverManager ───────────────────────────────────────────────────────────
console.log("\n=== DriverManager ===\n");

test("driverManager.list() includes all 8 drivers", () => {
  const list = TPS.driverManager.list();
  return (
    list.includes("greg") &&
    list.includes("hij") &&
    list.includes("per") &&
    list.includes("jul") &&
    list.includes("holo") &&
    list.includes("chin") &&
    list.includes("unix") &&
    list.includes("tps")
  );
});
test("driverManager.has() returns true for registered code", () => {
  return TPS.driverManager.has("greg");
});
test("driverManager.has() returns false for missing code", () => {
  return !TPS.driverManager.has("zzz");
});
test("driverManager.get() is consistent with TPS.getDriver()", () => {
  return TPS.driverManager.get("greg") === TPS.getDriver("greg");
});

// ─── Timezone ─────────────────────────────────────────────────────────────────
console.log("\n=== Timezone Utility ===\n");

test("utcToLocal with +03:30 adds 3.5 hours", () => {
  const utcMs = Date.UTC(2026, 0, 1, 12, 0, 0); // 12:00 UTC
  const local = utcToLocal(utcMs, "+03:30");
  return local === Date.UTC(2026, 0, 1, 15, 30, 0); // 15:30 local
});
test("localToUtc with +03:30 subtracts 3.5 hours", () => {
  const localMs = Date.UTC(2026, 0, 1, 15, 30, 0);
  const utc = localToUtc(localMs, "+03:30");
  return utc === Date.UTC(2026, 0, 1, 12, 0, 0);
});
test("utcToLocal with -05:00 subtracts 5 hours", () => {
  const utcMs = Date.UTC(2026, 0, 1, 12, 0, 0);
  const local = utcToLocal(utcMs, "-05:00");
  return local === Date.UTC(2026, 0, 1, 7, 0, 0);
});
test("getOffsetString for UTC returns +00:00", () => {
  return getOffsetString("UTC") === "+00:00";
});
test("getOffsetString for +05:30 returns +05:30", () => {
  return getOffsetString("+05:30") === "+05:30";
});
test("TPS.toDate() with tz=+03:30 shifts correctly", () => {
  // 14:30 local in +03:30 → 11:00 UTC
  const date = TPS.toDate("T:greg.m3.c1.y26.m1.d9.h14.m30.s0.m0;tz=+03:30");
  if (!date) return false;
  return date.getUTCHours() === 11 && date.getUTCMinutes() === 0;
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
