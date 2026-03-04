/**
 * TPS calendar driver for canonical TPS time strings.
 *
 * TPS Calendar characteristics:
 * - Epoch: August 11, 1999 (00:00 UTC)
 * - Months: Always 28 days (12 months per year = 336 days)
 * - Time offset: 7 hours ahead of Gregorian (00:00 Gregorian = 07:00 TPS)
 *
 * Conversion process:
 * 1. Apply 7-hour offset to Gregorian date
 * 2. Calculate day-of-year in offset date
 * 3. Convert day-of-year to TPS month/day (each month = 28 days)
 * 4. Preserve millennium/century/year structure
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from "../types";
/**
 * TPS calendar driver for canonical TPS time strings.
 *
 * TPS Calendar characteristics:
 * - Epoch: August 11, 1999 (00:00 UTC)
 * - Months: Always 28 days (12 months per year = 336 days)
 * - Time offset: 7 hours ahead of Gregorian (00:00 Gregorian = 07:00 TPS)
 */
export declare class TpsDriver implements CalendarDriver {
    readonly code = "tps";
    readonly name = "TPS Canonical";
    private readonly TPS_OFFSET_HOURS;
    private readonly TPS_DAYS_PER_MONTH;
    private readonly TPS_MONTHS_PER_YEAR;
    private readonly gregorian;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, _format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, _format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
