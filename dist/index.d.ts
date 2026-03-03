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
export declare const DefaultCalendars: {
    readonly TPS: "tps";
    readonly GREG: "greg";
    readonly HIJ: "hij";
    readonly JUL: "jul";
    readonly HOLO: "holo";
    readonly UNIX: "unix";
};
/**
 * Specifies the direction of the time-component hierarchy when serializing or
 * deserializing a TPS string.  The default is `'descending'` (millennium → … →
 * second), but `'ascending'` produces the reverse order.
 */
export declare enum TimeOrder {
    DESC = "desc",
    ASC = "asc"
}
export interface TPSComponents {
    calendar: string;
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
    unixSeconds?: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    /** Google S2 cell ID (hierarchical, prefix-searchable) */
    s2Cell?: string;
    /** Uber H3 cell ID (hexagonal grid) */
    h3Cell?: string;
    /** Open Location Code / Plus Code */
    plusCode?: string;
    /** what3words address (e.g. "filled.count.soap") */
    what3words?: string;
    /** Physical building identifier */
    building?: string;
    /** Vertical division (level) */
    floor?: string;
    /** Enclosed space identifier */
    room?: string;
    /** Logical area within building */
    zone?: string;
    /** Raw pre-@ space anchor (e.g. adm:city:SA:riyadh, node:api-1, net:ip4:203.0.113.10) */
    spaceAnchor?: string;
    /** Technical missing data (e.g. server log without GPS) */
    isUnknownLocation?: boolean;
    /** Removed for legal/security reasons (e.g. GDPR) */
    isRedactedLocation?: boolean;
    /** Masked by user preference (e.g. "Don't show my location") */
    isHiddenLocation?: boolean;
    /** Actor anchor - identifies observer/witness (e.g. "did:web:sensor.example.com", "node:gateway-01") */
    actor?: string;
    /** Verification hash appended to time (e.g. "sha256:8f3e2a...") */
    signature?: string;
    extensions?: Record<string, string>;
    order?: TimeOrder;
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
    static getDriver(code: string): CalendarDriver | undefined;
    private static readonly REGEX_URI;
    private static readonly REGEX_TIME;
    /**
     * SANITIZER: Normalises a raw TPS input string before validation.
     *
     * Pure string-based — no parsing into components, no regex beyond simple
     * character checks, no re-serialisation via buildTimePart / toURI.
     *
     * Token ranks (descending): m(8) c(7) y(6) m(5) d(4) h(3) m(2) s(1) m(0)
     */
    static sanitizeTimeInput(input: string): string;
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
     * @param calendar - The target calendar driver (default `"tps"`).
     * @param opts - Optional parameters; for built-in calendars the only
     *   supported key is `order` which may be `'ascending'` or `'descending'`.
     * @returns Canonical string (e.g., "T:tps.m3.c1.y26...").
     */
    static fromDate(date?: Date, calendar?: string, opts?: {
        order?: TimeOrder;
    }): string;
    /**
     * CONVERTER: Converts a TPS string to a Date in a target calendar format.
     * Uses plugin drivers for cross-calendar conversion.
     * @param tpsString - The source TPS string (any calendar).
     * @param targetCalendar - The target calendar code (e.g., 'hij').
     * @returns A TPS string in the target calendar, or null if invalid.
     */
    static to(targetCalendar: string, tpsString: string): string | null;
    /**
     * CONVERTER: Reconstructs a JavaScript Date object from a TPS string.
     * Supports plugin drivers for non-Gregorian calendars.
     * @param tpsString - The TPS string.
     * @returns JS Date object or `null` if invalid.
     */
    static toDate(tpsString: string): Date | null;
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
    static parseCalendarDate(calendar: string, dateString: string, format?: string): Partial<TPSComponents> | null;
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
    static fromCalendarDate(calendar: string, dateString: string, location?: {
        latitude?: number;
        longitude?: number;
        altitude?: number;
        isUnknownLocation?: boolean;
        isHiddenLocation?: boolean;
        isRedactedLocation?: boolean;
    }): string;
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
    static formatCalendarDate(calendar: string, components: Partial<TPSComponents>, format?: string): string;
    /**
     * Generate the canonical `T:` time string for a set of components.  The
     * `order` field (or `comp.order`) controls whether tokens are emitted in
     * ascending or descending hierarchy; if undefined the default
     * `'descending'` orientation is used.
     *
     * Drivers may ignore this helper and produce their own time strings if they
     * implement custom ordering logic.
     */
    static buildTimePart(comp: TPSComponents): string;
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
    static parseTimeString(input: string): {
        components: Partial<TPSComponents>;
        order: TimeOrder;
    } | null;
    private static _mapGroupsToComponents;
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
        order?: TimeOrder;
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
    static seal(tps: string, privateKey: string | Buffer | Uint8Array, opts?: TPSUID7RBEncodeOptions): Uint8Array;
    /**
     * Verify a sealed TPS-UID and decode it.
     * Throws if signature is invalid or not sealed.
     *
     * @param sealedBytes - The binary sealed TPS-UID
     * @param publicKey - Ed25519 public key (hex or buffer) to verify against
     * @returns Decoded result
     */
    static verifyAndDecode(sealedBytes: Uint8Array, publicKey: string | Buffer | Uint8Array): TPSUID7RBDecodeResult;
    private static signEd25519;
    private static verifyEd25519;
    /** Generate cryptographically secure random bytes */
    private static randomBytes;
}
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
export declare class TpsDate {
    private readonly internal;
    private getTpsComponents;
    private getTpsFullYear;
    constructor();
    constructor(value: string | number | Date | TpsDate);
    constructor(year: number, monthIndex: number, day?: number, hours?: number, minutes?: number, seconds?: number, ms?: number);
    private static looksLikeTPS;
    static now(): number;
    static parse(input: string): number;
    static UTC(year: number, monthIndex: number, day?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
    static fromTPS(tps: string): TpsDate;
    toGregorianDate(): Date;
    toDate(): Date;
    toTPS(calendar?: string, opts?: {
        order?: TimeOrder;
    }): string;
    toTPSURI(calendar?: string, opts?: {
        order?: TimeOrder;
        latitude?: number;
        longitude?: number;
        altitude?: number;
        isUnknownLocation?: boolean;
        isHiddenLocation?: boolean;
        isRedactedLocation?: boolean;
    }): string;
    getTime(): number;
    valueOf(): number;
    toString(): string;
    toISOString(): string;
    toUTCString(): string;
    toJSON(): string | null;
    getFullYear(): number;
    getUTCFullYear(): number;
    getMonth(): number;
    getUTCMonth(): number;
    getDate(): number;
    getUTCDate(): number;
    getHours(): number;
    getUTCHours(): number;
    getMinutes(): number;
    getUTCMinutes(): number;
    getSeconds(): number;
    getUTCSeconds(): number;
    getMilliseconds(): number;
    getUTCMilliseconds(): number;
    [Symbol.toPrimitive](hint: string): string | number;
}
