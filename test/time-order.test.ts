import { DefaultCalendars, TPS, TimeOrder } from "../src/index";
import { TPSUID7RB } from "../src/uid";

console.log("=== Time Order Tests ===\n");

// verify that gregorian driver is active by default
let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────
// Full DESC canonical string  (millennium → … → millisecond)
const DESC_FULL = "T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0";
// Same moment, full ASC string (millisecond → … → millennium)
const ASC_FULL = "T:greg.m0.s25.m30.h14.d9.m1.y26.c1.m3";
// DESC missing minutse + millisecond
const DESC_PARTIAL = "T:greg.m3.c1.y26.m01.d09.h14.s25";
// ASC missing all m-tokens  (just s/h/d/y/c in ascending rank order)
const ASC_PARTIAL = "T:greg.s10.h08.d15.y25.c2";
// URI form with GPS coords, DESC
const URI_DESC = "tps://L:32.01,35.86@T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0";
// URI form with GPS coords, ASC
const URI_ASC = "tps://L:32.01,35.86@T:greg.s25.m30.h14.d9.m1.y26.c1.m3";
// URI with /T: separator
const URI_SLASH_ASC = "tps://L:32.01,35.86/T:greg.s10.h08.d15.y25.c2";

console.log("--- sanitizeInput: descending ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — sanitizeInput: descending inputs
// ─────────────────────────────────────────────────────────────────────────────

test("DESC full — returned unchanged", () => {
  return TPS.sanitizeTimeInput(DESC_FULL) === DESC_FULL;
});

test("DESC partial — gaps filled with 0", () => {
  // missing minute (slot m rank-2) and millisecond (slot m rank-0)
  return (
    TPS.sanitizeTimeInput(DESC_PARTIAL) ===
    "T:greg.m3.c1.y26.m01.d09.h14.m0.s25.m0"
  );
});

test("DESC URI — unchanged when all tokens present", () => {
  return TPS.sanitizeTimeInput(URI_DESC) === URI_DESC;
});

test("DESC URI with /T: separator — gaps filled", () => {
  // original has no m-tokens; sanitizer also converts `/T:` → `@T:`
  const out = TPS.sanitizeTimeInput("tps://L:unknown/T:greg.m3.c1.y26.m2.d14");
  // note canonical prefix change
  return out === "tps://L:unknown@T:greg.m3.c1.y26.m2.d14.h0.m0.s0.m0";
});

test("calendar-only string — all 9 slots filled with 0", () => {
  return (
    TPS.sanitizeTimeInput("T:greg") === "T:greg.m0.c0.y0.m0.d0.h0.m0.s0.m0"
  );
});

test("DESC with negative millennium — preserved", () => {
  const out = TPS.sanitizeTimeInput(
    "T:greg.m-1.c9.y99.m12.d31.h23.m59.s59.m999",
  );
  return out === "T:greg.m-1.c9.y99.m12.d31.h23.m59.s59.m999";
});

console.log("\n--- sanitizeInput: ascending → reversed to descending ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — sanitizeInput: ascending inputs reversed to DESC
// ─────────────────────────────────────────────────────────────────────────────

test("ASC full — reversed to DESC", () => {
  // m0(ms).s25.m30(min).h14.d9.m1(mon).y26.c1.m3(mil) → m3.c1.y26.m1.d9.h14.m30.s25.m0
  return (
    TPS.sanitizeTimeInput(ASC_FULL) === "T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0"
  );
});

test("ASC partial — reversed and gaps filled", () => {
  // s10.h08.d15.y25.c2 (asc) → reversed: c2.y25.d15.h08.s10, no m tokens → all m slots = 0
  return (
    TPS.sanitizeTimeInput(ASC_PARTIAL) ===
    "T:greg.m0.c2.y25.m0.d15.h08.m0.s10.m0"
  );
});

test("ASC URI @T: — reversed, prefix preserved", () => {
  return (
    TPS.sanitizeTimeInput(URI_ASC) ===
    "tps://L:32.01,35.86@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0"
  );
});

test("ASC URI /T: — reversed, prefix preserved", () => {
  // `/T:` is normalised to `@T:` before reversal occurs
  return (
    TPS.sanitizeTimeInput(URI_SLASH_ASC) ===
    "tps://L:32.01,35.86@T:greg.m0.c2.y25.m0.d15.h08.m0.s10.m0"
  );
});

test("ASC — only two non-m anchors still triggers detection", () => {
  // s5.h12 → ascending (1 < 3)
  const out = TPS.sanitizeTimeInput("T:greg.s5.h12");
  return out === "T:greg.m0.c0.y0.m0.d0.h12.m0.s5.m0";
});

console.log("\n--- sanitizeInput: normalisation ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — sanitizeInput: normalisation (casing, whitespace)
// ─────────────────────────────────────────────────────────────────────────────

test("uppercase TPS:// scheme — lowercased", () => {
  const out = TPS.sanitizeTimeInput("TPS://unknown@T:greg.m3.c1.y26");
  return out.startsWith("tps://");
});

test("lowercase t: prefix — uppercased to T:", () => {
  const out = TPS.sanitizeTimeInput("t:greg.m3.c1.y26");
  return out.startsWith("T:");
});

test("uppercase calendar code — lowercased", () => {
  const out = TPS.sanitizeTimeInput("T:GREG.m3.c1.y26");
  return out.startsWith("T:greg.");
});

test("internal whitespace — stripped", () => {
  const out = TPS.sanitizeTimeInput("T:greg. m3 .c1.y26");
  return out === "T:greg.m3.c1.y26.m0.d0.h0.m0.s0.m0";
});

test("leading/trailing whitespace — stripped", () => {
  const out = TPS.sanitizeTimeInput("  T:greg.m3.c1.y26  ");
  return out.startsWith("T:greg.");
});

test("mixed case scheme with leading space — fully normalised", () => {
  const out = TPS.sanitizeTimeInput("  TPS://unknown@T:greg.m3.c1.y26  ");
  return out.startsWith("tps://") && out.includes("T:greg.");
});

console.log("\n--- sanitizeInput: suffix preservation ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — sanitizeInput: suffix preservation (! sig / ; ext)
// ─────────────────────────────────────────────────────────────────────────────

test("!signature suffix preserved in time-only", () => {
  const out = TPS.sanitizeTimeInput("T:greg.m3.c1.y26.m1.d9!abc123");
  return out.endsWith("!abc123");
});

test("!sig;ext suffix preserved in time-only", () => {
  const out = TPS.sanitizeTimeInput("T:greg.m3.c1.y26.m1.d9!abc123;foo=bar");
  return out.endsWith("!abc123;foo=bar");
});

test(";ext suffix alone preserved in URI", () => {
  const out = TPS.sanitizeTimeInput("tps://unknown@T:greg.m3.c1.y26;env=prod");
  return out.endsWith(";env=prod");
});

test("suffix not included in token reversal for ASC URI", () => {
  // suffix must stay at the end even after ASC → DESC reversal
  const out = TPS.sanitizeTimeInput(
    "tps://unknown@T:greg.s25.h14.d9.y26.c1!sig1",
  );
  return out.endsWith("!sig1") && out.includes("@T:greg.");
});

console.log("\n--- sanitizeInput: no-op on non-parseable inputs ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — sanitizeInput: no-T-section / non-TPS strings returned as-is
// ─────────────────────────────────────────────────────────────────────────────

test("URI without T: section — returned as-is", () => {
  return TPS.sanitizeTimeInput("tps://L:32.01,35.86") === "tps://L:32.01,35.86";
});

test("random garbage — returned as-is", () => {
  return TPS.sanitizeTimeInput("hello-world") === "hello-world";
});

test("empty string — returned as-is", () => {
  return TPS.sanitizeTimeInput("") === "";
});

console.log("\n--- validate: descending ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — validate: descending inputs
// ─────────────────────────────────────────────────────────────────────────────

test("valid DESC full time-only — true", () => TPS.validate(DESC_FULL));
test("valid DESC partial time-only — true", () => TPS.validate(DESC_PARTIAL));
test("valid DESC URI — true", () => TPS.validate(URI_DESC));

test("valid DESC URI with /T: separator — true", () => {
  return TPS.validate("tps://L:unknown/T:greg.m3.c1.y26.m2.d14");
});

test("valid DESC URI with unknown location — true", () => {
  return TPS.validate("tps://unknown@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0");
});

test("valid DESC URI with hidden location — true", () => {
  return TPS.validate("tps://hidden@T:greg.m3.c1.y26");
});

test("valid DESC URI with redacted location — true", () => {
  return TPS.validate("tps://redacted@T:greg.m3.c1.y26");
});

test("calendar-only (no tokens) — true after sanitize fills zeros", () => {
  return TPS.validate("T:greg");
});

console.log("\n--- validate: ascending ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — validate: ascending inputs (sanitized to DESC before regex check)
// ─────────────────────────────────────────────────────────────────────────────

test("valid ASC full time-only — true", () => TPS.validate(ASC_FULL));
test("valid ASC partial time-only — true", () => TPS.validate(ASC_PARTIAL));
test("valid ASC URI @T: — true", () => TPS.validate(URI_ASC));
test("valid ASC URI /T: — true", () => TPS.validate(URI_SLASH_ASC));

test("ASC uppercase scheme — true", () => {
  return TPS.validate("TPS://unknown@T:greg.s25.h14.d9.y26.c1.m3");
});

test("ASC with lowercase t: — true", () => {
  return TPS.validate("t:greg.s25.h14.d9.y26.c1");
});

console.log("\n--- validate: invalid ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — validate: invalid / malformed inputs
// ─────────────────────────────────────────────────────────────────────────────

test("empty string — false", () => !TPS.validate(""));
test("random string — false", () => !TPS.validate("hello-world"));
test("http:// scheme — false", () => !TPS.validate("http://example.com"));
test("URI without T: section — false", () =>
  !TPS.validate("tps://L:32.01,35.86"));
test("T: with no calendar — false", () => !TPS.validate("T:"));
test("T: with two-char calendar — false", () => !TPS.validate("T:gr.m3.c1"));
test("no prefix at all — false", () => !TPS.validate("greg.m3.c1.y26"));
test("only whitespace — false", () => !TPS.validate("   "));
test("completely numeric string — false", () => !TPS.validate("123456"));
test("tps:// with no location or T: — false", () => !TPS.validate("tps://"));
test("URI with unknown location but no T: — false", () =>
  !TPS.validate("tps://unknown"));

console.log("\n--- parse: descending ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — parse: descending field extraction
// ─────────────────────────────────────────────────────────────────────────────

test("DESC full — all fields correct", () => {
  const c = TPS.parse(DESC_FULL);
  return (
    !!c &&
    c.order === TimeOrder.DESC &&
    c.millennium === 3 &&
    c.century === 1 &&
    c.year === 26 &&
    c.month === 1 &&
    c.day === 9 &&
    c.hour === 14 &&
    c.minute === 30 &&
    c.second === 25 &&
    c.millisecond === 0
  );
});

test("DESC partial — unset fields default to 0 after sanitise", () => {
  const c = TPS.parse(DESC_PARTIAL);
  return (
    !!c &&
    c.hour === 14 &&
    c.second === 25 &&
    // sanitizer fills missing minute/millisecond with 0, not undefined
    c.minute === 0 &&
    c.millisecond === 0
  );
});

test("DESC URI — location lat/lon captured", () => {
  const c = TPS.parse(URI_DESC);
  return (
    !!c && c.latitude === 32.01 && c.longitude === 35.86 && c.millennium === 3
  );
});

test("DESC URI /T: separator — fields correct", () => {
  const c = TPS.parse("tps://L:unknown/T:greg.m3.c1.y26.m2.d14");
  return !!c && c.month === 2 && c.day === 14 && c.year === 26;
});

test("DESC with signature — signature field set", () => {
  const c = TPS.parse("tps://unknown@T:greg.m3.c1.y1.m01.d01!abc123;foo=bar");
  return !!c && c.signature === "abc123" && c.extensions?.foo === "bar";
});

console.log("\n--- parse: ascending ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — parse: ascending field extraction
// ─────────────────────────────────────────────────────────────────────────────

test("ASC full — sanitize reverses to DESC so parse returns desc order", () => {
  const c = TPS.parse(ASC_FULL);
  return (
    !!c &&
    c.order === TimeOrder.DESC &&
    c.millennium === 3 &&
    c.century === 1 &&
    c.year === 26 &&
    c.month === 1 &&
    c.day === 9 &&
    c.hour === 14 &&
    c.minute === 30 &&
    c.second === 25 &&
    c.millisecond === 0
  );
});

test("ASC partial — sanitiser makes it look like DESC and fills zeros", () => {
  const c = TPS.parse(ASC_PARTIAL);
  return (
    !!c &&
    c.order === TimeOrder.DESC &&
    c.second === 10 &&
    c.hour === 8 &&
    c.day === 15 &&
    c.year === 25 &&
    c.century === 2
  );
});

test("ASC URI — sanitiser reverses to DESC, order becomes desc", () => {
  const c = TPS.parse(URI_ASC);
  return (
    !!c &&
    c.order === TimeOrder.DESC &&
    c.millennium === 3 &&
    c.month === 1 &&
    c.minute === 30 &&
    c.latitude === 32.01 &&
    c.longitude === 35.86
  );
});

console.log("\n--- parse: invalid ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 — parse: invalid inputs return null
// ─────────────────────────────────────────────────────────────────────────────

test("empty string — null", () => TPS.parse("") === null);
test("garbage string — null", () => TPS.parse("garbage") === null);
test("URI without T: — null", () => TPS.parse("tps://L:32.01,35.86") === null);
test("bare number — null", () => TPS.parse("20260109") === null);
test("http URL — null", () => TPS.parse("http://example.com") === null);

console.log("\n--- round-trip ---\n");
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12 — toURI / fromDate round-trip
// ─────────────────────────────────────────────────────────────────────────────

test("toURI emits ASC when order=ASC", () => {
  const comp: any = {
    calendar: DefaultCalendars.GREG,
    millennium: 3,
    century: 1,
    year: 26,
    month: 1,
    day: 9,
    hour: 14,
    minute: 30,
    second: 25,
    order: TimeOrder.ASC,
  };
  return TPS.toURI(comp).endsWith("T:greg.s25.m30.h14.d9.m1.y26.c1.m3");
});

test("fromDate DESC — canonical format", () => {
  const d = new Date(Date.UTC(2026, 0, 9, 14, 30, 25));
  const s = TPS.fromDate(d, DefaultCalendars.GREG, { order: TimeOrder.DESC });
  return (
    typeof s === "string" && s.includes("T:greg.m3.c1.y26.m1.d9.h14.m30.s25")
  );
});

test("fromDate ASC — reversed format", () => {
  const d = new Date(Date.UTC(2026, 0, 9, 14, 30, 25));
  const s = TPS.fromDate(d, DefaultCalendars.GREG, { order: TimeOrder.ASC });
  // seconds come before centuries in ASC
  return typeof s === "string" && s.indexOf(".s") < s.indexOf(".c");
});

test("parse(fromDate(ASC)) fields — identity round-trip", () => {
  const d = new Date(Date.UTC(2026, 0, 9, 14, 30, 25));
  const s = TPS.fromDate(d, DefaultCalendars.GREG, { order: TimeOrder.ASC });
  const c = TPS.parse(s as string);
  return !!c && c.hour === 14 && c.second === 25 && c.millennium === 3;
});

test("epochMs round-trip on ASC", () => {
  const ms = TPSUID7RB.epochMsFromTPSString(ASC_FULL);
  return ms === Date.UTC(2026, 0, 9, 14, 30, 25);
});

test("TPSUID7RB.generate ASC — decoded TPS is ascending", () => {
  const id = TPSUID7RB.generate({ order: TimeOrder.ASC });
  const decoded = TPSUID7RB.decodeBinaryB64(id);
  return decoded.tps.indexOf(".s") < decoded.tps.indexOf(".c");
});

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
