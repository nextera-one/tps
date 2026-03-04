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
export * from "./types";
export * from "./uid";
export * from "./date";
export { Env } from "./utils/env";
import { CalendarDriver, TPSComponents, TimeOrder } from "./types";
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
    private static _mapGroupsToComponents;
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
