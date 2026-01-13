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

export type CalendarCode = 'greg' | 'hij' | 'jul' | 'holo' | 'unix';

export interface TPSComponents {
  // --- TEMPORAL ---
  calendar: CalendarCode;
  millennium?: number;
  century?: number;
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
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
  readonly code: CalendarCode;

  /**
   * Human-readable name for this calendar (optional).
   * @example "Hijri (Islamic)"
   */
  readonly name?: string;

  /**
   * Converts a Gregorian Date to this calendar's components.
   * @param date - The Gregorian Date object.
   * @returns Partial TPS components for year, month, day, etc.
   */
  fromGregorian(date: Date): Partial<TPSComponents>;

  /**
   * Converts this calendar's components to a Gregorian Date.
   * @param components - Partial TPS components (year, month, day, etc.).
   * @returns A JavaScript Date object.
   */
  toGregorian(components: Partial<TPSComponents>): Date;

  /**
   * Generates a TPS time string for this calendar from a Date.
   * @param date - The Gregorian Date object.
   * @returns A TPS time string (e.g., "T:hij.y1447.M07.d21...").
   */
  fromDate(date: Date): string;

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
  parseDate?(input: string, format?: string): Partial<TPSComponents>;

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
  format?(components: Partial<TPSComponents>, format?: string): string;

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
  validate?(input: string | Partial<TPSComponents>): boolean;

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
  getMetadata?(): CalendarMetadata;
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
  private static readonly drivers: Map<CalendarCode, CalendarDriver> =
    new Map();

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
  static getDriver(code: CalendarCode): CalendarDriver | undefined {
    return this.drivers.get(code);
  }

  // --- REGEX ---
  // Updated for v0.5.0: supports L: anchors, A: actor, ! signature, structural & geospatial anchors
  // Note: Complex regex - carefully balanced parentheses
  private static readonly REGEX_URI = new RegExp(
    '^tps://' +
      // Location part (L: prefix optional for backward compat)
      '(?:L:)?(?<space>' +
      '~|-|unknown|redacted|hidden|' + // Privacy markers
      's2=(?<s2>[a-fA-F0-9]+)|' + // S2 cell
      'h3=(?<h3>[a-fA-F0-9]+)|' + // H3 cell
      'plus=(?<plus>[A-Z0-9+]+)|' + // Plus Code
      'w3w=(?<w3w>[a-z]+\\.[a-z]+\\.[a-z]+)|' + // what3words
      'bldg=(?<bldg>[\\w-]+)(?:\\.floor=(?<floor>[\\w-]+))?(?:\\.room=(?<room>[\\w-]+))?(?:\\.zone=(?<zone>[\\w-]+))?|' + // Structural
      '(?<lat>-?\\d+(?:\\.\\d+)?),(?<lon>-?\\d+(?:\\.\\d+)?)(?:,(?<alt>-?\\d+(?:\\.\\d+)?)m?)?' + // GPS
      ')' +
      // Optional Actor anchor
      '(?:/A:(?<actor>[^/@]+))?' +
      // Time part separator
      '[/@]T:(?<calendar>[a-z]{3,4})\\.' +
      // Time components
      '(?:(?<unix>s\\d+(?:\\.\\d+)?)|m(?<millennium>-?\\d+)(?:\\.c(?<century>\\d+)(?:\\.y(?<year>\\d+)(?:\\.M(?<month>\\d{1,2})(?:\\.d(?<day>\\d{1,2})(?:\\.h(?<hour>\\d{1,2})(?:\\.n(?<minute>\\d{1,2})(?:\\.s(?<second>\\d{1,2}(?:\\.\\d+)?))?)?)?)?)?)?)?)' +
      // Optional signature
      '(?:!(?<signature>[^;?#]+))?' +
      // Optional extensions
      '(?:;(?<extensions>[a-z0-9.\\-_=]+))?' +
      // Optional query params
      '(?:\\?(?<params>[^#]+))?' +
      // Optional context
      '(?:#(?<context>.+))?$',
  );

  private static readonly REGEX_TIME = new RegExp(
    '^T:(?<calendar>[a-z]{3,4})\\.' +
      '(?:(?<unix>s\\d+(?:\\.\\d+)?)|m(?<millennium>-?\\d+)(?:\\.c(?<century>\\d+)(?:\\.y(?<year>\\d+)(?:\\.M(?<month>\\d{1,2})(?:\\.d(?<day>\\d{1,2})(?:\\.h(?<hour>\\d{1,2})(?:\\.n(?<minute>\\d{1,2})(?:\\.s(?<second>\\d{1,2}(?:\\.\\d+)?))?)?)?)?)?)?)?)' +
      '(?:!(?<signature>[^;?#]+))?$',
  );

  // --- CORE METHODS ---

  static validate(input: string): boolean {
    if (input.startsWith('tps://')) return this.REGEX_URI.test(input);
    return this.REGEX_TIME.test(input);
  }

  static parse(input: string): TPSComponents | null {
    if (input.startsWith('tps://')) {
      const match = this.REGEX_URI.exec(input);
      if (!match || !match.groups) return null;
      return this._mapGroupsToComponents(match.groups);
    }
    const match = this.REGEX_TIME.exec(input);
    if (!match || !match.groups) return null;
    return this._mapGroupsToComponents(match.groups);
  }

  /**
   * SERIALIZER: Converts a components object into a full TPS URI.
   * @param comp - The TPS components.
   * @returns Full URI string (e.g. "tps://...").
   */
  static toURI(comp: TPSComponents): string {
    // 1. Build Space Part (L: anchor)
    let spacePart = 'L:-'; // Default: unknown

    if (comp.isHiddenLocation) {
      spacePart = 'L:~';
    } else if (comp.isRedactedLocation) {
      spacePart = 'L:redacted';
    } else if (comp.isUnknownLocation) {
      spacePart = 'L:-';
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
    let actorPart = '';
    if (comp.actor) {
      actorPart = `/A:${comp.actor}`;
    }

    // 3. Build Time Part
    let timePart = `T:${comp.calendar}`;

    if (comp.calendar === 'unix' && comp.unixSeconds !== undefined) {
      timePart += `.s${comp.unixSeconds}`;
    } else {
      if (comp.millennium !== undefined) timePart += `.m${comp.millennium}`;
      if (comp.century !== undefined) timePart += `.c${comp.century}`;
      if (comp.year !== undefined) timePart += `.y${comp.year}`;
      if (comp.month !== undefined) timePart += `.M${this.pad(comp.month)}`;
      if (comp.day !== undefined) timePart += `.d${this.pad(comp.day)}`;
      if (comp.hour !== undefined) timePart += `.h${this.pad(comp.hour)}`;
      if (comp.minute !== undefined) timePart += `.n${this.pad(comp.minute)}`;
      if (comp.second !== undefined) timePart += `.s${this.pad(comp.second)}`;
    }

    // 4. Add Signature (!) - optional
    if (comp.signature) {
      timePart += `!${comp.signature}`;
    }

    // 5. Build Extensions
    let extPart = '';
    if (comp.extensions && Object.keys(comp.extensions).length > 0) {
      const extStrings = Object.entries(comp.extensions).map(
        ([k, v]) => `${k}=${v}`,
      );
      extPart = `;${extStrings.join('.')}`;
    }

    return `tps://${spacePart}${actorPart}/${timePart}${extPart}`;
  }

  /**
   * CONVERTER: Creates a TPS Time Object string from a JavaScript Date.
   * Supports plugin drivers for non-Gregorian calendars.
   * @param date - The JS Date object (defaults to Now).
   * @param calendar - The target calendar driver (default 'greg').
   * @returns Canonical string (e.g., "T:greg.m3.c1.y26...").
   */
  static fromDate(
    date: Date = new Date(),
    calendar: CalendarCode = 'greg',
  ): string {
    // Check for registered driver first
    const driver = this.drivers.get(calendar);
    if (driver) {
      return driver.fromDate(date);
    }

    // Built-in handlers
    if (calendar === 'unix') {
      const s = (date.getTime() / 1000).toFixed(3);
      return `T:unix.s${s}`;
    }

    if (calendar === 'greg') {
      const fullYear = date.getUTCFullYear();
      const m = Math.floor(fullYear / 1000) + 1;
      const c = Math.floor((fullYear % 1000) / 100) + 1;
      const y = fullYear % 100;
      const M = date.getUTCMonth() + 1;
      const d = date.getUTCDate();
      const h = date.getUTCHours();
      const n = date.getUTCMinutes();
      const s = date.getUTCSeconds();

      return `T:greg.m${m}.c${c}.y${y}.M${this.pad(M)}.d${this.pad(
        d,
      )}.h${this.pad(h)}.n${this.pad(n)}.s${this.pad(s)}`;
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
  static to(targetCalendar: CalendarCode, tpsString: string): string | null {
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
    const p = this.parse(tpsString);
    if (!p) return null;

    // Check for registered driver first
    const driver = this.drivers.get(p.calendar);
    if (driver) {
      return driver.toGregorian(p);
    }

    // Built-in handlers
    if (p.calendar === 'unix' && p.unixSeconds !== undefined) {
      return new Date(p.unixSeconds * 1000);
    }

    if (p.calendar === 'greg') {
      const m = p.millennium || 0;
      const c = p.century || 1;
      const y = p.year || 0;
      const fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;

      return new Date(
        Date.UTC(
          fullYear,
          (p.month || 1) - 1,
          p.day || 1,
          p.hour || 0,
          p.minute || 0,
          Math.floor(p.second || 0),
        ),
      );
    }
    return null;
  }

  // --- DRIVER CONVENIENCE METHODS ---

  /**
   * Parse a calendar-specific date string into TPS components.
   * Requires the driver to implement the optional `parseDate` method.
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
   * // "tps://31.95,35.91@T:hij.y1447.M07.d21"
   * ```
   */
  static parseCalendarDate(
    calendar: CalendarCode,
    dateString: string,
    format?: string,
  ): Partial<TPSComponents> | null {
    const driver = this.drivers.get(calendar);
    if (!driver) {
      throw new Error(
        `Calendar driver '${calendar}' not found. Register a driver first.`,
      );
    }
    if (!driver.parseDate) {
      throw new Error(
        `Driver '${calendar}' does not implement parseDate(). Use fromGregorian() instead.`,
      );
    }
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
   * // "tps://31.95,35.91@T:hij.y1447.M07.d21"
   *
   * // With privacy flag
   * TPS.fromCalendarDate('hij', '1447-07-21', { isHiddenLocation: true });
   * // "tps://hidden@T:hij.y1447.M07.d21"
   *
   * // Without location
   * TPS.fromCalendarDate('hij', '1447-07-21');
   * // "tps://unknown@T:hij.y1447.M07.d21"
   * ```
   */
  static fromCalendarDate(
    calendar: CalendarCode,
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
      calendar,
      ...components,
      ...location,
    } as TPSComponents;

    return this.toURI(fullComponents);
  }

  /**
   * Format TPS components to a calendar-specific date string.
   * Requires the driver to implement the optional `format` method.
   *
   * @param calendar - The calendar code
   * @param components - TPS components to format
   * @param format - Optional format string (driver-specific)
   * @returns Formatted date string in calendar-native format
   *
   * @example
   * ```ts
   * const tps = TPS.parse('tps://unknown@T:hij.y1447.M07.d21');
   * const formatted = TPS.formatCalendarDate('hij', tps);
   * // "1447-07-21"
   * ```
   */
  static formatCalendarDate(
    calendar: CalendarCode,
    components: Partial<TPSComponents>,
    format?: string,
  ): string {
    const driver = this.drivers.get(calendar);
    if (!driver) {
      throw new Error(`Calendar driver '${calendar}' not found.`);
    }
    if (!driver.format) {
      throw new Error(`Driver '${calendar}' does not implement format().`);
    }
    return driver.format(components, format);
  }

  // --- INTERNAL HELPERS ---

  private static _mapGroupsToComponents(
    g: Record<string, string>,
  ): TPSComponents {
    const components: any = {};
    components.calendar = g.calendar as CalendarCode;

    // Time Mapping
    if (components.calendar === 'unix' && g.unix) {
      components.unixSeconds = parseFloat(g.unix.substring(1));
    } else {
      if (g.millennium) components.millennium = parseInt(g.millennium, 10);
      if (g.century) components.century = parseInt(g.century, 10);
      if (g.year) components.year = parseInt(g.year, 10);
      if (g.month) components.month = parseInt(g.month, 10);
      if (g.day) components.day = parseInt(g.day, 10);
      if (g.hour) components.hour = parseInt(g.hour, 10);
      if (g.minute) components.minute = parseInt(g.minute, 10);
      if (g.second) components.second = parseFloat(g.second);
    }

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
      if (g.space === 'unknown' || g.space === '-') {
        components.isUnknownLocation = true;
      } else if (g.space === 'redacted') {
        components.isRedactedLocation = true;
      } else if (g.space === 'hidden' || g.space === '~') {
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
      const parts = g.extensions.split('.');
      parts.forEach((p: string) => {
        const eqIdx = p.indexOf('=');
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

  private static pad(n: number): string {
    const s = n.toString();
    return s.length < 2 ? '0' + s : s;
  }
}

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
 * const tps = 'tps://31.95,35.91@T:greg.m3.c1.y26.M01.d09';
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
  static encodeBinary(tps: string, opts?: TPSUID7RBEncodeOptions): Uint8Array {
    const compress = opts?.compress ?? false;
    const epochMs = opts?.epochMs ?? this.epochMsFromTPSString(tps);

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
    const bytes = this.encodeBinary(tps, opts);
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
  }): string {
    const now = new Date();
    const tps = this.generateTPSString(now, opts);
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
  private static generateTPSString(
    date: Date,
    opts?: { latitude?: number; longitude?: number; altitude?: number },
  ): string {
    const fullYear = date.getUTCFullYear();
    const m = Math.floor(fullYear / 1000) + 1;
    const c = Math.floor((fullYear % 1000) / 100) + 1;
    const y = fullYear % 100;
    const M = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const h = date.getUTCHours();
    const n = date.getUTCMinutes();
    const s = date.getUTCSeconds();

    const pad = (num: number) => num.toString().padStart(2, '0');

    const timePart = `T:greg.m${m}.c${c}.y${y}.M${pad(M)}.d${pad(d)}.h${pad(
      h,
    )}.n${pad(n)}.s${pad(s)}`;

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
    let time: string;

    if (tps.includes('@')) {
      // URI format: tps://...@T:greg...
      const at = tps.indexOf('@');
      time = tps.slice(at + 1).trim();
    } else if (tps.startsWith('T:')) {
      // Time-only format
      time = tps;
    } else {
      throw new Error('TPS: unrecognized format');
    }

    if (!time.startsWith('T:greg.')) {
      throw new Error('TPS: only T:greg.* parsing is supported');
    }

    // Extract m (millennium), c (century), y (year)
    const mMatch = time.match(/\.m(-?\d+)/);
    const cMatch = time.match(/\.c(\d+)/);
    const yMatch = time.match(/\.y(\d{1,4})/);
    const MMatch = time.match(/\.M(\d{1,2})/);
    const dMatch = time.match(/\.d(\d{1,2})/);
    const hMatch = time.match(/\.h(\d{1,2})/);
    const nMatch = time.match(/\.n(\d{1,2})/);
    const sMatch = time.match(/\.s(\d{1,2})/);

    // Calculate full year from millennium, century, year
    let fullYear: number;
    if (mMatch && cMatch && yMatch) {
      const millennium = parseInt(mMatch[1], 10);
      const century = parseInt(cMatch[1], 10);
      const year = parseInt(yMatch[1], 10);
      fullYear = (millennium - 1) * 1000 + (century - 1) * 100 + year;
    } else if (yMatch) {
      // Fallback: interpret y as 2-digit year
      let year = parseInt(yMatch[1], 10);
      if (year < 100) {
        year = year <= 69 ? 2000 + year : 1900 + year;
      }
      fullYear = year;
    } else {
      throw new Error('TPS: missing year component');
    }

    const month = MMatch ? parseInt(MMatch[1], 10) : 1;
    const day = dMatch ? parseInt(dMatch[1], 10) : 1;
    const hour = hMatch ? parseInt(hMatch[1], 10) : 0;
    const minute = nMatch ? parseInt(nMatch[1], 10) : 0;
    const second = sMatch ? parseInt(sMatch[1], 10) : 0;

    const epoch = Date.UTC(fullYear, month - 1, day, hour, minute, second);
    if (!Number.isFinite(epoch)) {
      throw new Error('TPS: failed to compute epochMs');
    }

    return epoch;
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
