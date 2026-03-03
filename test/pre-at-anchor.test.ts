import { TPS } from "../src/index";

console.log("=== Pre-@ Anchor Tests ===\n");

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

test("adm anchor validates", () => {
  const s = "tps://adm:city:SA:riyadh@T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0";
  return TPS.validate(s);
});

test("node anchor validates", () => {
  const s = "tps://node:dc-amman-01@T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0";
  return TPS.validate(s);
});

test("net:ip4 anchor validates", () => {
  const s =
    "tps://net:ip4:203.0.113.10@T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0";
  return TPS.validate(s);
});

test("net:ip6 anchor validates", () => {
  const s = "tps://net:ip6:2001:db8::1@T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0";
  return TPS.validate(s);
});

test("planet anchor validates", () => {
  const s =
    "tps://planet:javascriptia.zone:npm@T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0";
  return TPS.validate(s);
});

test("place-only pre-@ anchor validates", () => {
  const s =
    "tps://P:cc=US;city=NYC;adm1=NY@T:greg.m3.c1.y26.m03.d01.h00.m00.s00.m0";
  return TPS.validate(s);
});

test("generic anchors parse to spaceAnchor", () => {
  const s = "tps://adm:country:JO@T:greg.m3.c1.y26.m01.d13.h00.m00.s00.m0";
  const parsed = TPS.parse(s);
  return !!parsed && parsed.spaceAnchor === "adm:country:JO";
});

test("generic spaceAnchor round-trips through toURI", () => {
  const s = "tps://node:api-1@T:greg.m3.c1.y26.m01.d13.h10.m30.s00.m0";
  const parsed = TPS.parse(s);
  if (!parsed) return false;
  const rebuilt = TPS.toURI(parsed as any);
  return rebuilt.startsWith("tps://node:api-1@T:greg.");
});

test("calendar code width > 4 fails validation", () => {
  return !TPS.validate("T:abcde.m3.c1.y26.m01.d13.h10.m30.s00.m0");
});

console.log("\n=== Pre-@ Anchor Summary ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
