"use strict";
/**
 * TPS: Temporal Positioning System
 * Shared types and interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeOrder = exports.DefaultCalendars = void 0;
/**
 * Calendar codes are plain strings to allow arbitrary user-defined
 * calendars. The library still exports constants for the built-in values.
 */
exports.DefaultCalendars = {
    TPS: "tps",
    GREG: "greg",
    HIJ: "hij",
    PER: "per",
    JUL: "jul",
    HOLO: "holo",
    UNIX: "unix",
};
/**
 * Specifies the direction of the time-component hierarchy when serializing or
 * deserializing a TPS string. The default is 'descending'.
 */
var TimeOrder;
(function (TimeOrder) {
    TimeOrder["DESC"] = "desc";
    TimeOrder["ASC"] = "asc";
})(TimeOrder || (exports.TimeOrder = TimeOrder = {}));
//# sourceMappingURL=types.js.map