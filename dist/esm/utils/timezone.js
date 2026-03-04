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
/** Map of common abbreviated timezone names to IANA names. */
const TZ_ABBR = {
    // Middle East
    IRST: "Asia/Tehran",
    IRDT: "Asia/Tehran",
    AST: "Asia/Riyadh",
    AST3: "Asia/Riyadh",
    // Europe
    CET: "Europe/Paris",
    CEST: "Europe/Paris",
    EET: "Europe/Athens",
    EEST: "Europe/Athens",
    WET: "Europe/Lisbon",
    WEST: "Europe/Lisbon",
    // Americas
    EST: "America/New_York",
    EDT: "America/New_York",
    CST: "America/Chicago",
    CDT: "America/Chicago",
    MST: "America/Denver",
    MDT: "America/Denver",
    PST: "America/Los_Angeles",
    PDT: "America/Los_Angeles",
    // Asia Pacific
    JST: "Asia/Tokyo",
    KST: "Asia/Seoul",
    IST: "Asia/Kolkata",
    CST8: "Asia/Shanghai",
    AEST: "Australia/Sydney",
    AEDT: "Australia/Sydney",
    // UTC variants
    UTC: "UTC",
    GMT: "UTC",
    Z: "UTC",
};
/**
 * Parse a `tz` string into an IANA timezone name, or return null if unrecognized.
 */
function resolveIANA(tz) {
    if (!tz)
        return null;
    // Direct IANA name (e.g. "Asia/Tehran")
    if (tz.includes("/"))
        return tz;
    // Common abbreviation lookup
    const abbr = TZ_ABBR[tz.toUpperCase()];
    if (abbr)
        return abbr;
    return null;
}
/**
 * Parses a fixed offset string like "+03:30", "-05:00", "+0530" into ms.
 * Returns NaN if the string is not a valid offset.
 */
function parseFixedOffset(tz) {
    const m = tz.match(/^([+-])(\d{1,2}):?(\d{2})$/);
    if (!m)
        return NaN;
    const sign = m[1] === "+" ? 1 : -1;
    const h = parseInt(m[2], 10);
    const min = parseInt(m[3], 10);
    return sign * (h * 60 + min) * 60000;
}
/**
 * Returns the UTC offset in milliseconds for a given IANA timezone at a
 * specific UTC moment. Uses `Intl.DateTimeFormat` for correctness.
 *
 * Returns 0 (UTC) if the timezone is unrecognised by the runtime.
 */
function getIANAOffsetMs(ianaName, atUtcMs) {
    try {
        // Build a formatter that reports both UTC and local time parts
        const fmt = new Intl.DateTimeFormat("en-US", {
            timeZone: ianaName,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
        const parts = Object.fromEntries(fmt.formatToParts(new Date(atUtcMs)).map((p) => [p.type, p.value]));
        // Reconstruct the local time as UTC
        const localMs = Date.UTC(parseInt(parts.year), parseInt(parts.month) - 1, parseInt(parts.day), parseInt(parts.hour === "24" ? "0" : parts.hour), parseInt(parts.minute), parseInt(parts.second));
        return localMs - atUtcMs;
    }
    catch {
        return 0;
    }
}
/**
 * Given a UTC timestamp (ms), returns the equivalent *local* millisecond
 * value for the given `tz` string.
 *
 * This is useful for display: `utcMs + offsetMs` gives local wall-clock time.
 */
export function utcToLocal(utcMs, tz) {
    // Try fixed offset first (e.g. "+03:30")
    const fixed = parseFixedOffset(tz);
    if (!isNaN(fixed))
        return utcMs + fixed;
    const iana = resolveIANA(tz);
    if (!iana)
        return utcMs; // Unknown tz — return UTC unchanged
    return utcMs + getIANAOffsetMs(iana, utcMs);
}
/**
 * Given a *local* timestamp (ms) in `tz`, returns the equivalent UTC ms.
 *
 * Used when converting a calendar date expressed in local time back to UTC.
 */
export function localToUtc(localMs, tz) {
    // Try fixed offset first
    const fixed = parseFixedOffset(tz);
    if (!isNaN(fixed))
        return localMs - fixed;
    const iana = resolveIANA(tz);
    if (!iana)
        return localMs;
    // Approximation: compute the offset at the approximate UTC moment
    // (offset iteration is overkill for a scheduling library)
    const approxUtcMs = localMs - getIANAOffsetMs(iana, localMs);
    // One correction pass for DST edge-cases
    const correctedOffset = getIANAOffsetMs(iana, approxUtcMs);
    return localMs - correctedOffset;
}
/**
 * Returns the UTC offset string (e.g. "+03:30") for a given IANA timezone
 * at the current moment. Useful for formatting and display.
 */
export function getOffsetString(tz, atUtcMs = Date.now()) {
    // Fast-path for UTC/GMT/Z
    const upper = tz.toUpperCase();
    if (upper === "UTC" || upper === "GMT" || upper === "Z")
        return "+00:00";
    const fixed = parseFixedOffset(tz);
    if (!isNaN(fixed))
        return tz;
    const iana = resolveIANA(tz);
    if (!iana)
        return "+00:00";
    const offsetMs = getIANAOffsetMs(iana, atUtcMs);
    const sign = offsetMs >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMs);
    const h = Math.floor(abs / 3600000)
        .toString()
        .padStart(2, "0");
    const m = Math.floor((abs % 3600000) / 60000)
        .toString()
        .padStart(2, "0");
    return `${sign}${h}:${m}`;
}
//# sourceMappingURL=timezone.js.map