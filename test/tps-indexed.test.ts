import { TPS, TPSUID7RB } from "../src/index";

console.log("=== TPS Indexed Time Tests ===\n");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name} - assertion failed`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} - ${(error as Error).message}`);
    failed++;
  }
}

test("epoch start maps to i0", () => {
  return TPS.toIndexedTime(new Date("1999-08-11T07:00:00.000Z")) === "T:tps.i0";
});

test("one millisecond before next TPS day stays in i0", () => {
  const date = new Date("1999-08-12T06:59:59.999Z");
  const compact = TPS.toIndexedTime(date, { precision: 9 });
  return compact === "T:tps.i0.999999988" && TPS.toDayIndex(date) === 0;
});

test("indexed TPS parses day index and fraction", () => {
  const parsed = TPS.parse("T:tps.i1000.52");
  return (
    !!parsed &&
    parsed.dayIndex === 1000 &&
    Math.abs((parsed.dayFraction ?? 0) - 0.52) < 1e-12 &&
    parsed.week === 3 &&
    parsed.day === 21
  );
});

test("expandIndexedTime produces hierarchical TPS", () => {
  return (
    TPS.expandIndexedTime("T:tps.i1000.52") ===
    "T:tps.m1.c1.y2.m12.w3.d21.h12.m28.s48.m0"
  );
});

test("compactIndexedTime produces indexed TPS with requested precision", () => {
  return (
    TPS.compactIndexedTime(
      "T:tps.m1.c1.y2.m12.w3.d21.h12.m28.s48.m0",
      { precision: 2 },
    ) === "T:tps.i1000.52"
  );
});

test("indexed URI expansion preserves location, extensions, and context", () => {
  const uri = "tps://L:31.95,35.91@T:tps.i1000.52;TZ:+03:00#C:event=demo";
  const expanded = TPS.expandIndexedTime(uri);
  return (
    expanded ===
    "tps://L:31.95,35.91@T:tps.m1.c1.y2.m12.w3.d21.h12.m28.s48.m0;TZ:+03:00#C:event=demo"
  );
});

test("fromDayIndex and compact helper round-trip", () => {
  const full = TPS.fromDayIndex(1000, 0.52);
  return full === "T:tps.m1.c1.y2.m12.w3.d21.h12.m28.s48.m0";
});

test("validation accepts valid indexed TPS and rejects invalid fractions", () => {
  return (
    TPS.validate("T:tps.i1000.52") &&
    !TPS.validate("T:tps.i1000.100") &&
    !TPS.validate("T:greg.i1000.52")
  );
});

test("UID encoding expands indexed TPS before storage", () => {
  const encoded = TPSUID7RB.encodeBinaryB64("tps://unknown@T:tps.i1000.52");
  const decoded = TPSUID7RB.decodeBinaryB64(encoded);
  return (
    decoded.tps ===
    "tps://unknown@T:tps.m1.c1.y2.m12.w3.d21.h12.m28.s48.m0"
  );
});

console.log("\n=== TPS Indexed Summary ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}