/**
 * TPS calendar driver for canonical TPS time strings.
 *
 * TPS Calendar characteristics:
 * - Epoch: August 11, 1999 (00:00 UTC)
 * - Months: Always 28 days (13 months per year = 364 days)
 * - Time offset: 7 hours ahead of Gregorian (00:00 Gregorian = 07:00 TPS)
 *
 * Conversion process:
 * 1. Apply 7-hour offset to Gregorian date
 * 2. Calculate day-of-year in offset date
 * 3. Convert day-of-year to TPS month/day (each month = 28 days)
 * 4. Preserve millennium/century/year structure
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from '../index';
export declare class TpsDriver implements CalendarDriver {
    readonly code = "tps";
    readonly name = "TPS Canonical";
    private readonly TPS_EPOCH;
    private readonly TPS_OFFSET_HOURS;
    private readonly TPS_DAYS_PER_MONTH;
    private readonly TPS_MONTHS_PER_YEAR;
    private readonly gregorian;
    /**
     * Converts a Gregorian Date to TPS components.
     * Applies 7-hour offset and converts day-of-year to TPS month/day (28-day months).
     */
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    /**
     * Converts TPS components to a Gregorian Date.
     * Converts TPS month/day (28-day months) to day-of-year, then removes 7-hour offset.
     */
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    /**
     * Parse a TPS date string: "YYYY-MM-DD" where MM is 01-13, DD is 01-28.
     * Optional time: "YYYY-MM-DD HH:MM:SS.mmm"
     */
    parseDate(input: string, format?: string): Partial<TPSComponents>;
    /**
     * Format TPS components to "YYYY-MM-DD" where MM is 01-13, DD is 01-28.
     * With time: "YYYY-MM-DD THH:MM:SS.mmm"
     */
    format(components: Partial<TPSComponents>, format?: string): string;
    /**
     * Validate TPS date string or components.
     * TPS has months 1-13, each with 28 days.
     */
    validate(input: string | Partial<TPSComponents>): boolean;
    /**
     * Get TPS calendar metadata.
     * TPS has 12 months, each with 28 days.
     */
    getMetadata(): CalendarMetadata;
}
