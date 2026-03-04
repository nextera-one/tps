/**
 * Hijri (Islamic) Calendar Driver — Tabular / Arithmetic variant
 *
 * Calendar characteristics:
 * - Lunar calendar with 12 months of alternating 30/29 days
 * - 30-year cycle with 11 leap years (Dhul Hijjah gains a day)
 * - Year 1 AH ≈ 16 July 622 CE (Julian)
 * - Average year ≈ 354.36667 days
 *
 * This uses the Tabular Islamic Calendar (civil/Type II-A) algorithm
 * based on the formulas from Meeus "Astronomical Algorithms".
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from "../types";
export declare class HijriDriver implements CalendarDriver {
    readonly code = "hij";
    readonly name = "Hijri (Islamic Calendar)";
    private readonly MONTH_NAMES;
    private readonly MONTH_NAMES_SHORT;
    private readonly DAY_NAMES;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
