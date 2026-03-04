import { CalendarDriver, CalendarMetadata, TPSComponents } from "../types";
/**
 * Gregorian calendar driver.
 * Supports robust validation and canonical Date conversions.
 */
export declare class GregorianDriver implements CalendarDriver {
    readonly code: string;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, format?: string): string;
    private isLeap;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
