/**
 * Holocene (Human Era) Calendar Driver
 *
 * Calendar characteristics:
 * - Adds 10,000 to the Gregorian year (year 1 CE = 10,001 HE)
 * - Same months, days, and leap year rules as Gregorian
 * - Proposed by Cesare Emiliani in 1993 to encompass all of human history
 * - Also called Human Era (HE) calendar
 *
 * This is a thin wrapper around GregorianDriver with a year offset.
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from "../index";
export declare class HoloceneDriver implements CalendarDriver {
    readonly code = "holo";
    readonly name = "Holocene (Human Era)";
    private readonly gregorian;
    private readonly YEAR_OFFSET;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
