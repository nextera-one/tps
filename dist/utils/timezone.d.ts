/**
 * Timezone Utilities
 *
 * Provides lightweight, zero-dependency helpers for converting between
 * UTC timestamps and local timestamps in a given IANA timezone or
 * fixed UTC offset.
 *
 * Used by `TPS.toDate()` when the parsed extensions include a `tz` key.
 *
 * Examples:
 *   tz=Asia/Tehran   → IANA timezone name
 *   tz=+03:30        → fixed UTC offset
 *   tz=IRST          → abbreviated names (best-effort, common ones mapped)
 */
/**
 * Given a UTC timestamp (ms), returns the equivalent *local* millisecond
 * value for the given `tz` string.
 *
 * This is useful for display: `utcMs + offsetMs` gives local wall-clock time.
 */
export declare function utcToLocal(utcMs: number, tz: string): number;
/**
 * Given a *local* timestamp (ms) in `tz`, returns the equivalent UTC ms.
 *
 * Used when converting a calendar date expressed in local time back to UTC.
 */
export declare function localToUtc(localMs: number, tz: string): number;
/**
 * Returns the UTC offset string (e.g. "+03:30") for a given IANA timezone
 * at the current moment. Useful for formatting and display.
 */
export declare function getOffsetString(tz: string, atUtcMs?: number): string;
