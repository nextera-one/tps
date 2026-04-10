/**
 * TPS calendar driver for canonical TPS time strings.
 *
 * TPS Calendar characteristics:
 * - Epoch anchor: 1999-08-11T07:00:00.000Z
 * - Day boundary: 07:00 Gregorian / UTC
 * - Year shape: 12 months × 4 weeks × 7 days = 336 days
 * - Indexed form: `T:tps.iN[.F]`
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from "../types";
/**
 * TPS calendar driver for canonical TPS time strings.
 *
 * TPS Calendar characteristics:
 * - Epoch anchor: 1999-08-11T07:00:00.000Z
 * - Day boundary: 07:00 Gregorian / UTC
 * - Year shape: 12 months × 4 weeks × 7 days = 336 days
 */
export declare class TpsDriver implements CalendarDriver {
    readonly code = "tps";
    readonly name = "TPS Indexed";
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, _format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, _format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
