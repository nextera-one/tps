import { TPSComponents, TimeOrder } from "../types";
/**
 * Generate the canonical `T:` time string for a set of components.
 */
export declare function buildTimePart(comp: TPSComponents): string;
/**
 * Parse the time portion of a TPS string into components.
 */
export declare function parseTimeString(input: string): {
    components: Partial<TPSComponents>;
    order: TimeOrder;
} | null;
