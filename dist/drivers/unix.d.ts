import { CalendarDriver, TPSComponents, CalendarMetadata } from "../index";
/**
 * Unix calendar driver.  Represents the epoch timestamp in seconds with
 * fractional milliseconds.  This mirrors the built-in `CalendarCode.UNIX`
 * behaviour that was previously hard-coded in TPS.
 */
export declare class UnixDriver implements CalendarDriver {
    readonly code: string;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
