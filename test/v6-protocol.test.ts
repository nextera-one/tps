/**
 * TPS v0.6.0 Protocol Test Suite
 *
 * Tests all new v0.6.0 features:
 * - Compact schemes: TPS:, NIP4:, NIP6:, NODE:
 * - Multi-layer location: L:;P:;S2:;H3:;3W:;bldg:;net:;node:
 * - P: place layer (cc, cn, ci, ct)
 * - Network locations: net:ip4:, net:ip6:, node:
 * - Structural: bldg:, floor:, room:, door:, zone:
 * - Actor overlay: /A:
 * - Extensions: ;TZ:+03:00, ;key=val
 * - Context: #C:key=val;key=val
 * - toURI() roundtrip with new fields
 */

import { TPS } from "../src/index";

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

// ─── Compact Schemes ─────────────────────────────────────────────────────────
console.log("\n=== Compact Schemes ===\n");

test("TPS: normalizes to tps://", () => {
  const s = TPS.sanitizeTimeInput(
    "TPS:L:31.95,35.91@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return s.startsWith("tps://L:");
});
test("NIP4: normalizes to tps://net:ip4:", () => {
  const s = TPS.sanitizeTimeInput(
    "NIP4:203.0.113.10@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return s.startsWith("tps://net:ip4:203.0.113.10");
});
test("NIP6: normalizes to tps://net:ip6:", () => {
  const s = TPS.sanitizeTimeInput(
    "NIP6:2001:db8::1@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return s.startsWith("tps://net:ip6:2001:db8::1");
});
test("NODE: normalizes to tps://node:", () => {
  const s = TPS.sanitizeTimeInput(
    "NODE:api-1@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return s.startsWith("tps://node:api-1");
});
test("Compact TPS: parses correctly", () => {
  const p = TPS.parse(
    "TPS:L:31.95,35.91@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return p?.latitude === 31.95 && p?.longitude === 35.91;
});
test("NIP4: parses full IPv4", () => {
  const p = TPS.parse(
    "NIP4:203.0.113.10@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return p?.ipv4 === "203.0.113.10";
});
test("NIP6: parses full IPv6", () => {
  const p = TPS.parse("NIP6:2001:db8::1@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0");
  return p?.ipv6 === "2001:db8::1";
});
test("NODE: parses node name", () => {
  const p = TPS.parse("NODE:api-1@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0");
  return p?.nodeName === "api-1";
});

// ─── GPS + Place Layer ────────────────────────────────────────────────────────
console.log("\n=== GPS + Place Layer (P:) ===\n");

const FULL =
  "tps://L:31.95,35.91;P:cc=JO,ci=AMM@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0;TZ:+03:00#C:org=abc;event=xyz";

test("GPS lat parsed", () => TPS.parse(FULL)?.latitude === 31.95);
test("GPS lon parsed", () => TPS.parse(FULL)?.longitude === 35.91);
test("P:cc= country code parsed", () =>
  TPS.parse(FULL)?.placeCountryCode === "JO");
test("P:ci= city code parsed", () => TPS.parse(FULL)?.placeCityCode === "AMM");

const FULL_NAMED =
  "tps://L:31.95,35.91;P:cn=Jordan,ct=Amman@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0";
test("P:cn= country name parsed", () =>
  TPS.parse(FULL_NAMED)?.placeCountryName === "Jordan");
test("P:ct= city name parsed", () =>
  TPS.parse(FULL_NAMED)?.placeCityName === "Amman");

const FULL_ALL =
  "tps://L:31.95,35.91;P:cc=JO,cn=Jordan,ci=AMM,ct=Amman@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0";
test("P: all four fields parsed", () => {
  const p = TPS.parse(FULL_ALL)!;
  return (
    p.placeCountryCode === "JO" &&
    p.placeCountryName === "Jordan" &&
    p.placeCityCode === "AMM" &&
    p.placeCityName === "Amman"
  );
});

// ─── Extensions (;TZ:) ───────────────────────────────────────────────────────
console.log("\n=== Extensions (;TZ:) ===\n");

test(";TZ:+03:00 parsed to extensions.tz", () => {
  return TPS.parse(FULL)?.extensions?.tz === "+03:00";
});
test(";tz=+05:30 (legacy = form) parsed", () => {
  const p = TPS.parse("T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0;tz=+05:30");
  return p?.extensions?.tz === "+05:30";
});
test("multiple extensions parsed", () => {
  const p = TPS.parse(
    "tps://L:0,0@T:greg.m3.c1.y26.m1.d9.h0.m0.s0.m0;TZ:+00:00;PREC:5",
  );
  return p?.extensions?.tz === "+00:00" && p?.extensions?.prec === "5";
});

// ─── Context (#C:) ───────────────────────────────────────────────────────────
console.log("\n=== Context (#C:) ===\n");

test("#C: context org parsed", () => TPS.parse(FULL)?.context?.org === "abc");
test("#C: context event parsed", () =>
  TPS.parse(FULL)?.context?.event === "xyz");
test("#C: on node URI", () => {
  const p = TPS.parse(
    "tps://node:api-1@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0#C:cluster=us-east;role=primary",
  );
  return p?.context?.cluster === "us-east" && p?.context?.role === "primary";
});
test("#C: on time-only string", () => {
  const p = TPS.parse(
    "T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0#C:env=prod;svc=api",
  );
  return p?.context?.env === "prod" && p?.context?.svc === "api";
});

// ─── Network Locations ───────────────────────────────────────────────────────
console.log("\n=== Network Locations ===\n");

test("net:ip4: full address", () => {
  const p = TPS.parse(
    "tps://net:ip4:203.0.113.10@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return p?.ipv4 === "203.0.113.10";
});
test("net:ip4: private address", () => {
  const p = TPS.parse(
    "tps://net:ip4:10.0.0.5;node:lb-01@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return p?.ipv4 === "10.0.0.5" && p?.nodeName === "lb-01";
});
test("net:ip6: full address", () => {
  const p = TPS.parse(
    "tps://net:ip6:2001:db8::1@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return p?.ipv6 === "2001:db8::1";
});
test("node: standalone", () => {
  const p = TPS.parse(
    "tps://node:api-1@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0#C:cluster=us-east",
  );
  return p?.nodeName === "api-1" && p?.context?.cluster === "us-east";
});

// ─── Structural Anchors ──────────────────────────────────────────────────────
console.log("\n=== Structural Anchors ===\n");

const BLDG =
  "tps://bldg:vault;floor:1;room:A2;door:1;zone:east/A:node:cam-01@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0#C:event=entry";

test("bldg: parsed", () => TPS.parse(BLDG)?.building === "vault");
test("floor: parsed", () => TPS.parse(BLDG)?.floor === "1");
test("room: parsed", () => TPS.parse(BLDG)?.room === "A2");
test("door: parsed", () => TPS.parse(BLDG)?.door === "1");
test("zone: parsed", () => TPS.parse(BLDG)?.zone === "east");
test("actor on structural", () => TPS.parse(BLDG)?.actor === "node:cam-01");
test("context on structural", () =>
  TPS.parse(BLDG)?.context?.event === "entry");

// ─── Privacy Markers ─────────────────────────────────────────────────────────
console.log("\n=== Privacy Markers ===\n");

test("L:~ → isHiddenLocation", () => {
  const p = TPS.parse("tps://L:~@T:greg.m3.c1.y26.m1.d9.h0.m0.s0.m0");
  return p?.isHiddenLocation === true;
});
test("L:- → isUnknownLocation", () => {
  const p = TPS.parse("tps://L:-@T:greg.m3.c1.y26.m1.d9.h0.m0.s0.m0");
  return p?.isUnknownLocation === true;
});
test("L:redacted → isRedactedLocation", () => {
  const p = TPS.parse("tps://L:redacted@T:greg.m3.c1.y26.m1.d9.h0.m0.s0.m0");
  return p?.isRedactedLocation === true;
});
test("L:~;P:cc=JO — privacy + place", () => {
  const p = TPS.parse("tps://L:~;P:cc=JO@T:greg.m3.c1.y26.m1.d9.h0.m0.s0.m0");
  return p?.isHiddenLocation === true && p?.placeCountryCode === "JO";
});

// ─── toURI() Roundtrip ───────────────────────────────────────────────────────
console.log("\n=== toURI() Roundtrip ===\n");

test("GPS + P: emitted correctly", () => {
  const comp: any = {
    calendar: "greg",
    millennium: 3,
    century: 1,
    year: 26,
    month: 1,
    day: 9,
    hour: 14,
    minute: 30,
    second: 25,
    millisecond: 0,
    latitude: 31.95,
    longitude: 35.91,
    placeCountryCode: "JO",
    placeCityCode: "AMM",
  };
  const uri = TPS.toURI(comp);
  return uri.includes("L:31.95,35.91") && uri.includes("P:cc=JO,ci=AMM");
});
test("net:ip4 emitted correctly", () => {
  const comp: any = {
    calendar: "greg",
    millennium: 3,
    century: 1,
    year: 26,
    month: 1,
    day: 9,
    hour: 14,
    minute: 30,
    second: 25,
    millisecond: 0,
    ipv4: "10.0.0.5",
  };
  const uri = TPS.toURI(comp);
  return uri.includes("net:ip4:10.0.0.5");
});
test("node: emitted correctly", () => {
  const comp: any = {
    calendar: "greg",
    millennium: 3,
    century: 1,
    year: 26,
    month: 1,
    day: 9,
    hour: 14,
    minute: 30,
    second: 25,
    millisecond: 0,
    nodeName: "api-1",
  };
  const uri = TPS.toURI(comp);
  return uri.includes("node:api-1");
});
test("context emitted as #C:", () => {
  const comp: any = {
    calendar: "greg",
    millennium: 3,
    century: 1,
    year: 26,
    month: 1,
    day: 9,
    hour: 14,
    minute: 30,
    second: 25,
    millisecond: 0,
    context: { org: "abc", event: "meeting" },
  };
  const uri = TPS.toURI(comp);
  return uri.includes("#C:org=abc;event=meeting");
});
test("door + zone emitted correctly", () => {
  const comp: any = {
    calendar: "greg",
    millennium: 3,
    century: 1,
    year: 26,
    month: 1,
    day: 9,
    hour: 14,
    minute: 30,
    second: 25,
    millisecond: 0,
    building: "vault",
    door: "1",
    zone: "east",
    actor: "node:cam-01",
    context: { event: "entry" },
  };
  const uri = TPS.toURI(comp);
  return (
    uri.includes("bldg:vault") &&
    uri.includes("door:1") &&
    uri.includes("zone:east") &&
    uri.includes("/A:node:cam-01") &&
    uri.includes("#C:event=entry")
  );
});
test("extensions emitted as ;KEY:val", () => {
  const comp: any = {
    calendar: "greg",
    millennium: 3,
    century: 1,
    year: 26,
    month: 1,
    day: 9,
    hour: 14,
    minute: 30,
    second: 25,
    millisecond: 0,
    extensions: { tz: "+03:00" },
  };
  const uri = TPS.toURI(comp);
  return uri.includes(";TZ:+03:00");
});

// ─── /T: legacy separator ────────────────────────────────────────────────────
console.log("\n=== Legacy /T: separator ===\n");

test("/T: still accepted", () => {
  const p = TPS.parse(
    "tps://L:31.95,35.91/T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0",
  );
  return p?.latitude === 31.95;
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(
  `\n=== v0.6.0 Protocol Summary: ${passed} passed, ${failed} failed ===\n`,
);
if (failed > 0) process.exit(1);
