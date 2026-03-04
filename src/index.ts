/**
 * TPS: Temporal Positioning System
 * The Universal Protocol for Space-Time Coordinates.
 * @packageDocumentation
 * @version 0.5.34
 * @license Apache-2.0
 * @copyright 2026 TPS Standards Working Group
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

export * from "./types";
export * from "./uid";
export * from "./date";
export { Env } from "./utils/env";
import { buildTimePart, parseTimeString } from "./utils/tps-string";

import {
  CalendarDriver,
  TPSComponents,
  TimeOrder,
  DefaultCalendars,
} from "./types";

export class TPS {
  // --- PLUGIN REGISTRY ---
  private static readonly drivers: Map<string, CalendarDriver> = new Map();

  /**
   * Registers a calendar driver plugin.
   * @param driver - The driver instance to register.
   */
  static registerDriver(driver: CalendarDriver): void {
    this.drivers.set(driver.code, driver);
  }

  /**
   * Gets a registered calendar driver.
   * @param code - The calendar code.
   * @returns The driver or undefined.
   */
  static getDriver(code: string): CalendarDriver | undefined {
    return this.drivers.get(code);
  }

  // --- REGEX ---
  // Updated for v0.5.0: supports L: anchors, A: actor, ! signature, structural & geospatial anchors
  // Tokens may appear in any order; actual semantic parsing happens in
  // `parseTimeString()` so these patterns are intentionally permissive.
  // regex simply ensures prefix, space, calendar, and token characters;
  // token order is not enforced (parseTimeString handles semantics).
  private static readonly REGEX_URI = new RegExp(
    "^tps://" +
      // Location part (preserve named captures for space subfields)
      "(?:L:)?(?<space>" +
      "~|-|unknown|redacted|hidden|" +
      "s2=(?<s2>[a-fA-F0-9]+)|" +
      "h3=(?<h3>[a-fA-F0-9]+)|" +
      "plus=(?<plus>[A-Z0-9+]+)|" +
      "w3w=(?<w3w>[a-z]+\\.[a-z]+\\.[a-z]+)|" +
      "bldg=(?<bldg>[\\w-]+)(?:\\.floor=(?<floor>[\\w-]+))?(?:\\.room=(?<room>[\\w-]+))?(?:\\.zone=(?<zone>[\\w-]+))?|" +
      "(?<lat>-?\\d+(?:\\.\\d+)?),(?<lon>-?\\d+(?:\\.\\d+)?)(?:,(?<alt>-?\\d+(?:\\.\\d+)?)m?)?|" +
      "(?<generic>[^@/?#]+)" +
      ")" +
      "(?:/A:(?<actor>[^/@]+))?" +
      "@T:(?<calendar>[a-z]{3,4})" +
      "(?:\\.(?:m-?\\d+|c\\d+|y\\d+|d\\d{1,2}|h\\d{1,2}|s\\d+(?:\\.\\d+)?))*" +
      "(?:![^;?#]+)?" +
      "(?:;(?<extensions>[^?#]+))?" +
      "(?:\\?[^#]+)?" +
      "(?:#.+)?$",
  );

  private static readonly REGEX_TIME = new RegExp(
    "^T:(?<calendar>[a-z]{3,4})" +
      "(?:\\.(?:m-?\\d+|c\\d+|y\\d+|d\\d{1,2}|h\\d{1,2}|s\\d+(?:\\.\\d+)?))*" +
      "(?:![^;?#]+)?$",
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
    }
    const parsed = parseTimeString(timeOnly);
    if (!parsed) return null;
    const comp = parsed.components as TPSComponents;
    if (signature) comp.signature = signature;
    comp.order = parsed.order;
    return comp;
  }

  /**
   * SERIALIZER: Converts a components object into a full TPS URI.
   * @param comp - The TPS components.
   * @returns Full URI string (e.g. "tps://...").
   */
  static toURI(comp: TPSComponents): string {
    // 1. Build Space Part (L: anchor)
    let spacePart = "L:-"; // Default: unknown

    if (comp.spaceAnchor) {
      spacePart = comp.spaceAnchor;
    } else if (comp.isHiddenLocation) {
      spacePart = "L:~";
    } else if (comp.isRedactedLocation) {
      spacePart = "L:redacted";
    } else if (comp.isUnknownLocation) {
      spacePart = "L:-";
    } else if (comp.s2Cell) {
      spacePart = `L:s2=${comp.s2Cell}`;
    } else if (comp.h3Cell) {
      spacePart = `L:h3=${comp.h3Cell}`;
    } else if (comp.plusCode) {
      spacePart = `L:plus=${comp.plusCode}`;
    } else if (comp.what3words) {
      spacePart = `L:w3w=${comp.what3words}`;
    } else if (comp.building) {
      spacePart = `L:bldg=${comp.building}`;
      if (comp.floor) spacePart += `.floor=${comp.floor}`;
      if (comp.room) spacePart += `.room=${comp.room}`;
      if (comp.zone) spacePart += `.zone=${comp.zone}`;
    } else if (comp.latitude !== undefined && comp.longitude !== undefined) {
      spacePart = `L:${comp.latitude},${comp.longitude}`;
      if (comp.altitude !== undefined) {
        spacePart += `,${comp.altitude}m`;
      }
    }

    // 2. Build Actor Part (A: anchor) - optional
    let actorPart = "";
    if (comp.actor) {
      actorPart = `/A:${comp.actor}`;
    }

    // 3. Build Time Part (handles order & signature)
    const timePart = buildTimePart(comp);

    // 5. Build Extensions
    let extPart = "";
    if (comp.extensions && Object.keys(comp.extensions).length > 0) {
      const extStrings = Object.entries(comp.extensions).map(
        ([k, v]) => `${k}=${v}`,
      );
      extPart = `;${extStrings.join(".")}`;
    }

    // timePart already begins with 'T:'.  The new canonical separator is '@'
    // instead of '/', so we interpolate it accordingly.  Actor anchor (if
    // present) still uses a leading slash.
    return `tps://${spacePart}${actorPart}@${timePart}${extPart}`;
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
    const driver = this.drivers.get(normalizedCalendar);
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

    const driver = this.drivers.get(cal);
    if (!driver) {
      console.error(`Calendar driver '${cal}' not registered.`);
      return null;
    }

    return driver.getDateFromComponents(parsed);
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
    const driver = this.drivers.get(calendar);
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
    const driver = this.drivers.get(calendar);
    if (!driver) {
      throw new Error(`Calendar driver '${calendar}' not found.`);
    }
    // format is guaranteed by the interface, so we can call it directly.
    return driver.format(components, format);
  }

  // --- INTERNAL HELPERS ---

  private static _mapGroupsToComponents(
    g: Record<string, string>,
  ): TPSComponents {
    const components: any = {};
    components.calendar = g.calendar as string;

    // Signature Mapping
    if (g.signature) {
      components.signature = g.signature;
    }

    // Actor Mapping
    if (g.actor) {
      components.actor = g.actor;
    }

    // Space Mapping
    if (g.space) {
      // Privacy markers
      if (g.space === "unknown" || g.space === "-") {
        components.isUnknownLocation = true;
      } else if (g.space === "redacted") {
        components.isRedactedLocation = true;
      } else if (g.space === "hidden" || g.space === "~") {
        components.isHiddenLocation = true;
      }
      // Geospatial cells
      else if (g.s2) {
        components.s2Cell = g.s2;
      } else if (g.h3) {
        components.h3Cell = g.h3;
      } else if (g.plus) {
        components.plusCode = g.plus;
      } else if (g.w3w) {
        components.what3words = g.w3w;
      }
      // Structural anchors
      else if (g.bldg) {
        components.building = g.bldg;
        if (g.floor) components.floor = g.floor;
        if (g.room) components.room = g.room;
        if (g.zone) components.zone = g.zone;
      }
      // Generic pre-@ anchor (adm/node/net/planet/etc)
      else if (g.generic) {
        components.spaceAnchor = g.generic;
      }
      // GPS coordinates
      else {
        if (g.lat) components.latitude = parseFloat(g.lat);
        if (g.lon) components.longitude = parseFloat(g.lon);
        if (g.alt) components.altitude = parseFloat(g.alt);
      }
    }

    // Extensions Mapping
    if (g.extensions) {
      const extObj: any = {};
      const parts = g.extensions.split(".");
      parts.forEach((p: string) => {
        const eqIdx = p.indexOf("=");
        if (eqIdx > 0) {
          const key = p.substring(0, eqIdx);
          const val = p.substring(eqIdx + 1);
          if (key && val) extObj[key] = val;
        } else {
          // Legacy format: first char is key
          const key = p.charAt(0);
          const val = p.substring(1);
          if (key && val) extObj[key] = val;
        }
      });
      components.extensions = extObj;
    }

    return components as TPSComponents;
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
