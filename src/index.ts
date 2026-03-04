/**
 * TPS: Temporal Positioning System
 * The Universal Protocol for Space-Time Coordinates.
 * @packageDocumentation
 * @version 0.6.0
 * @license Apache-2.0
 * @copyright 2026 TPS Standards Working Group
 *
 * v0.5.35 Changes:
 * - Added TPS.now(), TPS.diff(), TPS.add() convenience methods
 * - Added Chinese Lunisolar (chin) calendar driver
 * - Added DriverManager (driver registry separated from TPS class)
 * - Added timezone utility (src/utils/timezone.ts) with IANA + offset support
 * - TPS.toDate() now respects ;tz= extensions when present
 * - ESM dual-mode exports + browser IIFE bundle
 *
 * v0.5.0 Changes:
 * - Added Actor anchor (A:) for provenance tracking
 * - Added Signature (!) for cryptographic verification
 * - Added structural anchors (bldg, floor, room, zone)
 * - Added geospatial cell systems (S2, H3, Plus Code, what3words)
 */

// built-in drivers are registered automatically; importing them here
// ensures they are included when the library bundler/tree-shaker runs.
import { GregorianDriver } from "./drivers/gregorian";
import { UnixDriver } from "./drivers/unix";
import { TpsDriver } from "./drivers/tps";
import { PersianDriver } from "./drivers/persian";
import { HijriDriver } from "./drivers/hijri";
import { JulianDriver } from "./drivers/julian";
import { HoloceneDriver } from "./drivers/holocene";
import { ChineseDriver } from "./drivers/chinese";

export * from "./types";
export * from "./uid";
export * from "./date";
export { Env } from "./utils/env";
export { DriverManager } from "./driver-manager";
export { utcToLocal, localToUtc, getOffsetString } from "./utils/timezone";
import { DriverManager } from "./driver-manager";
import { buildTimePart, parseTimeString } from "./utils/tps-string";
import { localToUtc } from "./utils/timezone";

import {
  CalendarDriver,
  TPSComponents,
  TimeOrder,
  DefaultCalendars,
} from "./types";

export class TPS {
  // --- PLUGIN REGISTRY ---
  /** Shared DriverManager instance — use TPS.driverManager for direct access. */
  static readonly driverManager = new DriverManager();

  /**
   * Registers a calendar driver plugin.
   * @param driver - The driver instance to register.
   */
  static registerDriver(driver: CalendarDriver): void {
    this.driverManager.register(driver);
  }

  /**
   * Gets a registered calendar driver.
   * @param code - The calendar code.
   * @returns The driver or undefined.
   */
  static getDriver(code: string): CalendarDriver | undefined {
    return this.driverManager.get(code);
  }

  // --- REGEX (v0.6.0) ---
  // The URI and time regexes are intentionally permissive in the location &
  // extension sections — detailed semantic parsing happens in
  // _mapGroupsToComponents() and the layer parsers below.
  //
  // Structure:
  //   tps://[location]/A:[actor]@T:[cal].[tokens];[ext];...#C:[ctx];...
  //
  // The `;` separator is used consistently:
  //   - between location layers (before @T:)
  //   - between extensions (after T: tokens, before #)
  //   - between context key=val pairs (after #C:)
  private static readonly REGEX_URI = new RegExp(
    "^tps://" +
      // Location: everything up to optional /A: actor and then @T:
      "(?<location>[^@]+?)" +
      // Optional actor overlay
      "(?:/A:(?<actor>[^@]+))?" +
      // Time section
      "@T:(?<calendar>[a-z]{3,4})" +
      "(?<tokens>(?:\\.[a-z]-?[\\d.]+)*)" +
      // Optional signature
      "(?:!(?<signature>[^;#]+))?" +
      // Optional extensions (;KEY:val;key=val;...)
      "(?:;(?<extensions>[^#]+))?" +
      // Optional context fragment (#C:key=val;...)
      "(?:#C:(?<context>.+))?$",
  );

  private static readonly REGEX_TIME = new RegExp(
    "^T:(?<calendar>[a-z]{3,4})" +
      "(?<tokens>(?:\\.[a-z]-?[\\d.]+)*)" +
      "(?:!(?<signature>[^;#]+))?" +
      "(?:;(?<extensions>[^#]+))?" +
      "(?:#C:(?<context>.+))?$",
  );

  // --- CORE METHODS ---

  /**
   * SANITIZER: Normalises a raw TPS input string before validation.
   *
   * Pure string-based — no parsing into components, no regex beyond simple
   * character checks, no re-serialisation via buildTimePart / toURI.
   *
   * Token ranks (descending): m(8) c(7) y(6) m(5) d(4) h(3) m(2) s(1) m(0)
   */
  static sanitizeTimeInput(input: string): string {
    // ── 1. Whitespace ────────────────────────────────────────────────────────
    let s = input.trim().replace(/\s+/g, "");
    if (!s) return s;

    // ── 1.2 Compact scheme normalization (v0.6.0) ──────────────────────────
    // TPS:...    → tps://...   (generic compact)
    // NIP4:x     → tps://net:ip4:x   (IPv4 shorthand)
    // NIP6:x     → tps://net:ip6:x   (IPv6 shorthand)
    // NODE:x     → tps://node:x      (logical node shorthand)
    if (/^TPS:/i.test(s) && !s.toLowerCase().startsWith("tps://")) {
      // TPS:L:... or TPS:lat,lon... → tps://...
      s = "tps://" + s.slice(4); // strip 'TPS:'
    } else if (/^NIP4:/i.test(s)) {
      s = "tps://net:ip4:" + s.slice(5);
    } else if (/^NIP6:/i.test(s)) {
      s = "tps://net:ip6:" + s.slice(5);
    } else if (/^NODE:/i.test(s)) {
      s = "tps://node:" + s.slice(5);
    }

    // ── 1.5 Convert legacy "/T:" separators to the new canonical "@T:".
    // The input may contain "/T:" from older versions; we normalise early so
    // subsequent logic can assume only the '@' form.
    if (s.includes("/T:")) {
      s = s.replace(/\/T:/g, "@T:");
    }

    // ── 2. Scheme casing ─────────────────────────────────────────────────────
    if (s.slice(0, 6).toLowerCase() === "tps://") {
      s = "tps://" + s.slice(6);
    }

    // ── 3. T: prefix casing (time-only strings) ──────────────────────────────
    if (!s.startsWith("tps://") && s.slice(0, 2).toLowerCase() === "t:") {
      s = "T:" + s.slice(2);
    }

    // ── 4. Locate T: section ─────────────────────────────────────────────────
    let tStart = -1;
    if (s.startsWith("T:")) {
      tStart = 0;
    } else {
      const atT = s.indexOf("@T:");
      if (atT !== -1) tStart = atT + 1;
    }
    if (tStart === -1) return s; // no T: section — return as-is

    const beforeT = s.slice(0, tStart); // URI prefix or empty
    const timeAndRest = s.slice(tStart); // T:cal.tok...  [!sig][;ext]

    // Isolate token section from any trailing suffix (!sig / ;ext / ?q / #f)
    const suffixIdx = timeAndRest.search(/[!;?#]/);
    const timeSuffix = suffixIdx !== -1 ? timeAndRest.slice(suffixIdx) : "";
    const timePart =
      suffixIdx !== -1 ? timeAndRest.slice(0, suffixIdx) : timeAndRest;
    // timePart = "T:greg.m3.c1.y26.m01.d07.h13.m20.s45"

    // Split off calendar code
    const afterColon = timePart.slice(timePart.indexOf(":") + 1); // "greg.m3.c1..."
    const firstDot = afterColon.indexOf(".");
    const cal = (
      firstDot !== -1 ? afterColon.slice(0, firstDot) : afterColon
    ).toLowerCase();
    const tokenStr = firstDot !== -1 ? afterColon.slice(firstDot + 1) : "";

    // If no calendar code was provided at all (e.g. "T:"), bail out early
    // rather than inventing a default calendar.  The string will remain
    // unparsable so validation can report it as invalid.
    if (!cal) {
      return s;
    }

    // No tokens at all — fill every slot with 0 and return
    if (!tokenStr) {
      return `${beforeT}T:${cal}.m0.c0.y0.m0.d0.h0.m0.s0.m0${timeSuffix}`;
    }

    // ── 5. Tokenise ──────────────────────────────────────────────────────────
    // Each raw token: first char = letter prefix, remainder = numeric value
    type Tok = { p: string; v: string };
    const tokens: Tok[] = tokenStr
      .split(".")
      .filter((t) => t.length >= 2 && /^[a-z]/.test(t))
      .map((t) => ({ p: t[0], v: t.slice(1) }));

    // ── 6. Detect order from non-m tokens (c=7, y=6, d=4, h=3, s=1) ─────────
    const nonMRank: Record<string, number> = { c: 7, y: 6, d: 4, h: 3, s: 1 };
    const nonMSeq = tokens
      .filter((t) => t.p !== "m" && nonMRank[t.p] !== undefined)
      .map((t) => nonMRank[t.p]);

    let isAsc = false;
    if (nonMSeq.length >= 2) {
      // ascending when every consecutive rank-diff is positive
      isAsc = nonMSeq.every((r, i) => i === 0 || r > nonMSeq[i - 1]);
    }

    // ── 7. Reverse tokens if ascending ───────────────────────────────────────
    if (isAsc) tokens.reverse();

    // ── 8. Disambiguate 'm' tokens by DESC position ──────────────────────────
    // DESC slot order for m tokens: rank 8 (millennium), 5 (month), 2 (minute), 0 (ms)
    const mDescRanks = [8, 5, 2, 0];
    const byRank = new Map<number, string>();
    let mIdx = 0;

    for (const tok of tokens) {
      if (tok.p === "m") {
        if (mIdx < mDescRanks.length) byRank.set(mDescRanks[mIdx++], tok.v);
      } else {
        const r = nonMRank[tok.p];
        if (r !== undefined) byRank.set(r, tok.v);
      }
    }

    // ── 9. Build complete DESC token string, filling gaps with '0' ───────────
    // Full DESC slot sequence: m(8) c(7) y(6) m(5) d(4) h(3) m(2) s(1) m(0)
    const descSlots: Array<[string, number]> = [
      ["m", 8],
      ["c", 7],
      ["y", 6],
      ["m", 5],
      ["d", 4],
      ["h", 3],
      ["m", 2],
      ["s", 1],
      ["m", 0],
    ];

    const finalTokenStr = descSlots
      .map(([p, r]) => p + (byRank.get(r) ?? "0"))
      .join(".");

    return `${beforeT}T:${cal}.${finalTokenStr}${timeSuffix}`;
  }

  static validate(input: string): boolean {
    const sanitized = this.sanitizeTimeInput(input);
    if (sanitized.startsWith("tps://")) {
      return this.REGEX_URI.test(sanitized);
    }
    return this.REGEX_TIME.test(sanitized);
  }

  static parse(input: string): TPSComponents | null {
    // Always sanitize first so we operate on the canonical form.  This also
    // rewrites any legacy "/T:" separators to "@T:" so the regex below can
    // remain strict.
    input = this.sanitizeTimeInput(input);

    // quick fail via regex to rule out obviously bad strings
    if (input.startsWith("tps://")) {
      const match = this.REGEX_URI.exec(input);
      if (!match || !match.groups) return null;
      const comp: any = this._mapGroupsToComponents(match.groups);
      // extract the raw time portion and parse it separately
      const atIdx = input.indexOf("@T:");
      let timeStr = "";
      let signature: string | undefined;
      if (atIdx !== -1) {
        timeStr = input.slice(atIdx + 1); // include the leading 'T:'
        // if there's a signature, capture it first
        const sigMatch = timeStr.match(/!(?<sig>[^;?#]+)/);
        if (sigMatch && sigMatch.groups && sigMatch.groups.sig) {
          signature = sigMatch.groups.sig;
        }
        // cut off signature, extensions, query, or fragment
        timeStr = timeStr.split(/[!;?#]/)[0];
      }
      if (timeStr) {
        const parsed = parseTimeString(timeStr);
        if (!parsed) return null;
        Object.assign(comp, parsed.components);
        comp.order = parsed.order;
      }
      if (signature) {
        comp.signature = signature;
      }
      return comp as TPSComponents;
    }
    // time-only string
    const match = this.REGEX_TIME.exec(input);
    if (!match || !match.groups) return null;
    // isolate signature if present
    let timeOnly = input;
    let signature: string | undefined;
    const sigMatch = input.match(/!(?<sig>[^;?#]+)/);
    if (sigMatch && sigMatch.groups && sigMatch.groups.sig) {
      signature = sigMatch.groups.sig;
      timeOnly = input.split(/[!;?#]/)[0];
    } else {
      // Strip extension/query/fragment suffix so parseTimeString sees only tokens
      timeOnly = input.split(/[;?#]/)[0];
    }
    const parsed = parseTimeString(timeOnly);
    if (!parsed) return null;
    const comp = parsed.components as TPSComponents;
    if (signature) comp.signature = signature;
    comp.order = parsed.order;

    // Route through the same group mapper used by REGEX_URI for consistency
    // (handles extensions ;KEY:val and context #C:key=val)
    const syntheticGroups: Record<string, string> = {
      calendar: match.groups.calendar ?? "",
      signature: match.groups.signature ?? "",
      extensions: match.groups.extensions ?? "",
      context: match.groups.context ?? "",
      location: "", // no location in time-only string
      actor: "",
    };
    const mappedComp = this._mapGroupsToComponents(syntheticGroups);
    // Merge temporal components from parseTimeString with mapped metadata
    Object.assign(comp, {
      signature: mappedComp.signature || comp.signature,
      extensions: mappedComp.extensions || comp.extensions,
      context: mappedComp.context,
    });
    return comp;
  }

  /**
   * SERIALIZER: Converts a components object into a full TPS URI.
   * @param comp - The TPS components.
   * @returns Full URI string (e.g. "tps://...").
   */
  static toURI(comp: TPSComponents): string {
    // ── 1. Location layers (v0.6.0) ──────────────────────────────────────────
    // Build an ordered list of location layer strings, then join with ";"
    const layers: string[] = [];

    // Privacy shorthand takes priority
    if (comp.isHiddenLocation) {
      layers.push("L:~");
    } else if (comp.isRedactedLocation) {
      layers.push("L:redacted");
    } else if (comp.isUnknownLocation) {
      layers.push("L:-");
    } else if (comp.spaceAnchor) {
      // Generic / legacy anchor (adm:, planet:, etc.)
      layers.push(comp.spaceAnchor);
    } else if (comp.ipv4) {
      layers.push(`net:ip4:${comp.ipv4}`);
    } else if (comp.ipv6) {
      layers.push(`net:ip6:${comp.ipv6}`);
    } else if (comp.nodeName) {
      layers.push(`node:${comp.nodeName}`);
    } else if (comp.s2Cell) {
      layers.push(`S2:${comp.s2Cell}`);
    } else if (comp.h3Cell) {
      layers.push(`H3:${comp.h3Cell}`);
    } else if (comp.what3words) {
      layers.push(`3W:${comp.what3words}`);
    } else if (comp.plusCode) {
      layers.push(`plus:${comp.plusCode}`);
    } else if (comp.building) {
      layers.push(`bldg:${comp.building}`);
      if (comp.floor) layers.push(`floor:${comp.floor}`);
      if (comp.room) layers.push(`room:${comp.room}`);
      if (comp.door) layers.push(`door:${comp.door}`);
      if (comp.zone) layers.push(`zone:${comp.zone}`);
    } else if (comp.latitude !== undefined && comp.longitude !== undefined) {
      let gps = `L:${comp.latitude},${comp.longitude}`;
      if (comp.altitude !== undefined) gps += `,${comp.altitude}m`;
      layers.push(gps);
    } else {
      layers.push("L:-"); // unknown fallback
    }

    // Place layer (P:) — appended after primary location
    if (
      comp.placeCountryCode || comp.placeCountryName ||
      comp.placeCityCode   || comp.placeCityName
    ) {
      const pParts: string[] = [];
      if (comp.placeCountryCode) pParts.push(`cc=${comp.placeCountryCode}`);
      if (comp.placeCountryName) pParts.push(`cn=${comp.placeCountryName}`);
      if (comp.placeCityCode) pParts.push(`ci=${comp.placeCityCode}`);
      if (comp.placeCityName) pParts.push(`ct=${comp.placeCityName}`);
      layers.push(`P:${pParts.join(",")}`);
    }

    const locationStr = layers.join(";");

    // ── 2. Actor (/A:...) ─────────────────────────────────────────────────────
    const actorPart = comp.actor ? `/A:${comp.actor}` : "";

    // ── 3. Time (mandatory 9 tokens) ─────────────────────────────────────────
    const timePart = buildTimePart(comp);

    // ── 4. Extensions (;KEY:val;...) ─────────────────────────────────────────
    let extPart = "";
    if (comp.extensions && Object.keys(comp.extensions).length > 0) {
      const extStrings = Object.entries(comp.extensions).map(([k, v]) => {
        // Emit as KEY:val (preferred v0.6.0 style)
        return `${k.toUpperCase()}:${v}`;
      });
      extPart = `;${extStrings.join(";")}`;
    }

    // ── 5. Context (#C:key=val;...) ──────────────────────────────────────────
    let contextPart = "";
    if (comp.context && Object.keys(comp.context).length > 0) {
      const ctxStrings = Object.entries(comp.context).map(([k, v]) => `${k}=${v}`);
      contextPart = `#C:${ctxStrings.join(";")}`;
    }

    return `tps://${locationStr}${actorPart}@${timePart}${extPart}${contextPart}`;
  }

  /**
   * CONVERTER: Creates a TPS Time Object string from a JavaScript Date.
   * Supports plugin drivers for non-Gregorian calendars.
   * @param date - The JS Date object (defaults to Now).
   * @param calendar - The target calendar driver (default `"tps"`).
   * @param opts - Optional parameters; for built-in calendars the only
   *   supported key is `order` which may be `'ascending'` or `'descending'`.
   * @returns Canonical string (e.g., "T:tps.m3.c1.y26...").
   */
  static fromDate(
    date: Date = new Date(),
    calendar: string = DefaultCalendars.TPS,
    opts?: { order?: TimeOrder },
  ): string {
    const normalizedCalendar = calendar.toLowerCase();
    const driver = this.driverManager.get(normalizedCalendar);
    if (driver) {
      // when caller requested an explicit order we can bypass the driver's
      // `fromDate` helper and instead generate components ourselves so that
      // order is honoured even if the driver doesn't know about it.  This
      // keeps behaviour identical to the old built-in implementation.
      if (opts?.order) {
        const comp = driver.getComponentsFromDate(date) as TPSComponents;
        comp.calendar = normalizedCalendar;
        comp.order = opts.order;
        return buildTimePart(comp);
      }
      return driver.getFromDate(date);
    }

    // Fallback for old built-in calendars (shouldn't happen once drivers are
    // registered, but kept for backwards compatibility).
    const comp: TPSComponents = { calendar: normalizedCalendar } as any;

    if (normalizedCalendar === DefaultCalendars.UNIX) {
      const s = (date.getTime() / 1000).toFixed(3);
      comp.unixSeconds = parseFloat(s);
      if (opts?.order) comp.order = opts.order;
      return buildTimePart(comp);
    }

    if (normalizedCalendar === DefaultCalendars.GREG) {
      const fullYear = date.getUTCFullYear();
      comp.millennium = Math.floor(fullYear / 1000) + 1;
      comp.century = Math.floor((fullYear % 1000) / 100) + 1;
      comp.year = fullYear % 100;
      comp.month = date.getUTCMonth() + 1;
      comp.day = date.getUTCDate();
      comp.hour = date.getUTCHours();
      comp.minute = date.getUTCMinutes();
      comp.second = date.getUTCSeconds();
      comp.millisecond = date.getUTCMilliseconds();
      if (opts?.order) comp.order = opts.order;
      return buildTimePart(comp);
    }

    throw new Error(
      `Calendar driver '${normalizedCalendar}' not implemented. Register a driver.`,
    );
  }

  /**
   * CONVERTER: Converts a TPS string to a Date in a target calendar format.
   * Uses plugin drivers for cross-calendar conversion.
   * @param tpsString - The source TPS string (any calendar).
   * @param targetCalendar - The target calendar code (e.g., 'hij').
   * @returns A TPS string in the target calendar, or null if invalid.
   */
  static to(targetCalendar: string, tpsString: string): string | null {
    // 1. Parse to components and convert to Gregorian Date
    const gregDate = this.toDate(tpsString);
    if (!gregDate) return null;

    // 2. Convert Gregorian to target calendar using driver
    return this.fromDate(gregDate, targetCalendar);
  }

  /**
   * CONVERTER: Reconstructs a JavaScript Date object from a TPS string.
   * Supports plugin drivers for non-Gregorian calendars.
   * @param tpsString - The TPS string.
   * @returns JS Date object or `null` if invalid.
   */
  static toDate(tpsString: string): Date | null {
    const parsed = this.parse(tpsString);
    if (!parsed) return null;

    const cal = parsed.calendar || DefaultCalendars.TPS;

    const driver = this.driverManager.get(cal);
    if (!driver) {
      console.error(`Calendar driver '${cal}' not registered.`);
      return null;
    }

    const date = driver.getDateFromComponents(parsed);

    // If the URI has a ;tz= extension, the calendar date was expressed in local
    // time. Convert from local → UTC using the timezone utility.
    const tz = parsed.extensions?.["tz"];
    if (tz && date) {
      const localMs = date.getTime();
      const utcMs = localToUtc(localMs, tz);
      return new Date(utcMs);
    }

    return date;
  }

  // --- DRIVER CONVENIENCE METHODS ---

  /**
   * Parse a calendar-specific date string into TPS components.
   * Requires the driver to implement `parseDate`.
   *
   * @param calendar - The calendar code (e.g., 'hij')
   * @param dateString - Date string in calendar-native format (e.g., '1447-07-21')
   * @param format - Optional format string (driver-specific)
   * @returns TPS components or null if parsing fails
   *
   * @example
   * ```ts
   * const components = TPS.parseCalendarDate('hij', '1447-07-21');
   * // { calendar: 'hij', year: 1447, month: 7, day: 21 }
   *
   * const uri = TPS.toURI({ ...components, latitude: 31.95, longitude: 35.91 });
   * // "tps://31.95,35.91@T:hij.y1447.m07.d21"
   * ```
   */
  static parseCalendarDate(
    calendar: string,
    dateString: string,
    format?: string,
  ): Partial<TPSComponents> | null {
    const driver = this.driverManager.get(calendar);
    if (!driver) {
      throw new Error(
        `Calendar driver '${calendar}' not found. Register a driver first.`,
      );
    }
    // parseDate is guaranteed by the interface, so we can call it directly.
    return driver.parseDate(dateString, format);
  }

  /**
   * Convert a calendar-specific date string directly to a TPS URI.
   * This is a convenience method that combines parseDate + toURI.
   *
   * @param calendar - The calendar code (e.g., 'hij')
   * @param dateString - Date string in calendar-native format
   * @param location - Optional location (lat/lon/alt or privacy flag)
   * @returns Full TPS URI string
   *
   * @example
   * ```ts
   * // With coordinates
   * TPS.fromCalendarDate('hij', '1447-07-21', { latitude: 31.95, longitude: 35.91 });
   * // "tps://31.95,35.91@T:hij.y1447.m07.d21"
   *
   * // With privacy flag
   * TPS.fromCalendarDate('hij', '1447-07-21', { isHiddenLocation: true });
   * // "tps://hidden@T:hij.y1447.m07.d21"
   *
   * // Without location
   * TPS.fromCalendarDate('hij', '1447-07-21');
   * // "tps://unknown@T:hij.y1447.m07.d21"
   * ```
   */
  static fromCalendarDate(
    calendar: string,
    dateString: string,
    location?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
      isUnknownLocation?: boolean;
      isHiddenLocation?: boolean;
      isRedactedLocation?: boolean;
    },
  ): string {
    const components = this.parseCalendarDate(calendar, dateString);
    if (!components) {
      throw new Error(`Failed to parse date string: ${dateString}`);
    }

    // Merge with location
    const fullComponents: TPSComponents = {
      calendar: calendar,
      ...components,
      ...location,
    } as TPSComponents;

    return this.toURI(fullComponents);
  }

  /**
   * Format TPS components to a calendar-specific date string.
   * Requires the driver to implement `format`.
   *
   * @param calendar - The calendar code
   * @param components - TPS components to format
   * @param format - Optional format string (driver-specific)
   * @returns Formatted date string in calendar-native format
   *
   * @example
   * ```ts
   * const tps = TPS.parse('tps://unknown@T:hij.y1447.m07.d21');
   * const formatted = TPS.formatCalendarDate('hij', tps);
   * // "1447-07-21"
   * ```
   */
  static formatCalendarDate(
    calendar: string,
    components: Partial<TPSComponents>,
    format?: string,
  ): string {
    const driver = this.driverManager.get(calendar);
    if (!driver) {
      throw new Error(`Calendar driver '${calendar}' not found.`);
    }
    // format is guaranteed by the interface, so we can call it directly.
    return driver.format(components, format);
  }

  // --- CONVENIENCE METHODS ---

  /**
   * Returns a TPS time string for the current moment.
   * Shorthand for `TPS.fromDate(new Date(), calendar, opts)`.
   *
   * @param calendar - Calendar code. Defaults to 'greg'.
   * @param opts - Optional `order` (ASC/DESC) parameter.
   * @returns TPS time string.
   *
   * @example
   * ```ts
   * TPS.now(); // "T:greg.m3.c1.y26.m3.d4.h06.m30.s00.m0"
   * TPS.now('hij'); // "T:hij.y1447.m09.d05.h06.m30.s00"
   * ```
   */
  static now(
    calendar: string = DefaultCalendars.GREG,
    opts?: { order?: TimeOrder },
  ): string {
    return this.fromDate(new Date(), calendar, opts) as string;
  }

  /**
   * Returns the difference in milliseconds between two TPS strings.
   * The result is `t2 - t1`; negative if t1 is after t2.
   *
   * @param t1 - First TPS string (subtracted from t2).
   * @param t2 - Second TPS string.
   * @returns Milliseconds between the two moments, or NaN on parse failure.
   *
   * @example
   * ```ts
   * const ms = TPS.diff('T:greg.m3.c1.y26.m1.d1.h0.m0.s0.m0',
   *                       'T:greg.m3.c1.y26.m1.d2.h0.m0.s0.m0');
   * // 86_400_000  (one day)
   * ```
   */
  static diff(t1: string, t2: string): number {
    const d1 = this.toDate(t1);
    const d2 = this.toDate(t2);
    if (!d1 || !d2) return NaN;
    return d2.getTime() - d1.getTime();
  }

  /**
   * Returns a new TPS string shifted by the given duration.
   * The result is in the same calendar as the original string.
   *
   * @param tpsStr - Source TPS string.
   * @param duration - Object with optional `days`, `hours`, `minutes`, `seconds`, `milliseconds`.
   * @returns Shifted TPS string, or null if the input is invalid.
   *
   * @example
   * ```ts
   * const t = 'T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0';
   * TPS.add(t, { days: 7 });   // one week later
   * TPS.add(t, { hours: -2 }); // two hours earlier
   * ```
   */
  static add(
    tpsStr: string,
    duration: {
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
      milliseconds?: number;
    },
  ): string | null {
    const date = this.toDate(tpsStr);
    if (!date) return null;

    const parsed = this.parse(tpsStr);
    const calendar = parsed?.calendar ?? DefaultCalendars.GREG;
    const order = parsed?.order;

    const deltaMs =
      (duration.days ?? 0) * 86_400_000 +
      (duration.hours ?? 0) * 3_600_000 +
      (duration.minutes ?? 0) * 60_000 +
      (duration.seconds ?? 0) * 1_000 +
      (duration.milliseconds ?? 0);

    const shifted = new Date(date.getTime() + deltaMs);
    return this.fromDate(
      shifted,
      calendar,
      order ? { order } : undefined,
    ) as string;
  }

  // --- INTERNAL HELPERS ---

  private static _mapGroupsToComponents(
    g: Record<string, string>,
  ): TPSComponents {
    const components: any = {};
    components.calendar = g.calendar as string;

    // ── Signature ────────────────────────────────────────────────────────────
    if (g.signature) {
      components.signature = g.signature;
    }

    // ── Actor (/A:...) ────────────────────────────────────────────────────────
    if (g.actor) {
      components.actor = g.actor.trim();
    }

    // ── Location layers (v0.6.0: multi-layer, ;-separated) ───────────────────
    if (g.location) {
      this._parseLocationLayers(g.location, components);
    }

    // ── Extensions (;KEY:val or ;key=val after T: tokens) ────────────────────
    if (g.extensions) {
      const extObj: Record<string, string> = {};
      g.extensions.split(";").forEach((part: string) => {
        part = part.trim();
        if (!part) return;
        const colonIdx = part.indexOf(":");
        const eqIdx = part.indexOf("=");
        if (colonIdx > 0 && (eqIdx < 0 || colonIdx < eqIdx)) {
          // KEY:val form (e.g. TZ:+03:00)
          const key = part.substring(0, colonIdx).toLowerCase();
          const val = part.substring(colonIdx + 1);
          if (key && val !== undefined) extObj[key] = val;
        } else if (eqIdx > 0) {
          // key=val form (e.g. tz=+03:00)
          const key = part.substring(0, eqIdx).toLowerCase();
          const val = part.substring(eqIdx + 1);
          if (key && val !== undefined) extObj[key] = val;
        }
      });
      if (Object.keys(extObj).length > 0) components.extensions = extObj;
    }

    // ── Context (#C:key=val;key=val) ─────────────────────────────────────────
    if (g.context) {
      const ctx: Record<string, string> = {};
      g.context.split(";").forEach((part: string) => {
        part = part.trim();
        if (!part) return;
        const eqIdx = part.indexOf("=");
        if (eqIdx > 0) {
          ctx[part.substring(0, eqIdx)] = part.substring(eqIdx + 1);
        }
      });
      if (Object.keys(ctx).length > 0) components.context = ctx;
    }

    return components as TPSComponents;
  }

  /**
   * Parses a multi-layer location string (before @T:) into component fields.
   * Layers are `;`-separated. Each layer is identified by its prefix token.
   *
   * Supported layers:
   *   L:lat,lon[,altm]         — GPS
   *   L:~|L:-|L:redacted       — Privacy markers
   *   P:cc=JO,ci=AMM,...       — Place (country/city codes and names)
   *   S2:token                 — S2 cell
   *   H3:token                 — H3 cell
   *   3W:word.word.word        — What3Words
   *   plus:token               — Plus Code
   *   net:ip4:x.x.x.x          — IPv4
   *   net:ip6:x::x             — IPv6
   *   node:name                — Logical node/host
   *   bldg:name                — Building
   *   floor:x                  — Floor
   *   room:x                   — Room
   *   door:x                   — Door
   *   zone:x                   — Zone
   */
  private static _parseLocationLayers(location: string, components: any): void {
    const layers = location.trim().split(";");

    for (const layer of layers) {
      const l = layer.trim();
      if (!l) continue;

      // Privacy shorthand
      if (l === "L:~" || l === "L:hidden") { components.isHiddenLocation = true; continue; }
      if (l === "L:-" || l === "L:unknown") { components.isUnknownLocation = true; continue; }
      if (l === "L:redacted") { components.isRedactedLocation = true; continue; }

      // P: Place layer — P:cc=JO,ci=AMM,cn=Jordan,ct=Amman
      if (l.startsWith("P:")) {
        l.slice(2).split(",").forEach((pair: string) => {
          const eq = pair.indexOf("=");
          if (eq < 1) return;
          const k = pair.substring(0, eq).toLowerCase();
          const v = pair.substring(eq + 1);
          if (k === "cc") components.placeCountryCode = v;
          else if (k === "cn") components.placeCountryName = v;
          else if (k === "ci") components.placeCityCode = v;
          else if (k === "ct") components.placeCityName = v;
        });
        continue;
      }

      // GPS coordinates (L:lat,lon[,alt])
      if (l.startsWith("L:")) {
        const coords = l.slice(2);
        const m = coords.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(-?\d+(?:\.\d+)?)m?)?$/);
        if (m) {
          components.latitude = parseFloat(m[1]);
          components.longitude = parseFloat(m[2]);
          if (m[3]) components.altitude = parseFloat(m[3]);
        }
        continue;
      }

      // Geospatial cells
      if (/^S2:/i.test(l)) { components.s2Cell = l.slice(3); continue; }
      if (/^H3:/i.test(l)) { components.h3Cell = l.slice(3); continue; }
      if (/^3W:/i.test(l)) { components.what3words = l.slice(3); continue; }
      if (/^plus:/i.test(l)) { components.plusCode = l.slice(5); continue; }

      // Network
      if (/^net:ip4:/i.test(l)) { components.ipv4 = l.slice(8); continue; }
      if (/^net:ip6:/i.test(l)) { components.ipv6 = l.slice(8); continue; }
      if (/^node:/i.test(l)) { components.nodeName = l.slice(5); continue; }

      // Structural
      if (/^bldg:/i.test(l)) { components.building = l.slice(5); continue; }
      if (/^floor:/i.test(l)) { components.floor = l.slice(6); continue; }
      if (/^room:/i.test(l)) { components.room = l.slice(5); continue; }
      if (/^door:/i.test(l)) { components.door = l.slice(5); continue; }
      if (/^zone:/i.test(l)) { components.zone = l.slice(5); continue; }

      // Fallback: generic space anchor (adm:, planet:, legacy strings)
      if (l) {
        components.spaceAnchor = components.spaceAnchor
          ? components.spaceAnchor + ";" + l
          : l;
      }
    }
  }
}

// register built-in drivers and set default
// (tps and gregorian provide canonical conversions before unix)
TPS.registerDriver(new TpsDriver());
TPS.registerDriver(new GregorianDriver());
TPS.registerDriver(new UnixDriver());
TPS.registerDriver(new PersianDriver());
TPS.registerDriver(new HijriDriver());
TPS.registerDriver(new JulianDriver());
TPS.registerDriver(new HoloceneDriver());
TPS.registerDriver(new ChineseDriver());

/**
 * `TpsDate` is a Date-like wrapper with native TPS conversion helpers.
 *
 * It mirrors common JavaScript `Date` construction patterns:
 * - `new TpsDate()`
 * - `new TpsDate(ms)`
 * - `new TpsDate(isoString)`
 * - `new TpsDate(tpsString)`
 * - `new TpsDate(year, monthIndex, day?, hour?, minute?, second?, ms?)`
 */
