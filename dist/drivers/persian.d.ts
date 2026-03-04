/**
 * Persian (Jalali / Solar Hijri) Calendar Driver
 *
 * Calendar characteristics:
 * - Solar calendar used in Iran and Afghanistan
 * - Year 1 started in 622 CE (same epoch as Islamic Hijri, but solar-based)
 * - 6 months of 31 days, 5 months of 30 days, 1 month of 29 (30 in leap)
 * - Current year ≈ Gregorian year − 621
 *
 * Conversion uses Julian Day Number algorithms based on jalaali-js.
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from "../index";
export declare class PersianDriver implements CalendarDriver {
    readonly code = "per";
    readonly name = "Persian (Jalali/Solar Hijri)";
    private readonly MONTH_NAMES;
    private readonly MONTH_NAMES_SHORT;
    private readonly DAY_NAMES;
    /** Days per month (non-leap): 6×31 + 5×30 + 1×29 = 365 */
    private readonly DAYS_IN_MONTH;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
    private isLeapYear;
    private gregorianToJdn;
    private jdnToGregorian;
    private persianToJdn;
    private jdnToPersian;
}
