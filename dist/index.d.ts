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
export * from "./types";
export * from "./uid";
export * from "./date";
export { Env } from "./utils/env";
export { DriverManager } from "./driver-manager";
export { utcToLocal, localToUtc, getOffsetString } from "./utils/timezone";
import { DriverManager } from "./driver-manager";
import { CalendarDriver, TPSComponents, TimeOrder } from "./types";
export declare class TPS {
    /** Shared DriverManager instance — use TPS.driverManager for direct access. */
    static readonly driverManager: DriverManager;
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
    static now(calendar?: string, opts?: {
        order?: TimeOrder;
    }): string;
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
    static diff(t1: string, t2: string): number;
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
    static add(tpsStr: string, duration: {
        days?: number;
        hours?: number;
        minutes?: number;
        seconds?: number;
        milliseconds?: number;
    }): string | null;
    private static _mapGroupsToComponents;
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
    private static _parseLocationLayers;
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
