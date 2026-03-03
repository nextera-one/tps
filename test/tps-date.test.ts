import { DefaultCalendars, TpsDate, TPS } from "../src/index";

console.log("=== TpsDate Tests ===\n");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const ok = fn();
    if (ok) {
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

test("new TpsDate() creates valid timestamp", () => {
  const d = new TpsDate();
  return Number.isFinite(d.getTime());
});

test("new TpsDate(ms) matches Date(ms)", () => {
  const ms = Date.UTC(2026, 0, 9, 14, 30, 25, 123);
  const d = new TpsDate(ms);
  return d.toISOString() === new Date(ms).toISOString();
});

test("new TpsDate(Date) clones source", () => {
  const src = new Date(Date.UTC(2026, 0, 9, 14, 30, 25));
  const d = new TpsDate(src);
  return d.getTime() === src.getTime();
});

test("new TpsDate(tps) parses TPS URI", () => {
  const tps = "tps://unknown@T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0";
  const d = new TpsDate(tps);
  return d.toISOString() === "2026-01-09T14:30:25.000Z";
});

test("new TpsDate(y,m,d,...) behaves like JS Date", () => {
  const td = new TpsDate(2026, 0, 9, 14, 30, 25, 0);
  const js = new Date(2026, 0, 9, 14, 30, 25, 0);
  return td.getTime() === js.getTime();
});

test("TPS getters use TPS calendar components", () => {
  const d = new TpsDate(Date.UTC(2026, 0, 9, 22, 30, 25, 0));
  // TPS calendar is +7h shifted from Gregorian in current driver,
  // so this becomes next-day local TPS components.
  return d.getDate() === 10 && d.getHours() === 5 && d.getMinutes() === 30;
});

test("toString returns TPS time string", () => {
  const d = new TpsDate(Date.UTC(2026, 0, 9, 14, 30, 25, 0));
  return d.toString().startsWith("T:tps.");
});

test("TpsDate.parse accepts TPS strings", () => {
  const ms = TpsDate.parse("T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0");
  return ms === Date.UTC(2026, 0, 9, 14, 30, 25, 0);
});

test("TpsDate.now is close to Date.now", () => {
  const a = TpsDate.now();
  const b = Date.now();
  return Math.abs(a - b) < 100;
});

test("toTPS outputs time string", () => {
  const d = new TpsDate(Date.UTC(2026, 0, 9, 14, 30, 25));
  const tps = d.toTPS(DefaultCalendars.GREG);
  return tps.startsWith("T:greg.");
});

test("toTPSURI defaults to unknown location", () => {
  const d = new TpsDate(Date.UTC(2026, 0, 9, 14, 30, 25));
  const uri = d.toTPSURI(DefaultCalendars.GREG);
  return uri.startsWith("tps://L:-@T:greg.");
});

test("toTPSURI supports coordinates", () => {
  const d = new TpsDate(Date.UTC(2026, 0, 9, 14, 30, 25));
  const uri = d.toTPSURI(DefaultCalendars.GREG, {
    latitude: 31.95,
    longitude: 35.91,
    altitude: 800,
  });
  const parsed = TPS.parse(uri);
  return (
    !!parsed &&
    parsed.latitude === 31.95 &&
    parsed.longitude === 35.91 &&
    parsed.altitude === 800
  );
});

console.log("\n=== TpsDate Summary ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
