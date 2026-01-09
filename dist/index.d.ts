/**
 * TPS: Temporal Positioning System
 * The Universal Protocol for Space-Time Coordinates.
 * @packageDocumentation
 * @version 0.4.2
 * @license Apache-2.0
 * @copyright 2026 TPS Standards Working Group
 */
export type CalendarCode = "greg" | "hij" | "jul" | "holo" | "unix";
export interface TPSComponents {
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
  latitude?: number;
  longitude?: number;
  altitude?: number;
  /** Technical missing data (e.g. server log without GPS) */
  isUnknownLocation?: boolean;
  /** Removed for legal/security reasons (e.g. GDPR) */
  isRedactedLocation?: boolean;
  /** Masked by user preference (e.g. "Don't show my location") */
  isHiddenLocation?: boolean;
  extensions?: Record<string, string>;
}
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
export declare class TPS {
  private static readonly drivers;
  /**
   * Registers a calendar driver plugin.
   * @param driver - The driver instance to register.
   */
  static registerDriver(driver: CalendarDriver): void;
  /**
   * Gets a registered calendar driver.
   * @param code - The calendar code.
   * @returns The driver or undefined.
   */
  static getDriver(code: CalendarCode): CalendarDriver | undefined;
  private static readonly REGEX_URI;
  private static readonly REGEX_TIME;
  static validate(input: string): boolean;
  static parse(input: string): TPSComponents | null;
  /**
   * SERIALIZER: Converts a components object into a full TPS URI.
   * @param comp - The TPS components.
   * @returns Full URI string (e.g. "tps://...").
   */
  static toURI(comp: TPSComponents): string;
  /**
   * CONVERTER: Creates a TPS Time Object string from a JavaScript Date.
   * Supports plugin drivers for non-Gregorian calendars.
   * @param date - The JS Date object (defaults to Now).
   * @param calendar - The target calendar driver (default 'greg').
   * @returns Canonical string (e.g., "T:greg.m3.c1.y26...").
   */
  static fromDate(date?: Date, calendar?: CalendarCode): string;
  /**
   * CONVERTER: Converts a TPS string to a Date in a target calendar format.
   * Uses plugin drivers for cross-calendar conversion.
   * @param tpsString - The source TPS string (any calendar).
   * @param targetCalendar - The target calendar code (e.g., 'hij').
   * @returns A TPS string in the target calendar, or null if invalid.
   */
  static to(targetCalendar: CalendarCode, tpsString: string): string | null;
  /**
   * CONVERTER: Reconstructs a JavaScript Date object from a TPS string.
   * Supports plugin drivers for non-Gregorian calendars.
   * @param tpsString - The TPS string.
   * @returns JS Date object or `null` if invalid.
   */
  static toDate(tpsString: string): Date | null;
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
    format?: string
  ): Partial<TPSComponents> | null;
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
    }
  ): string;
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
    format?: string
  ): string;
  private static _mapGroupsToComponents;
  private static pad;
}
/**
 * Decoded result from TPSUID7RB binary format.
 */
export type TPSUID7RBDecodeResult = {
  /** Version identifier */
  version: "tpsuid7rb";
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
export declare class TPSUID7RB {
  /** Magic bytes: "TPU7" */
  private static readonly MAGIC;
  /** Version 1 */
  private static readonly VER;
  /** String prefix for base64url encoded form */
  private static readonly PREFIX;
  /** Regex for validating base64url encoded form */
  static readonly REGEX: RegExp;
  /**
   * Encode TPS string to binary bytes (Uint8Array).
   * This is the canonical form for hashing, signing, and storage.
   *
   * @param tps - The TPS string to encode
   * @param opts - Encoding options (compress, epochMs override)
   * @returns Binary TPS-UID as Uint8Array
   */
  static encodeBinary(tps: string, opts?: TPSUID7RBEncodeOptions): Uint8Array;
  /**
   * Decode binary bytes back to original TPS string.
   *
   * @param bytes - Binary TPS-UID
   * @returns Decoded result with original TPS string
   */
  static decodeBinary(bytes: Uint8Array): TPSUID7RBDecodeResult;
  /**
   * Encode TPS to base64url string with prefix.
   * This is the transport/storage form.
   *
   * @param tps - The TPS string to encode
   * @param opts - Encoding options
   * @returns Base64url encoded TPS-UID with prefix
   */
  static encodeBinaryB64(tps: string, opts?: TPSUID7RBEncodeOptions): string;
  /**
   * Decode base64url string back to original TPS string.
   *
   * @param id - Base64url encoded TPS-UID with prefix
   * @returns Decoded result with original TPS string
   */
  static decodeBinaryB64(id: string): TPSUID7RBDecodeResult;
  /**
   * Validate base64url encoded TPS-UID format.
   * Note: This validates shape only; binary decode is authoritative.
   *
   * @param id - String to validate
   * @returns true if format is valid
   */
  static validateBinaryB64(id: string): boolean;
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
  }): string;
  /**
   * Generate a TPS string from a Date and optional location.
   */
  private static generateTPSString;
  /**
   * Parse epoch milliseconds from a TPS string.
   * Supports both URI format (tps://...) and time-only format (T:greg...)
   */
  static epochMsFromTPSString(tps: string): number;
  /** Write 48-bit unsigned integer (big-endian) */
  private static writeU48;
  /** Read 48-bit unsigned integer (big-endian) */
  private static readU48;
  /** Encode unsigned integer as LEB128 varint */
  private static uvarintEncode;
  /** Decode LEB128 varint */
  private static uvarintDecode;
  /** Encode bytes to base64url (no padding) */
  private static base64UrlEncode;
  /** Decode base64url to bytes */
  private static base64UrlDecode;
  /** Compress using zlib deflate raw */
  private static deflateRaw;
  /** Decompress using zlib inflate raw */
  private static inflateRaw;
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
    opts?: TPSUID7RBEncodeOptions
  ): Uint8Array;
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
    publicKey: string | Buffer | Uint8Array
  ): TPSUID7RBDecodeResult;
  private static signEd25519;
  private static verifyEd25519;
  /** Generate cryptographically secure random bytes */
  private static randomBytes;
}
