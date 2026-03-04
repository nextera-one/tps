/**
 * TPS: Temporal Positioning System
 * Shared types and interfaces.
 */
/**
 * Calendar codes are plain strings to allow arbitrary user-defined
 * calendars. The library still exports constants for the built-in values.
 */
export const DefaultCalendars = {
    TPS: "tps",
    GREG: "greg",
    HIJ: "hij",
    PER: "per",
    JUL: "jul",
    HOLO: "holo",
    UNIX: "unix",
    CHIN: "chin",
};
/**
 * Specifies the direction of the time-component hierarchy when serializing or
 * deserializing a TPS string. The default is 'descending'.
 */
export var TimeOrder;
(function (TimeOrder) {
    TimeOrder["DESC"] = "desc";
    TimeOrder["ASC"] = "asc";
})(TimeOrder || (TimeOrder = {}));
//# sourceMappingURL=types.js.map