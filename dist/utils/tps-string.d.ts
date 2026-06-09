import { TPSComponents, TimeOrder, TPSTimeOptions } from "../types.js";
/**
 * Generate the canonical `T:` time string for a set of components.
 */
export declare function buildTimePart(comp: Partial<TPSComponents>, options?: TPSTimeOptions): string;
/**
 * Parse the time portion of a TPS string into components.
 */
export declare function parseTimeString(input: string): {
    components: Partial<TPSComponents>;
    order: TimeOrder;
} | null;
