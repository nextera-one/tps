import { CalendarDriver, CalendarMetadata, TPSComponents } from "../types";
/**
 * Unix calendar driver. Represents the epoch timestamp in seconds with
 * fractional milliseconds.
 */
export declare class UnixDriver implements CalendarDriver {
    readonly code: string;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, _format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, _format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
