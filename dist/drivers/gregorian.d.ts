import { CalendarDriver, TPSComponents, CalendarMetadata } from '../index';
/**
 * Gregorian calendar driver.
 * This mirrors the built-in logic that used to live in `TPS.fromDate`/`toDate`
 * and provides implementations for the full `CalendarDriver` interface.
 * The driver also implements the optional helpers, enabling unit tests to
 * exercise `parseDate`, `format`, `validate`, and `getMetadata`.
 */
export declare class GregorianDriver implements CalendarDriver {
    readonly code: string;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
