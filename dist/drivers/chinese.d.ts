/**
 * Chinese Lunisolar Calendar Driver
 *
 * Calendar characteristics:
 * - Traditional lunisolar calendar (月 months follow lunar phases, years follow solar)
 * - Year expressed as Sexagenary (干支 Ganzhi) cycle: 60-year repeating pattern
 * - Also expressed relative to the legendary emperor Huangdi (epoch ~2698 BCE)
 * - Months: 12 or 13 (leap month / 闰月 rùnyuè in some years)
 * - This implementation uses a simplified tabular algorithm accurate from ~1900–2100
 *
 * Data source: Pre-computed month start Julian Day Numbers for 1900–2100
 * based on the Hong Kong Observatory almanac algorithm.
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from "../types";
export declare class ChineseDriver implements CalendarDriver {
    readonly code = "chin";
    readonly name = "Chinese Lunisolar";
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, _format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
