/**
 * Julian Calendar Driver
 *
 * Calendar characteristics:
 * - Predecessor to the Gregorian calendar, used until 1582 CE (and later in some regions)
 * - Identical month structure to Gregorian (12 months, same lengths)
 * - Leap year rule: every 4 years (no century exception)
 * - Diverges from Gregorian by ~1 day every 128 years
 *
 * Conversion uses Julian Day Number algorithms.
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from "../index";
export declare class JulianDriver implements CalendarDriver {
    readonly code = "jul";
    readonly name = "Julian Calendar";
    private readonly MONTH_NAMES;
    private readonly MONTH_NAMES_SHORT;
    private readonly DAYS_IN_MONTH;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
    /** Julian leap year: every 4 years, no century exception */
    private isLeapYear;
    private julianToJdn;
    private jdnToJulian;
    /** Gregorian → JDN (for converting incoming Gregorian Date) */
    private gregorianToJdn;
    private jdnToGregorian;
}
