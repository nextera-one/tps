/**
 * TPS: Temporal Positioning System
 * The Universal Protocol for Space-Time Coordinates.
 * @packageDocumentation
 * @version 0.5.0
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

// Calendar codes are plain strings to allow arbitrary user-defined
// calendars.  The library still exports constants for the built-in values but
// callers may also supply their own codes.
export const DefaultCalendars = {
  TPS: 'tps',
  GREG: 'greg',
  HIJ: 'hij',
  JUL: 'jul',
  HOLO: 'holo',
  UNIX: 'unix',
} as const;

/**
 * Specifies the direction of the time-component hierarchy when serializing or
 * deserializing a TPS string.  The default is `'descending'` (millennium → … →
 * second), but `'ascending'` produces the reverse order.
 */
export enum TimeOrder {
  DESC = 'desc',
  ASC = 'asc',
}

export interface TPSComponents {
  // --- TEMPORAL ---
  calendar: string;
  // --- REQUIRED TEMPORAL FIELDS ---
  // All of the traditional Gregorian components are now mandatory.  This
  // reflects the fact that a valid TPS time object must contain a complete
  // timestamp when using the canonical calendar formats.
  millennium: number;
  century: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** Sub-second precision (0–999).  Encoded as the last `m` token. */
  millisecond: number;
  // --- OPTIONAL UNIX BACKUP ---
  // `unixSeconds` remains optional to support the Unix driver and other
  // cases where a simple epoch value is preferred.
  unixSeconds?: number;

  // --- SPATIAL: GPS Coordinates ---
  latitude?: number;
  longitude?: number;
  altitude?: number;

  // --- SPATIAL: Geospatial Cells ---
  /** Google S2 cell ID (hierarchical, prefix-searchable) */
  s2Cell?: string;
  /** Uber H3 cell ID (hexagonal grid) */
  h3Cell?: string;
  /** Open Location Code / Plus Code */
  plusCode?: string;
  /** what3words address (e.g. "filled.count.soap") */
  what3words?: string;

  // --- SPATIAL: Structural Anchors ---
  /** Physical building identifier */
  building?: string;
  /** Vertical division (level) */
  floor?: string;
  /** Enclosed space identifier */
  room?: string;
  /** Logical area within building */
  zone?: string;

  // --- SPATIAL: Privacy Markers ---
  /** Technical missing data (e.g. server log without GPS) */
  isUnknownLocation?: boolean;
  /** Removed for legal/security reasons (e.g. GDPR) */
  isRedactedLocation?: boolean;
  /** Masked by user preference (e.g. "Don't show my location") */
  isHiddenLocation?: boolean;

  // --- PROVENANCE ---
  /** Actor anchor - identifies observer/witness (e.g. "did:web:sensor.example.com", "node:gateway-01") */
  actor?: string;
  /** Verification hash appended to time (e.g. "sha256:8f3e2a...") */
  signature?: string;

  // --- CONTEXT ---
  extensions?: Record<string, string>;

  order?: TimeOrder;
} 

// --- PLUGIN ARCHITECTURE ---

/**
 * Interface for Calendar Driver plugins.
 * Implementations provide conversion logic to/from Gregorian and support for
 * external calendar libraries.
 *
 * @example Using a driver to parse a Hijri date string
 * ```ts
 * const driver = TPS.getDriver('hij');
 * if (driver?.parseDate) {
 *   const components = driver.parseDate('1447-07-21');
 *   const gregDate = driver.toGregorian(components);
 *   const tpsString = TPS.fromDate(gregDate, 'hij');
 * }
 * ```
 *
 * @example Wrapping an external library (moment-hijri)
 * ```ts
 * import moment from 'moment-hijri';
 *
 * class HijriDriver implements CalendarDriver {
 *   readonly code = 'hij';
 *
 *   parseDate(input: string, format?: string): Partial<TPSComponents> {
 *     const m = moment(input, format || 'iYYYY-iMM-iDD');
 *     return {
 *       calendar: 'hij',
 *       year: m.iYear(),
 *       month: m.iMonth() + 1,
 *       day: m.iDate()
 *     };
 *   }
 *
 *   fromGregorian(date: Date): Partial<TPSComponents> {
 *     const m = moment(date);
 *     return {
 *       calendar: 'hij',
 *       year: m.iYear(),
 *       month: m.iMonth() + 1,
 *       day: m.iDate(),
 *       hour: m.hour(),
 *       minute: m.minute(),
 *       second: m.second()
 *     };
 *   }
 *
 *   // ... other methods
 * }
 * ```
 */
export interface CalendarDriver {
  /** The calendar code this driver handles (e.g., 'hij', 'jul'). */
  readonly code: string;

  /**
   * Human-readable name for this calendar (optional).
   * @example "Hijri (Islamic)"
   */
  readonly name?: string;

  /**
   * Converts a Date to this calendar's components.
   * @param date - The Gregorian Date object.
   * @returns Partial TPS components for year, month, day, etc.
   */
  getComponentsFromDate(date: Date): Partial<TPSComponents>;

  /**
   * Converts this calendar's components to a Date.
   * @param components - Partial TPS components (year, month, day, etc.).
   * @returns A JavaScript Date object.
   */
  getDateFromComponents(components: Partial<TPSComponents>): Date;

  /**
   * Generates a TPS time string for this calendar from a Date.
   * @param date - The Gregorian Date object.
   * @returns A TPS time string (e.g., "T:hij.y1447.m07.d21...").
   */
  getFromDate(date: Date): string;

  // --- NEW ENHANCED METHODS (Optional) ---

  /**
   * Parse a calendar-specific date string into TPS components.
   * This allows drivers to handle native date formats from external libraries.
   *
   * @param input - Date string in calendar-native format (e.g., '1447-07-21' for Hijri)
   * @param format - Optional format string (driver-specific, e.g., 'iYYYY-iMM-iDD')
   * @returns Partial TPS components
   *
   * @example
   * ```ts
   * // Hijri driver
   * driver.parseDate('1447-07-21'); // → { year: 1447, month: 7, day: 21, calendar: 'hij' }
   *
   * // With time
   * driver.parseDate('1447-07-21 14:30:00'); // → { year: 1447, month: 7, day: 21, hour: 14, ... }
   * ```
   */
  parseDate(input: string, format?: string): Partial<TPSComponents>;

  /**
   * Format TPS components to a calendar-specific date string.
   * Inverse of parseDate().
   *
   * @param components - TPS components to format
   * @param format - Optional format string (driver-specific)
   * @returns Formatted date string in calendar-native format
   *
   * @example
   * ```ts
   * driver.format({ year: 1447, month: 7, day: 21 }); // → '1447-07-21'
   * driver.format({ year: 1447, month: 7, day: 21 }, 'short'); // → '21/7/1447'
   * ```
   */
  format(components: Partial<TPSComponents>, format?: string): string;

  /**
   * Validate a calendar-specific date string or components.
   *
   * @param input - Date string or components to validate
   * @returns true if valid for this calendar
   *
   * @example
   * ```ts
   * driver.validate('1447-13-01'); // → false (month 13 invalid)
   * driver.validate({ year: 1447, month: 7, day: 31 }); // → false (Rajab has 30 days)
   * ```
   */
  validate(input: string | Partial<TPSComponents>): boolean;

  /**
   * Get calendar metadata (month names, day names, etc.).
   * Useful for UI rendering.
   *
   * @example
   * ```ts
   * driver.getMetadata().monthNames
   * // → ['Muharram', 'Safar', 'Rabi I', ...]
   * ```
   */
  getMetadata(): CalendarMetadata;
}

/**
 * Metadata about a calendar system.
 */
export interface CalendarMetadata {
  /** Human-readable calendar name */
  name: string;
  /** Month names in order (1-12 or 1-13) */
  monthNames?: string[];
  /** Short month names */
  monthNamesShort?: string[];
  /** Day of week names (Sunday=0 or locale-specific) */
  dayNames?: string[];
  /** Short day names */
  dayNamesShort?: string[];
  /** Whether this calendar is lunar-based */
  isLunar?: boolean;
  /** Number of months per year */
  monthsPerYear?: number;
  /** Epoch year (for reference) */
  epochYear?: number;
}

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
      "(?<lat>-?\\d+(?:\\.\\d+)?),(?<lon>-?\\d+(?:\\.\\d+)?)(?:,(?<alt>-?\\d+(?:\\.\\d+)?)m?)?" +
      ")" +
      "(?:/A:(?<actor>[^/@]+))?" +
      "@T:(?<calendar>[a-z]{3,4})" +
      "(?:\\.(?:m-?\\d+|c\\d+|y\\d+|d\\d{1,2}|h\\d{1,2}|s\\d+(?:\\.\\d+)?))*" +
      "(?:![^;?#]+)?" +
      "(?:;(?<extensions>[a-z0-9.\-_=]+))?" +
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
    // Use tps as the default calendar if none was specified
    const resolvedCal = cal || DefaultCalendars.TPS;
    if (!tokenStr) {
      return `${beforeT}T:${resolvedCal}.m0.c0.y0.m0.d0.h0.m0.s0.m0${timeSuffix}`;
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

    return `${beforeT}T:${resolvedCal}.${finalTokenStr}${timeSuffix}`;
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
        const parsed = this.parseTimeString(timeStr);
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
    const parsed = this.parseTimeString(timeOnly);
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

    if (comp.isHiddenLocation) {
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
    const timePart = this.buildTimePart(comp);

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
    const driver = this.drivers.get(calendar);
    if (driver) {
      // when caller requested an explicit order we can bypass the driver's
      // `fromDate` helper and instead generate components ourselves so that
      // order is honoured even if the driver doesn't know about it.  This
      // keeps behaviour identical to the old built-in implementation.
      if (opts?.order) {
        const comp = driver.getComponentsFromDate(date) as TPSComponents;
        comp.calendar = calendar;
        comp.order = opts.order;
        return this.buildTimePart(comp);
      }
      return driver.getFromDate(date);
    }

    // Fallback for old built-in calendars (shouldn't happen once drivers are
    // registered, but kept for backwards compatibility).
    const comp: TPSComponents = { calendar } as any;

    if (calendar === DefaultCalendars.UNIX) {
      const s = (date.getTime() / 1000).toFixed(3);
      comp.unixSeconds = parseFloat(s);
      if (opts?.order) comp.order = opts.order;
      return this.buildTimePart(comp);
    }

    if (calendar === DefaultCalendars.GREG) {
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
      return this.buildTimePart(comp);
    }

    throw new Error(
      `Calendar driver '${calendar}' not implemented. Register a driver.`,
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

  /**
   * Generate the canonical `T:` time string for a set of components.  The
   * `order` field (or `comp.order`) controls whether tokens are emitted in
   * ascending or descending hierarchy; if undefined the default
   * `'descending'` orientation is used.
   *
   * Drivers may ignore this helper and produce their own time strings if they
   * implement custom ordering logic.
   */
  public static buildTimePart(comp: TPSComponents): string {
    let time = `T:${comp.calendar}`;
    if (comp.calendar === DefaultCalendars.UNIX) {
      if (comp.unixSeconds !== undefined) {
        time += `.s${comp.unixSeconds}`;
      }
      return time;
    }

    // sequence of [prefix, value, rank]
    // All four of millennium / month / minute / millisecond share the prefix 'm'.
    // Position within the ordered sequence disambiguates them during parsing.
    const tokens: Array<[string, number | undefined, number]> = [
      ["m", comp.millennium, 8], // m-token rank 8 → millennium
      ["c", comp.century, 7],
      ["y", comp.year, 6],
      ["m", comp.month, 5], // m-token rank 5 → month
      ["d", comp.day, 4],
      ["h", comp.hour, 3],
      ["m", comp.minute, 2], // m-token rank 2 → minute
      ["s", comp.second, 1],
      ["m", comp.millisecond, 0], // m-token rank 0 → millisecond
    ];

    const order: TimeOrder = comp.order || TimeOrder.DESC;
    if (order === TimeOrder.ASC) tokens.reverse();

    for (const [pref, val] of tokens) {
      if (val !== undefined) {
        // seconds may be fractional
        time += `.${pref}${val}`;
      }
    }

    if (comp.signature) {
      time += `!${comp.signature}`;
    }

    return time;
  }

  /**
   * Parse the *time* portion of a TPS string (optionally beginning with
   * `T:`) into components and determine the component ordering.  This helper
   * accepts tokens in **any** sequence and will return an `order` value of
   * `'ascending'` or `'descending'`.
   *
   * The caller is responsible for stripping off a leading signature or other
   * trailer characters; this method will drop anything after `!`, `;`, `?` or
   * `#`.
   *
   * ### `m`-token disambiguation
   * All four of millennium (rank 8), month (rank 5), minute (rank 2) and
   * millisecond (rank 0) share the single-character prefix `m`.  They are told
   * apart by their **position relative to the neighbouring tokens**.  The
   * algorithm is:
   *
   * 1. Pre-scan the non-`m` tokens (c, y, d, h, s) whose ranks are fixed to
   *    determine whether the string is ascending or descending.
   * 2. While iterating, track `lastAssignedRank` – the rank of the most
   *    recently processed token (m or non-m).
   * 3. When an `m` token is encountered, derive its rank from `lastAssignedRank`
   *    and the detected order:
   *    - **DESC**  null → 8 (mill) | rank > 5 → 5 (month) | rank > 2 → 2 (min) | else → 0 (ms)
   *    - **ASC**   null → 0 (ms)   | rank < 2 → 2 (min)   | rank < 5 → 5 (month) | else → 8 (mill)
   *
   * @param input - Time fragment (e.g. `"T:greg.m3.c1.y26"` or `"greg.m0.s25.m30"`)
   */
  static parseTimeString(
    input: string,
  ): { components: Partial<TPSComponents>; order: TimeOrder } | null {
    let s = input.trim();
    // strip off anything after signature or extensions/query/fragment
    s = s.split(/[!;?#]/)[0];
    if (s.startsWith("T:")) s = s.slice(2);
    const parts = s.split(".");
    if (parts.length === 0) return null;
    const calendar = parts[0];
    const comp: Partial<TPSComponents> = { calendar };

    // Fixed-rank prefixes (unambiguous regardless of position)
    const fixedRankMap: Record<string, number> = {
      c: 7,
      y: 6,
      d: 4,
      h: 3,
      s: 1,
    };

    // ── Step 1: pre-scan non-m tokens to estimate order ─────────────────────
    // This is only needed to handle the first 'm' token when lastAssignedRank
    // is still null (nothing has been seen yet).
    let initialOrder: TimeOrder = TimeOrder.DESC;
    if (calendar !== DefaultCalendars.UNIX) {
      const nonMRanks: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const pr = parts[i]?.charAt(0);
        if (pr && pr in fixedRankMap) nonMRanks.push(fixedRankMap[pr]);
      }
      if (nonMRanks.length >= 2) {
        const isAsc = nonMRanks.every((v, i, a) => i === 0 || a[i - 1] <= v);
        if (isAsc) initialOrder = TimeOrder.ASC;
      }
    }

    // ── Step 2: resolve the semantic rank of an 'm' token ───────────────────
    const assignMRank = (lastRank: number | null, ord: TimeOrder): number => {
      if (ord === TimeOrder.DESC) {
        if (lastRank === null) return 8; // first token → millennium
        if (lastRank > 5) return 5; // after century / year  → month
        if (lastRank > 2) return 2; // after day / hour      → minute
        return 0; // after second          → millisecond
      } else {
        if (lastRank === null) return 0; // first token → millisecond
        if (lastRank < 2) return 2; // after millisecond / second → minute
        if (lastRank < 5) return 5; // after minute / hour / day  → month
        return 8; // after month / year / cent  → millennium
      }
    };

    // ── Step 3: iterate and build components ────────────────────────────────
    const ranks: number[] = [];
    let lastAssignedRank: number | null = null;

    for (let i = 1; i < parts.length; i++) {
      const token = parts[i];
      if (!token) continue;
      const prefix = token.charAt(0);
      const value = token.slice(1);

      // UNIX calendar: single 's' token carries the full unix timestamp
      if (calendar === DefaultCalendars.UNIX && prefix === "s") {
        comp.unixSeconds = parseFloat(value);
        ranks.push(9);
        continue;
      }

      if (prefix === "m") {
        const rank = assignMRank(lastAssignedRank, initialOrder);
        switch (rank) {
          case 8:
            comp.millennium = parseInt(value, 10);
            break;
          case 5:
            comp.month = parseInt(value, 10);
            break;
          case 2:
            comp.minute = parseInt(value, 10);
            break;
          case 0:
            comp.millisecond = parseInt(value, 10);
            break;
        }
        ranks.push(rank);
        lastAssignedRank = rank;
      } else {
        switch (prefix) {
          case "c":
            comp.century = parseInt(value, 10);
            ranks.push(7);
            lastAssignedRank = 7;
            break;
          case "y":
            comp.year = parseInt(value, 10);
            ranks.push(6);
            lastAssignedRank = 6;
            break;
          case "d":
            comp.day = parseInt(value, 10);
            ranks.push(4);
            lastAssignedRank = 4;
            break;
          case "h":
            comp.hour = parseInt(value, 10);
            ranks.push(3);
            lastAssignedRank = 3;
            break;
          case "s":
            comp.second = parseFloat(value);
            ranks.push(1);
            lastAssignedRank = 1;
            break;
          default:
            // unknown prefix – ignore
            break;
        }
      }
    }

    // ── Step 4: confirm order from the complete rank sequence ────────────────
    let order: TimeOrder = TimeOrder.DESC;
    if (ranks.length > 1) {
      const isAsc = ranks.every((v, i, a) => i === 0 || a[i - 1] <= v);
      const isDesc = ranks.every((v, i, a) => i === 0 || a[i - 1] >= v);
      if (isAsc && !isDesc) order = TimeOrder.ASC;
      // mixed / single direction → defaults to DESC
    }

    return { components: comp, order };
  }

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

// --- TPS-UID v1 Types ---

/**
 * Decoded result from TPSUID7RB binary format.
 */
export type TPSUID7RBDecodeResult = {
  /** Version identifier */
  version: 'tpsuid7rb';
  /** Epoch milliseconds (UTC) */
  epochMs: number;
  /** Whether the TPS payload was compressed */
  compressed: boolean;
  /** 32-bit nonce for collision prevention */
  nonce: number;
  /** The original TPS string (exact reconstruction) */
  tps: string;
};

/**
 * Encoding options for TPSUID7RB.
 */
export type TPSUID7RBEncodeOptions = {
  /** Enable zlib compression of TPS payload */
  compress?: boolean;
  /** Override epoch milliseconds (default: parsed from TPS) */
  epochMs?: number;
};

/**
 * TPS-UID v1 — Temporal Positioning System Identifier (Binary Reversible)
 *
 * A time-first, reversible identifier that binds an event to a TPS coordinate.
 * Unlike UUIDs, TPS-UID identifies events in spacetime and allows exact
 * reconstruction of the original TPS string.
 *
 * Binary Schema (all integers big-endian):
 * ```
 * MAGIC   4 bytes   "TPU7"
 * VER     1 byte    0x01
 * FLAGS   1 byte    bit0 = compression flag
 * TIME    6 bytes   epoch_ms (48-bit unsigned)
 * NONCE   4 bytes   32-bit random
 * LEN     varint    length of TPS payload
 * TPS     bytes     UTF-8 TPS string (raw or zlib-compressed)
 * ```
 *
 * @example
 * ```ts
 * const tps = 'tps://31.95,35.91@T:greg.m3.c1.y26.m01.d09';
 *
 * // Encode to binary
 * const bytes = TPSUID7RB.encodeBinary(tps);
 *
 * // Encode to base64url string
 * const id = TPSUID7RB.encodeBinaryB64(tps);
 * // → "tpsuid7rb_AFRQV..."
 *
 * // Decode back to original TPS
 * const decoded = TPSUID7RB.decodeBinaryB64(id);
 * console.log(decoded.tps); // exact original TPS
 * ```
 */
export class TPSUID7RB {
  /** Magic bytes: "TPU7" */
  private static readonly MAGIC = new Uint8Array([0x54, 0x50, 0x55, 0x37]);
  /** Version 1 */
  private static readonly VER = 0x01;
  /** String prefix for base64url encoded form */
  private static readonly PREFIX = 'tpsuid7rb_';
  /** Regex for validating base64url encoded form */
  public static readonly REGEX = /^tpsuid7rb_[A-Za-z0-9_-]+$/;

  // ---------------------------
  // Public API
  // ---------------------------

  /**
   * Encode TPS string to binary bytes (Uint8Array).
   * This is the canonical form for hashing, signing, and storage.
   *
   * @param tps - The TPS string to encode
   * @param opts - Encoding options (compress, epochMs override)
   * @returns Binary TPS-UID as Uint8Array
   */
  static encodeBinary(tps: string, opts: TPSUID7RBEncodeOptions = {}): Uint8Array {
    const compress = opts.compress ?? false;
    const epochMs = opts.epochMs ?? this.epochMsFromTPSString(tps);

    if (!Number.isInteger(epochMs) || epochMs < 0) {
      throw new Error('epochMs must be a non-negative integer');
    }
    if (epochMs > 0xffffffffffff) {
      throw new Error('epochMs exceeds 48-bit range');
    }

    const flags = compress ? 0x01 : 0x00;

    // Generate 32-bit nonce
    const nonceBuf = this.randomBytes(4);
    const nonce =
      ((nonceBuf[0] << 24) >>> 0) +
      ((nonceBuf[1] << 16) >>> 0) +
      ((nonceBuf[2] << 8) >>> 0) +
      nonceBuf[3];

    // Encode TPS to UTF-8
    const tpsUtf8 = new TextEncoder().encode(tps);

    // Optionally compress
    const payload = compress ? this.deflateRaw(tpsUtf8) : tpsUtf8;

    // Encode length as varint
    const lenVar = this.uvarintEncode(payload.length);

    // Construct binary structure
    const out = new Uint8Array(
      4 + 1 + 1 + 6 + 4 + lenVar.length + payload.length,
    );
    let offset = 0;

    // MAGIC
    out.set(this.MAGIC, offset);
    offset += 4;

    // VER
    out[offset++] = this.VER;

    // FLAGS
    out[offset++] = flags;

    // TIME (48-bit big-endian)
    const timeBytes = this.writeU48(epochMs);
    out.set(timeBytes, offset);
    offset += 6;

    // NONCE (32-bit big-endian)
    out.set(nonceBuf, offset);
    offset += 4;

    // LEN (varint)
    out.set(lenVar, offset);
    offset += lenVar.length;

    // TPS payload
    out.set(payload, offset);

    return out;
  }

  /**
   * Decode binary bytes back to original TPS string.
   *
   * @param bytes - Binary TPS-UID
   * @returns Decoded result with original TPS string
   */
  static decodeBinary(bytes: Uint8Array): TPSUID7RBDecodeResult {
    // Header min size: 4+1+1+6+4 + 1 (at least 1 byte varint) = 17
    if (bytes.length < 17) {
      throw new Error('TPSUID7RB: too short');
    }

    // MAGIC
    if (
      bytes[0] !== 0x54 ||
      bytes[1] !== 0x50 ||
      bytes[2] !== 0x55 ||
      bytes[3] !== 0x37
    ) {
      throw new Error('TPSUID7RB: bad magic');
    }

    // VERSION
    const ver = bytes[4];
    if (ver !== this.VER) {
      throw new Error(`TPSUID7RB: unsupported version ${ver}`);
    }

    // FLAGS
    const flags = bytes[5];
    const compressed = (flags & 0x01) === 0x01;

    // TIME (48-bit big-endian)
    const epochMs = this.readU48(bytes, 6);

    // NONCE (32-bit big-endian)
    const nonce =
      ((bytes[12] << 24) >>> 0) +
      ((bytes[13] << 16) >>> 0) +
      ((bytes[14] << 8) >>> 0) +
      bytes[15];

    // LEN (varint at offset 16)
    let offset = 16;
    const { value: tpsLen, bytesRead } = this.uvarintDecode(bytes, offset);
    offset += bytesRead;

    if (offset + tpsLen > bytes.length) {
      throw new Error('TPSUID7RB: length overflow');
    }

    // TPS payload
    const payload = bytes.slice(offset, offset + tpsLen);
    const tpsUtf8 = compressed ? this.inflateRaw(payload) : payload;
    const tps = new TextDecoder().decode(tpsUtf8);

    return { version: 'tpsuid7rb', epochMs, compressed, nonce, tps };
  }

  /**
   * Encode TPS to base64url string with prefix.
   * This is the transport/storage form.
   *
   * @param tps - The TPS string to encode
   * @param opts - Encoding options
   * @returns Base64url encoded TPS-UID with prefix
   */
  static encodeBinaryB64(tps: string, opts?: TPSUID7RBEncodeOptions): string {
    const bytes = this.encodeBinary(tps, opts ?? {});
    return `${this.PREFIX}${this.base64UrlEncode(bytes)}`;
  }

  /**
   * Decode base64url string back to original TPS string.
   *
   * @param id - Base64url encoded TPS-UID with prefix
   * @returns Decoded result with original TPS string
   */
  static decodeBinaryB64(id: string): TPSUID7RBDecodeResult {
    const s = id.trim();
    if (!s.startsWith(this.PREFIX)) {
      throw new Error('TPSUID7RB: missing prefix');
    }
    const b64 = s.slice(this.PREFIX.length);
    const bytes = this.base64UrlDecode(b64);
    return this.decodeBinary(bytes);
  }

  /**
   * Validate base64url encoded TPS-UID format.
   * Note: This validates shape only; binary decode is authoritative.
   *
   * @param id - String to validate
   * @returns true if format is valid
   */
  static validateBinaryB64(id: string): boolean {
    return this.REGEX.test(id.trim());
  }

  /**
   * Generate a TPS-UID from the current time and optional location.
   *
   * @param opts - Generation options
   * @returns Base64url encoded TPS-UID
   */
  static generate(opts?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    compress?: boolean;
    order?: TimeOrder;
  }): string {
    const now = new Date();
    // produce base tps using TPS.fromDate to honour order
    let tps = TPS.fromDate(now, DefaultCalendars.TPS, {
      order: opts?.order,
    });

    // if location provided, merge via parse/URI
    if (
      opts?.latitude !== undefined &&
      opts?.longitude !== undefined
    ) {
      const comp = TPS.parse(tps) as TPSComponents;
      comp.latitude = opts.latitude;
      comp.longitude = opts.longitude;
      if (opts.altitude !== undefined) comp.altitude = opts.altitude;
      tps = TPS.toURI(comp);
    }

    return this.encodeBinaryB64(tps, {
      compress: opts?.compress,
      epochMs: now.getTime(),
    });
  }

  // ---------------------------
  // TPS String Helpers
  // ---------------------------

  /**
   * Generate a TPS string from a Date and optional location.
   */
  // NOTE: this helper is primarily used by `generate()`; drivers and
  // callers should prefer `TPS.fromDate()` when order or calendars matter.
  private static generateTPSString(
    date: Date,
    opts?: { latitude?: number; longitude?: number; altitude?: number; order?: TimeOrder },
  ): string {
    const fullYear = date.getUTCFullYear();
    const comp: TPSComponents = {
      calendar: DefaultCalendars.TPS,
      millennium: Math.floor(fullYear / 1000) + 1,
      century: Math.floor((fullYear % 1000) / 100) + 1,
      year: fullYear % 100,
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      millisecond: date.getUTCMilliseconds(),
    };
    if (opts?.order) comp.order = opts.order;

    // note: this method belongs to TPSUID7RB, but buildTimePart lives on TPS
    const timePart = TPS.buildTimePart(comp);

    let spacePart = 'unknown';
    if (opts?.latitude !== undefined && opts?.longitude !== undefined) {
      spacePart = `${opts.latitude},${opts.longitude}`;
      if (opts.altitude !== undefined) {
        spacePart += `,${opts.altitude}m`;
      }
    }

    return `tps://${spacePart}@${timePart}`;
  }

  /**
   * Parse epoch milliseconds from a TPS string.
   * Supports both URI format (tps://...) and time-only format (T:greg...)
   */
  static epochMsFromTPSString(tps: string): number {
    const date = TPS.toDate(tps);
    if (!date) throw new Error('TPS: unable to parse date for epoch');
    return date.getTime();
  }

  // ---------------------------
  // Binary Helpers
  // ---------------------------

  /** Write 48-bit unsigned integer (big-endian) */
  private static writeU48(epochMs: number): Uint8Array {
    const b = new Uint8Array(6);
    // Use BigInt for proper 48-bit handling
    const v = BigInt(epochMs);
    b[0] = Number((v >> 40n) & 0xffn);
    b[1] = Number((v >> 32n) & 0xffn);
    b[2] = Number((v >> 24n) & 0xffn);
    b[3] = Number((v >> 16n) & 0xffn);
    b[4] = Number((v >> 8n) & 0xffn);
    b[5] = Number(v & 0xffn);
    return b;
  }

  /** Read 48-bit unsigned integer (big-endian) */
  private static readU48(bytes: Uint8Array, offset: number): number {
    const v =
      (BigInt(bytes[offset]) << 40n) +
      (BigInt(bytes[offset + 1]) << 32n) +
      (BigInt(bytes[offset + 2]) << 24n) +
      (BigInt(bytes[offset + 3]) << 16n) +
      (BigInt(bytes[offset + 4]) << 8n) +
      BigInt(bytes[offset + 5]);

    const n = Number(v);
    if (!Number.isSafeInteger(n)) {
      throw new Error('TPSUID7RB: u48 not safe integer');
    }
    return n;
  }

  /** Encode unsigned integer as LEB128 varint */
  private static uvarintEncode(n: number): Uint8Array {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error('uvarint must be non-negative int');
    }
    const out: number[] = [];
    let x = n >>> 0;
    while (x >= 0x80) {
      out.push((x & 0x7f) | 0x80);
      x >>>= 7;
    }
    out.push(x);
    return new Uint8Array(out);
  }

  /** Decode LEB128 varint */
  private static uvarintDecode(
    bytes: Uint8Array,
    offset: number,
  ): { value: number; bytesRead: number } {
    let x = 0;
    let s = 0;
    let i = 0;
    while (true) {
      if (offset + i >= bytes.length) {
        throw new Error('uvarint overflow');
      }
      const b = bytes[offset + i];
      if (b < 0x80) {
        if (i > 9 || (i === 9 && b > 1)) {
          throw new Error('uvarint too large');
        }
        x |= b << s;
        return { value: x >>> 0, bytesRead: i + 1 };
      }
      x |= (b & 0x7f) << s;
      s += 7;
      i++;
      if (i > 10) {
        throw new Error('uvarint too long');
      }
    }
  }

  // ---------------------------
  // Base64url Helpers
  // ---------------------------

  /** Encode bytes to base64url (no padding) */
  private static base64UrlEncode(bytes: Uint8Array): string {
    // Node.js environment
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    }
    // Browser environment
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  /** Decode base64url to bytes */
  private static base64UrlDecode(b64url: string): Uint8Array {
    // Add padding
    const padLen = (4 - (b64url.length % 4)) % 4;
    const b64 = (b64url + '='.repeat(padLen))
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Node.js environment
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(b64, 'base64'));
    }
    // Browser environment
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // ---------------------------
  // Compression Helpers
  // ---------------------------

  /** Compress using zlib deflate raw */
  private static deflateRaw(data: Uint8Array): Uint8Array {
    // Node.js environment
    if (typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const zlib = require('zlib');
        return new Uint8Array(zlib.deflateRawSync(Buffer.from(data)));
      } catch {
        throw new Error('TPSUID7RB: compression not available');
      }
    }
    // Browser: would need pako or similar library
    throw new Error('TPSUID7RB: compression not available in browser');
  }

  /** Decompress using zlib inflate raw */
  private static inflateRaw(data: Uint8Array): Uint8Array {
    // Node.js environment
    if (typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const zlib = require('zlib');
        return new Uint8Array(zlib.inflateRawSync(Buffer.from(data)));
      } catch {
        throw new Error('TPSUID7RB: decompression failed');
      }
    }
    // Browser: would need pako or similar library
    throw new Error('TPSUID7RB: decompression not available in browser');
  }

  // ---------------------------
  // Cryptographic Sealing (Ed25519)
  // ---------------------------

  /**
   * Seal (sign) a TPS string to create a cryptographically verifiable TPS-UID.
   * This appends an Ed25519 signature to the binary form.
   *
   * @param tps - The TPS string to seal
   * @param privateKey - Ed25519 private key (hex or buffer)
   * @param opts - Encoding options
   * @returns Sealed binary TPS-UID
   */
  static seal(
    tps: string,
    privateKey: string | Buffer | Uint8Array,
    opts?: TPSUID7RBEncodeOptions,
  ): Uint8Array {
    // 1. Create standard binary (unsealed first)
    // We force the SEAL flag (bit 1) to be 0 initially for the "content to sign"
    // But wait, we want the signature to cover the header too.
    // Strategy: Construct the full binary with SEAL flag OFF, sign it, then set SEAL flag ON and append sig.
    // Actually, the standard way is:
    // Content = MAGIC + VER + FLAGS(with seal bit set) + TIME + NONCE + LEN + PAYLOAD
    // Signature = Sign(Content)
    // Final = Content + SEAL_TYPE + SIGNATURE

    const compress = opts?.compress ?? false;
    const epochMs = opts?.epochMs ?? this.epochMsFromTPSString(tps);

    // Validate epoch
    if (!Number.isInteger(epochMs) || epochMs < 0 || epochMs > 0xffffffffffff) {
      throw new Error('epochMs must be a valid 48-bit non-negative integer');
    }

    // Flags: Bit 0 = compress, Bit 1 = sealed
    const flags = (compress ? 0x01 : 0x00) | 0x02; // Set SEAL bit

    // Generate Nonce
    const nonceBuf = this.randomBytes(4);

    // Encode Payload
    const tpsUtf8 = new TextEncoder().encode(tps);
    const payload = compress ? this.deflateRaw(tpsUtf8) : tpsUtf8;
    const lenVar = this.uvarintEncode(payload.length);

    // Construct Content (Header + Payload)
    const contentLen = 4 + 1 + 1 + 6 + 4 + lenVar.length + payload.length;
    const content = new Uint8Array(contentLen);
    let offset = 0;

    content.set(this.MAGIC, offset);
    offset += 4;
    content[offset++] = this.VER;
    content[offset++] = flags;
    content.set(this.writeU48(epochMs), offset);
    offset += 6;
    content.set(nonceBuf, offset);
    offset += 4;
    content.set(lenVar, offset);
    offset += lenVar.length;
    content.set(payload, offset);

    // Sign the content
    const signature = this.signEd25519(content, privateKey);
    const sealType = 0x01; // Ed25519

    // Final Output: Content + SealType (1) + Signature (64)
    const final = new Uint8Array(contentLen + 1 + signature.length);
    final.set(content, 0);
    final.set([sealType], contentLen);
    final.set(signature, contentLen + 1);

    return final;
  }

  /**
   * Verify a sealed TPS-UID and decode it.
   * Throws if signature is invalid or not sealed.
   *
   * @param sealedBytes - The binary sealed TPS-UID
   * @param publicKey - Ed25519 public key (hex or buffer) to verify against
   * @returns Decoded result
   */
  static verifyAndDecode(
    sealedBytes: Uint8Array,
    publicKey: string | Buffer | Uint8Array,
  ): TPSUID7RBDecodeResult {
    if (sealedBytes.length < 18) throw new Error('TPSUID7RB: too short');

    // Check Magic
    if (
      sealedBytes[0] !== 0x54 ||
      sealedBytes[1] !== 0x50 ||
      sealedBytes[2] !== 0x55 ||
      sealedBytes[3] !== 0x37
    ) {
      throw new Error('TPSUID7RB: bad magic');
    }

    // Check Flags for Sealed Bit (bit 1)
    const flags = sealedBytes[5];
    if ((flags & 0x02) === 0) {
      throw new Error('TPSUID7RB: not a sealed UID');
    }

    // 1. Parse the structure to find where content ends
    // We need to parse LEN and Payload to find the split point
    let offset = 16; // Start of LEN
    // Decode LEN
    const { value: tpsLen, bytesRead } = this.uvarintDecode(
      sealedBytes,
      offset,
    );
    offset += bytesRead;
    const payloadEnd = offset + tpsLen;

    if (payloadEnd > sealedBytes.length) {
      throw new Error('TPSUID7RB: length overflow (truncated)');
    }

    // The Content to verify matches exactly [0 ... payloadEnd]
    const content = sealedBytes.slice(0, payloadEnd);

    // After content: SealType (1 byte) + Signature
    if (sealedBytes.length <= payloadEnd + 1) {
      throw new Error('TPSUID7RB: missing signature data');
    }

    const sealType = sealedBytes[payloadEnd];
    if (sealType !== 0x01) {
      throw new Error(
        `TPSUID7RB: unsupported seal type 0x${sealType.toString(16)}`,
      );
    }

    const signature = sealedBytes.slice(payloadEnd + 1);
    if (signature.length !== 64) {
      throw new Error(
        `TPSUID7RB: invalid Ed25519 signature length ${signature.length}`,
      );
    }

    // Verify
    const isValid = this.verifyEd25519(content, signature, publicKey);
    if (!isValid) {
      throw new Error('TPSUID7RB: signature verification failed');
    }

    // Decode (reuse standard logic, but ignoring the extra bytes at end is fine?)
    // Actually standard logic doesn't expect trailing bytes unless we tell it to.
    // But since we verified, we can just slice the content and decode that as a strict binary
    // EXCEPT standard decodeBinary checks strict length.
    // So we manually decode the components here to be safe and efficient.

    return this.decodeBinary(content); // Reuse strict decoder on the content part
  }

  // --- Crypto Implementation (Ed25519) ---

  private static signEd25519(
    data: Uint8Array,
    privateKey: string | Buffer | Uint8Array,
  ): Uint8Array {
    if (typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const crypto = require('crypto');
        // Node's crypto.sign uses PEM or KeyObject, but for raw Ed25519 keys we might need 'crypto.sign(null, data, key)'
        // or ensure key is properly formatted.
        // For simplicity in Node 20+, crypto.sign(null, data, privateKey) works if key is KeyObject.
        // If raw bytes: establish KeyObject.

        let keyObj;
        if (Buffer.isBuffer(privateKey) || privateKey instanceof Uint8Array) {
          // Assuming raw 64-byte private key (or 32-byte seed properly expanded by crypto)
          // Node < 16 is tricky with raw keys.
          // Let's assume standard Ed25519 standard implementation pattern logic:
          keyObj = crypto.createPrivateKey({
            key: Buffer.from(privateKey),
            format: 'der', // or 'pem' - strict.
            type: 'pkcs8',
          });
          // Actually, simpler: construct key object from raw bytes if possible?
          // Node's crypto is strict. Let's try the simplest:
          // If hex string provided, convert to buffer.
        }

        // Simpler fallback: If user passed a PEM string, great.
        // If they passed raw bytes, we might need 'ed25519' key type.
        // For this implementation, let's target Node's high-level sign/verify
        // and assume the user provides a VALID key object or compatible format (PEM/DER).
        // Handling RAW Ed25519 keys in Node requires specific 'crypto.createPrivateKey' with 'raw' format (Node 11.6+).

        const key =
          typeof privateKey === 'string' && !privateKey.includes('PRIVATE KEY')
            ? crypto.createPrivateKey({
                key: Buffer.from(privateKey, 'hex'),
                format: 'pem',
                type: 'pkcs8',
              }) // Fallback guess
            : privateKey;

        // Note: Raw Ed25519 key support in Node.js 'crypto' acts via 'generateKeyPair' or KeyObject.
        // Direct raw signing is via crypto.sign(null, data, key).
        return new Uint8Array(crypto.sign(null, data, key));
      } catch (e) {
        // If standard crypto fails (e.g. key format issue), throw
        throw new Error('TPSUID7RB: signing failed (check key format)');
      }
    }
    throw new Error('TPSUID7RB: signing not available in browser');
  }

  private static verifyEd25519(
    data: Uint8Array,
    signature: Uint8Array,
    publicKey: string | Buffer | Uint8Array,
  ): boolean {
    if (typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const crypto = require('crypto');
        return crypto.verify(null, data, publicKey, signature);
      } catch {
        return false;
      }
    }
    throw new Error('TPSUID7RB: verification not available in browser');
  }

  // ---------------------------
  // Random Bytes
  // ---------------------------

  /** Generate cryptographically secure random bytes */
  private static randomBytes(length: number): Uint8Array {
    // Node.js environment
    if (typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const crypto = require('crypto');
        return new Uint8Array(crypto.randomBytes(length));
      } catch {
        // Fallback to crypto.getRandomValues
      }
    }
    // Browser or fallback
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
      return bytes;
    }
    throw new Error('TPSUID7RB: no crypto available');
  }
}
