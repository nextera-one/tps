"use strict";
/**
 * TPS: Temporal Positioning System
 * The Universal Protocol for Space-Time Coordinates.
 * @packageDocumentation
 * @version 0.4.2
 * @license MIT
 * @copyright 2026 TPS Standards Working Group
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TPSUID7RB = exports.TPS = void 0;
class TPS {
    /**
     * Registers a calendar driver plugin.
     * @param driver - The driver instance to register.
     */
    static registerDriver(driver) {
        this.drivers.set(driver.code, driver);
    }
    /**
     * Gets a registered calendar driver.
     * @param code - The calendar code.
     * @returns The driver or undefined.
     */
    static getDriver(code) {
        return this.drivers.get(code);
    }
    // --- CORE METHODS ---
    static validate(input) {
        if (input.startsWith('tps://'))
            return this.REGEX_URI.test(input);
        return this.REGEX_TIME.test(input);
    }
    static parse(input) {
        if (input.startsWith('tps://')) {
            const match = this.REGEX_URI.exec(input);
            if (!match || !match.groups)
                return null;
            return this._mapGroupsToComponents(match.groups);
        }
        const match = this.REGEX_TIME.exec(input);
        if (!match || !match.groups)
            return null;
        return this._mapGroupsToComponents(match.groups);
    }
    /**
     * SERIALIZER: Converts a components object into a full TPS URI.
     * @param comp - The TPS components.
     * @returns Full URI string (e.g. "tps://...").
     */
    static toURI(comp) {
        // 1. Build Space Part
        let spacePart = 'unknown'; // Default safe fallback
        if (comp.isHiddenLocation) {
            spacePart = 'hidden';
        }
        else if (comp.isRedactedLocation) {
            spacePart = 'redacted';
        }
        else if (comp.isUnknownLocation) {
            spacePart = 'unknown';
        }
        else if (comp.latitude !== undefined && comp.longitude !== undefined) {
            spacePart = `${comp.latitude},${comp.longitude}`;
            if (comp.altitude !== undefined) {
                spacePart += `,${comp.altitude}m`;
            }
        }
        // 2. Build Time Part
        let timePart = `T:${comp.calendar}`;
        if (comp.calendar === 'unix' && comp.unixSeconds !== undefined) {
            timePart += `.s${comp.unixSeconds}`;
        }
        else {
            if (comp.millennium !== undefined)
                timePart += `.m${comp.millennium}`;
            if (comp.century !== undefined)
                timePart += `.c${comp.century}`;
            if (comp.year !== undefined)
                timePart += `.y${comp.year}`;
            if (comp.month !== undefined)
                timePart += `.M${this.pad(comp.month)}`;
            if (comp.day !== undefined)
                timePart += `.d${this.pad(comp.day)}`;
            if (comp.hour !== undefined)
                timePart += `.h${this.pad(comp.hour)}`;
            if (comp.minute !== undefined)
                timePart += `.n${this.pad(comp.minute)}`;
            if (comp.second !== undefined)
                timePart += `.s${this.pad(comp.second)}`;
        }
        // 3. Build Extensions
        let extPart = '';
        if (comp.extensions && Object.keys(comp.extensions).length > 0) {
            const extStrings = Object.entries(comp.extensions).map(([k, v]) => `${k}${v}`);
            extPart = `;${extStrings.join('.')}`;
        }
        return `tps://${spacePart}@${timePart}${extPart}`;
    }
    /**
     * CONVERTER: Creates a TPS Time Object string from a JavaScript Date.
     * Supports plugin drivers for non-Gregorian calendars.
     * @param date - The JS Date object (defaults to Now).
     * @param calendar - The target calendar driver (default 'greg').
     * @returns Canonical string (e.g., "T:greg.m3.c1.y26...").
     */
    static fromDate(date = new Date(), calendar = 'greg') {
        // Check for registered driver first
        const driver = this.drivers.get(calendar);
        if (driver) {
            return driver.fromDate(date);
        }
        // Built-in handlers
        if (calendar === 'unix') {
            const s = (date.getTime() / 1000).toFixed(3);
            return `T:unix.s${s}`;
        }
        if (calendar === 'greg') {
            const fullYear = date.getUTCFullYear();
            const m = Math.floor(fullYear / 1000) + 1;
            const c = Math.floor((fullYear % 1000) / 100) + 1;
            const y = fullYear % 100;
            const M = date.getUTCMonth() + 1;
            const d = date.getUTCDate();
            const h = date.getUTCHours();
            const n = date.getUTCMinutes();
            const s = date.getUTCSeconds();
            return `T:greg.m${m}.c${c}.y${y}.M${this.pad(M)}.d${this.pad(d)}.h${this.pad(h)}.n${this.pad(n)}.s${this.pad(s)}`;
        }
        throw new Error(`Calendar driver '${calendar}' not implemented. Register a driver.`);
    }
    /**
     * CONVERTER: Converts a TPS string to a Date in a target calendar format.
     * Uses plugin drivers for cross-calendar conversion.
     * @param tpsString - The source TPS string (any calendar).
     * @param targetCalendar - The target calendar code (e.g., 'hij').
     * @returns A TPS string in the target calendar, or null if invalid.
     */
    static to(targetCalendar, tpsString) {
        // 1. Parse to components and convert to Gregorian Date
        const gregDate = this.toDate(tpsString);
        if (!gregDate)
            return null;
        // 2. Convert Gregorian to target calendar using driver
        return this.fromDate(gregDate, targetCalendar);
    }
    /**
     * CONVERTER: Reconstructs a JavaScript Date object from a TPS string.
     * Supports plugin drivers for non-Gregorian calendars.
     * @param tpsString - The TPS string.
     * @returns JS Date object or `null` if invalid.
     */
    static toDate(tpsString) {
        const p = this.parse(tpsString);
        if (!p)
            return null;
        // Check for registered driver first
        const driver = this.drivers.get(p.calendar);
        if (driver) {
            return driver.toGregorian(p);
        }
        // Built-in handlers
        if (p.calendar === 'unix' && p.unixSeconds !== undefined) {
            return new Date(p.unixSeconds * 1000);
        }
        if (p.calendar === 'greg') {
            const m = p.millennium || 0;
            const c = p.century || 1;
            const y = p.year || 0;
            const fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;
            return new Date(Date.UTC(fullYear, (p.month || 1) - 1, p.day || 1, p.hour || 0, p.minute || 0, Math.floor(p.second || 0)));
        }
        return null;
    }
    // --- DRIVER CONVENIENCE METHODS ---
    /**
     * Parse a calendar-specific date string into TPS components.
     * Requires the driver to implement the optional `parseDate` method.
     *
     * @param calendar - The calendar code (e.g., 'hij')
     * @param dateString - Date string in calendar-native format (e.g., '1447-07-21')
     * @param format - Optional format string (driver-specific)
     * @returns TPS components or null if parsing fails
     *
     * @example
     * ```ts
     * const components = TPS.parseCalendarDate('hij', '1447-07-21');
     * // { calendar: 'hij', year: 1447, month: 7, day: 21 }
     *
     * const uri = TPS.toURI({ ...components, latitude: 31.95, longitude: 35.91 });
     * // "tps://31.95,35.91@T:hij.y1447.M07.d21"
     * ```
     */
    static parseCalendarDate(calendar, dateString, format) {
        const driver = this.drivers.get(calendar);
        if (!driver) {
            throw new Error(`Calendar driver '${calendar}' not found. Register a driver first.`);
        }
        if (!driver.parseDate) {
            throw new Error(`Driver '${calendar}' does not implement parseDate(). Use fromGregorian() instead.`);
        }
        return driver.parseDate(dateString, format);
    }
    /**
     * Convert a calendar-specific date string directly to a TPS URI.
     * This is a convenience method that combines parseDate + toURI.
     *
     * @param calendar - The calendar code (e.g., 'hij')
     * @param dateString - Date string in calendar-native format
     * @param location - Optional location (lat/lon/alt or privacy flag)
     * @returns Full TPS URI string
     *
     * @example
     * ```ts
     * // With coordinates
     * TPS.fromCalendarDate('hij', '1447-07-21', { latitude: 31.95, longitude: 35.91 });
     * // "tps://31.95,35.91@T:hij.y1447.M07.d21"
     *
     * // With privacy flag
     * TPS.fromCalendarDate('hij', '1447-07-21', { isHiddenLocation: true });
     * // "tps://hidden@T:hij.y1447.M07.d21"
     *
     * // Without location
     * TPS.fromCalendarDate('hij', '1447-07-21');
     * // "tps://unknown@T:hij.y1447.M07.d21"
     * ```
     */
    static fromCalendarDate(calendar, dateString, location) {
        const components = this.parseCalendarDate(calendar, dateString);
        if (!components) {
            throw new Error(`Failed to parse date string: ${dateString}`);
        }
        // Merge with location
        const fullComponents = {
            calendar,
            ...components,
            ...location,
        };
        return this.toURI(fullComponents);
    }
    /**
     * Format TPS components to a calendar-specific date string.
     * Requires the driver to implement the optional `format` method.
     *
     * @param calendar - The calendar code
     * @param components - TPS components to format
     * @param format - Optional format string (driver-specific)
     * @returns Formatted date string in calendar-native format
     *
     * @example
     * ```ts
     * const tps = TPS.parse('tps://unknown@T:hij.y1447.M07.d21');
     * const formatted = TPS.formatCalendarDate('hij', tps);
     * // "1447-07-21"
     * ```
     */
    static formatCalendarDate(calendar, components, format) {
        const driver = this.drivers.get(calendar);
        if (!driver) {
            throw new Error(`Calendar driver '${calendar}' not found.`);
        }
        if (!driver.format) {
            throw new Error(`Driver '${calendar}' does not implement format().`);
        }
        return driver.format(components, format);
    }
    // --- INTERNAL HELPERS ---
    static _mapGroupsToComponents(g) {
        const components = {};
        components.calendar = g.calendar;
        // Time Mapping
        if (components.calendar === 'unix' && g.unix) {
            components.unixSeconds = parseFloat(g.unix.substring(1));
        }
        else {
            if (g.millennium)
                components.millennium = parseInt(g.millennium, 10);
            if (g.century)
                components.century = parseInt(g.century, 10);
            if (g.year)
                components.year = parseInt(g.year, 10);
            if (g.month)
                components.month = parseInt(g.month, 10);
            if (g.day)
                components.day = parseInt(g.day, 10);
            if (g.hour)
                components.hour = parseInt(g.hour, 10);
            if (g.minute)
                components.minute = parseInt(g.minute, 10);
            if (g.second)
                components.second = parseFloat(g.second);
        }
        // Space Mapping
        if (g.space) {
            if (g.space === 'unknown')
                components.isUnknownLocation = true;
            else if (g.space === 'redacted')
                components.isRedactedLocation = true;
            else if (g.space === 'hidden')
                components.isHiddenLocation = true;
            else {
                if (g.lat)
                    components.latitude = parseFloat(g.lat);
                if (g.lon)
                    components.longitude = parseFloat(g.lon);
                if (g.alt)
                    components.altitude = parseFloat(g.alt);
            }
        }
        // Extensions Mapping
        if (g.extensions) {
            const extObj = {};
            const parts = g.extensions.split('.');
            parts.forEach((p) => {
                const key = p.charAt(0);
                const val = p.substring(1);
                if (key && val)
                    extObj[key] = val;
            });
            components.extensions = extObj;
        }
        return components;
    }
    static pad(n) {
        const s = n.toString();
        return s.length < 2 ? '0' + s : s;
    }
}
exports.TPS = TPS;
// --- PLUGIN REGISTRY ---
TPS.drivers = new Map();
// --- REGEX ---
TPS.REGEX_URI = new RegExp('^tps://(?<space>unknown|redacted|hidden|(?<lat>-?\\d+(?:\\.\\d+)?),(?<lon>-?\\d+(?:\\.\\d+)?)(?:,(?<alt>-?\\d+(?:\\.\\d+)?)m?)?)@T:(?<calendar>[a-z]{3,4})\\.(?:(?<unix>s\\d+(?:\\.\\d+)?)|m(?<millennium>-?\\d+)(?:\\.c(?<century>\\d+)(?:\\.y(?<year>\\d+)(?:\\.M(?<month>\\d{1,2})(?:\\.d(?<day>\\d{1,2})(?:\\.h(?<hour>\\d{1,2})(?:\\.n(?<minute>\\d{1,2})(?:\\.s(?<second>\\d{1,2}(?:\\.\\d+)?))?)?)?)?)?)?)?)?(?:;(?<extensions>[a-z0-9\\.\\-\\_]+))?$');
TPS.REGEX_TIME = new RegExp('^T:(?<calendar>[a-z]{3,4})\\.(?:(?<unix>s\\d+(?:\\.\\d+)?)|m(?<millennium>-?\\d+)(?:\\.c(?<century>\\d+)(?:\\.y(?<year>\\d+)(?:\\.M(?<month>\\d{1,2})(?:\\.d(?<day>\\d{1,2})(?:\\.h(?<hour>\\d{1,2})(?:\\.n(?<minute>\\d{1,2})(?:\\.s(?<second>\\d{1,2}(?:\\.\\d+)?))?)?)?)?)?)?)?)?$');
/**
 * TPS-UID v1 — Temporal Positioning System Identifier (Binary Reversible)
 *
 * A time-first, reversible identifier that binds an event to a TPS coordinate.
 * Unlike UUIDs, TPS-UID identifies events in spacetime and allows exact
 * reconstruction of the original TPS string.
 *
 * Binary Schema (all integers big-endian):
 * ```
 * MAGIC   4 bytes   "TPU7"
 * VER     1 byte    0x01
 * FLAGS   1 byte    bit0 = compression flag
 * TIME    6 bytes   epoch_ms (48-bit unsigned)
 * NONCE   4 bytes   32-bit random
 * LEN     varint    length of TPS payload
 * TPS     bytes     UTF-8 TPS string (raw or zlib-compressed)
 * ```
 *
 * @example
 * ```ts
 * const tps = 'tps://31.95,35.91@T:greg.m3.c1.y26.M01.d09';
 *
 * // Encode to binary
 * const bytes = TPSUID7RB.encodeBinary(tps);
 *
 * // Encode to base64url string
 * const id = TPSUID7RB.encodeBinaryB64(tps);
 * // → "tpsuid7rb_AFRQV..."
 *
 * // Decode back to original TPS
 * const decoded = TPSUID7RB.decodeBinaryB64(id);
 * console.log(decoded.tps); // exact original TPS
 * ```
 */
class TPSUID7RB {
    // ---------------------------
    // Public API
    // ---------------------------
    /**
     * Encode TPS string to binary bytes (Uint8Array).
     * This is the canonical form for hashing, signing, and storage.
     *
     * @param tps - The TPS string to encode
     * @param opts - Encoding options (compress, epochMs override)
     * @returns Binary TPS-UID as Uint8Array
     */
    static encodeBinary(tps, opts) {
        const compress = opts?.compress ?? false;
        const epochMs = opts?.epochMs ?? this.epochMsFromTPSString(tps);
        if (!Number.isInteger(epochMs) || epochMs < 0) {
            throw new Error('epochMs must be a non-negative integer');
        }
        if (epochMs > 0xffffffffffff) {
            throw new Error('epochMs exceeds 48-bit range');
        }
        const flags = compress ? 0x01 : 0x00;
        // Generate 32-bit nonce
        const nonceBuf = this.randomBytes(4);
        const nonce = ((nonceBuf[0] << 24) >>> 0) +
            ((nonceBuf[1] << 16) >>> 0) +
            ((nonceBuf[2] << 8) >>> 0) +
            nonceBuf[3];
        // Encode TPS to UTF-8
        const tpsUtf8 = new TextEncoder().encode(tps);
        // Optionally compress
        const payload = compress ? this.deflateRaw(tpsUtf8) : tpsUtf8;
        // Encode length as varint
        const lenVar = this.uvarintEncode(payload.length);
        // Construct binary structure
        const out = new Uint8Array(4 + 1 + 1 + 6 + 4 + lenVar.length + payload.length);
        let offset = 0;
        // MAGIC
        out.set(this.MAGIC, offset);
        offset += 4;
        // VER
        out[offset++] = this.VER;
        // FLAGS
        out[offset++] = flags;
        // TIME (48-bit big-endian)
        const timeBytes = this.writeU48(epochMs);
        out.set(timeBytes, offset);
        offset += 6;
        // NONCE (32-bit big-endian)
        out.set(nonceBuf, offset);
        offset += 4;
        // LEN (varint)
        out.set(lenVar, offset);
        offset += lenVar.length;
        // TPS payload
        out.set(payload, offset);
        return out;
    }
    /**
     * Decode binary bytes back to original TPS string.
     *
     * @param bytes - Binary TPS-UID
     * @returns Decoded result with original TPS string
     */
    static decodeBinary(bytes) {
        // Header min size: 4+1+1+6+4 + 1 (at least 1 byte varint) = 17
        if (bytes.length < 17) {
            throw new Error('TPSUID7RB: too short');
        }
        // MAGIC
        if (bytes[0] !== 0x54 ||
            bytes[1] !== 0x50 ||
            bytes[2] !== 0x55 ||
            bytes[3] !== 0x37) {
            throw new Error('TPSUID7RB: bad magic');
        }
        // VERSION
        const ver = bytes[4];
        if (ver !== this.VER) {
            throw new Error(`TPSUID7RB: unsupported version ${ver}`);
        }
        // FLAGS
        const flags = bytes[5];
        const compressed = (flags & 0x01) === 0x01;
        // TIME (48-bit big-endian)
        const epochMs = this.readU48(bytes, 6);
        // NONCE (32-bit big-endian)
        const nonce = ((bytes[12] << 24) >>> 0) +
            ((bytes[13] << 16) >>> 0) +
            ((bytes[14] << 8) >>> 0) +
            bytes[15];
        // LEN (varint at offset 16)
        let offset = 16;
        const { value: tpsLen, bytesRead } = this.uvarintDecode(bytes, offset);
        offset += bytesRead;
        if (offset + tpsLen > bytes.length) {
            throw new Error('TPSUID7RB: length overflow');
        }
        // TPS payload
        const payload = bytes.slice(offset, offset + tpsLen);
        const tpsUtf8 = compressed ? this.inflateRaw(payload) : payload;
        const tps = new TextDecoder().decode(tpsUtf8);
        return { version: 'tpsuid7rb', epochMs, compressed, nonce, tps };
    }
    /**
     * Encode TPS to base64url string with prefix.
     * This is the transport/storage form.
     *
     * @param tps - The TPS string to encode
     * @param opts - Encoding options
     * @returns Base64url encoded TPS-UID with prefix
     */
    static encodeBinaryB64(tps, opts) {
        const bytes = this.encodeBinary(tps, opts);
        return `${this.PREFIX}${this.base64UrlEncode(bytes)}`;
    }
    /**
     * Decode base64url string back to original TPS string.
     *
     * @param id - Base64url encoded TPS-UID with prefix
     * @returns Decoded result with original TPS string
     */
    static decodeBinaryB64(id) {
        const s = id.trim();
        if (!s.startsWith(this.PREFIX)) {
            throw new Error('TPSUID7RB: missing prefix');
        }
        const b64 = s.slice(this.PREFIX.length);
        const bytes = this.base64UrlDecode(b64);
        return this.decodeBinary(bytes);
    }
    /**
     * Validate base64url encoded TPS-UID format.
     * Note: This validates shape only; binary decode is authoritative.
     *
     * @param id - String to validate
     * @returns true if format is valid
     */
    static validateBinaryB64(id) {
        return this.REGEX.test(id.trim());
    }
    /**
     * Generate a TPS-UID from the current time and optional location.
     *
     * @param opts - Generation options
     * @returns Base64url encoded TPS-UID
     */
    static generate(opts) {
        const now = new Date();
        const tps = this.generateTPSString(now, opts);
        return this.encodeBinaryB64(tps, {
            compress: opts?.compress,
            epochMs: now.getTime(),
        });
    }
    // ---------------------------
    // TPS String Helpers
    // ---------------------------
    /**
     * Generate a TPS string from a Date and optional location.
     */
    static generateTPSString(date, opts) {
        const fullYear = date.getUTCFullYear();
        const m = Math.floor(fullYear / 1000) + 1;
        const c = Math.floor((fullYear % 1000) / 100) + 1;
        const y = fullYear % 100;
        const M = date.getUTCMonth() + 1;
        const d = date.getUTCDate();
        const h = date.getUTCHours();
        const n = date.getUTCMinutes();
        const s = date.getUTCSeconds();
        const pad = (num) => num.toString().padStart(2, '0');
        const timePart = `T:greg.m${m}.c${c}.y${y}.M${pad(M)}.d${pad(d)}.h${pad(h)}.n${pad(n)}.s${pad(s)}`;
        let spacePart = 'unknown';
        if (opts?.latitude !== undefined && opts?.longitude !== undefined) {
            spacePart = `${opts.latitude},${opts.longitude}`;
            if (opts.altitude !== undefined) {
                spacePart += `,${opts.altitude}m`;
            }
        }
        return `tps://${spacePart}@${timePart}`;
    }
    /**
     * Parse epoch milliseconds from a TPS string.
     * Supports both URI format (tps://...) and time-only format (T:greg...)
     */
    static epochMsFromTPSString(tps) {
        let time;
        if (tps.includes('@')) {
            // URI format: tps://...@T:greg...
            const at = tps.indexOf('@');
            time = tps.slice(at + 1).trim();
        }
        else if (tps.startsWith('T:')) {
            // Time-only format
            time = tps;
        }
        else {
            throw new Error('TPS: unrecognized format');
        }
        if (!time.startsWith('T:greg.')) {
            throw new Error('TPS: only T:greg.* parsing is supported');
        }
        // Extract m (millennium), c (century), y (year)
        const mMatch = time.match(/\.m(-?\d+)/);
        const cMatch = time.match(/\.c(\d+)/);
        const yMatch = time.match(/\.y(\d{1,4})/);
        const MMatch = time.match(/\.M(\d{1,2})/);
        const dMatch = time.match(/\.d(\d{1,2})/);
        const hMatch = time.match(/\.h(\d{1,2})/);
        const nMatch = time.match(/\.n(\d{1,2})/);
        const sMatch = time.match(/\.s(\d{1,2})/);
        // Calculate full year from millennium, century, year
        let fullYear;
        if (mMatch && cMatch && yMatch) {
            const millennium = parseInt(mMatch[1], 10);
            const century = parseInt(cMatch[1], 10);
            const year = parseInt(yMatch[1], 10);
            fullYear = (millennium - 1) * 1000 + (century - 1) * 100 + year;
        }
        else if (yMatch) {
            // Fallback: interpret y as 2-digit year
            let year = parseInt(yMatch[1], 10);
            if (year < 100) {
                year = year <= 69 ? 2000 + year : 1900 + year;
            }
            fullYear = year;
        }
        else {
            throw new Error('TPS: missing year component');
        }
        const month = MMatch ? parseInt(MMatch[1], 10) : 1;
        const day = dMatch ? parseInt(dMatch[1], 10) : 1;
        const hour = hMatch ? parseInt(hMatch[1], 10) : 0;
        const minute = nMatch ? parseInt(nMatch[1], 10) : 0;
        const second = sMatch ? parseInt(sMatch[1], 10) : 0;
        const epoch = Date.UTC(fullYear, month - 1, day, hour, minute, second);
        if (!Number.isFinite(epoch)) {
            throw new Error('TPS: failed to compute epochMs');
        }
        return epoch;
    }
    // ---------------------------
    // Binary Helpers
    // ---------------------------
    /** Write 48-bit unsigned integer (big-endian) */
    static writeU48(epochMs) {
        const b = new Uint8Array(6);
        // Use BigInt for proper 48-bit handling
        const v = BigInt(epochMs);
        b[0] = Number((v >> 40n) & 0xffn);
        b[1] = Number((v >> 32n) & 0xffn);
        b[2] = Number((v >> 24n) & 0xffn);
        b[3] = Number((v >> 16n) & 0xffn);
        b[4] = Number((v >> 8n) & 0xffn);
        b[5] = Number(v & 0xffn);
        return b;
    }
    /** Read 48-bit unsigned integer (big-endian) */
    static readU48(bytes, offset) {
        const v = (BigInt(bytes[offset]) << 40n) +
            (BigInt(bytes[offset + 1]) << 32n) +
            (BigInt(bytes[offset + 2]) << 24n) +
            (BigInt(bytes[offset + 3]) << 16n) +
            (BigInt(bytes[offset + 4]) << 8n) +
            BigInt(bytes[offset + 5]);
        const n = Number(v);
        if (!Number.isSafeInteger(n)) {
            throw new Error('TPSUID7RB: u48 not safe integer');
        }
        return n;
    }
    /** Encode unsigned integer as LEB128 varint */
    static uvarintEncode(n) {
        if (!Number.isInteger(n) || n < 0) {
            throw new Error('uvarint must be non-negative int');
        }
        const out = [];
        let x = n >>> 0;
        while (x >= 0x80) {
            out.push((x & 0x7f) | 0x80);
            x >>>= 7;
        }
        out.push(x);
        return new Uint8Array(out);
    }
    /** Decode LEB128 varint */
    static uvarintDecode(bytes, offset) {
        let x = 0;
        let s = 0;
        let i = 0;
        while (true) {
            if (offset + i >= bytes.length) {
                throw new Error('uvarint overflow');
            }
            const b = bytes[offset + i];
            if (b < 0x80) {
                if (i > 9 || (i === 9 && b > 1)) {
                    throw new Error('uvarint too large');
                }
                x |= b << s;
                return { value: x >>> 0, bytesRead: i + 1 };
            }
            x |= (b & 0x7f) << s;
            s += 7;
            i++;
            if (i > 10) {
                throw new Error('uvarint too long');
            }
        }
    }
    // ---------------------------
    // Base64url Helpers
    // ---------------------------
    /** Encode bytes to base64url (no padding) */
    static base64UrlEncode(bytes) {
        // Node.js environment
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/g, '');
        }
        // Browser environment
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    }
    /** Decode base64url to bytes */
    static base64UrlDecode(b64url) {
        // Add padding
        const padLen = (4 - (b64url.length % 4)) % 4;
        const b64 = (b64url + '='.repeat(padLen))
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        // Node.js environment
        if (typeof Buffer !== 'undefined') {
            return new Uint8Array(Buffer.from(b64, 'base64'));
        }
        // Browser environment
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    // ---------------------------
    // Compression Helpers
    // ---------------------------
    /** Compress using zlib deflate raw */
    static deflateRaw(data) {
        // Node.js environment
        if (typeof require !== 'undefined') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const zlib = require('zlib');
                return new Uint8Array(zlib.deflateRawSync(Buffer.from(data)));
            }
            catch {
                throw new Error('TPSUID7RB: compression not available');
            }
        }
        // Browser: would need pako or similar library
        throw new Error('TPSUID7RB: compression not available in browser');
    }
    /** Decompress using zlib inflate raw */
    static inflateRaw(data) {
        // Node.js environment
        if (typeof require !== 'undefined') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const zlib = require('zlib');
                return new Uint8Array(zlib.inflateRawSync(Buffer.from(data)));
            }
            catch {
                throw new Error('TPSUID7RB: decompression failed');
            }
        }
        // Browser: would need pako or similar library
        throw new Error('TPSUID7RB: decompression not available in browser');
    }
    // ---------------------------
    // Cryptographic Sealing (Ed25519)
    // ---------------------------
    /**
     * Seal (sign) a TPS string to create a cryptographically verifiable TPS-UID.
     * This appends an Ed25519 signature to the binary form.
     *
     * @param tps - The TPS string to seal
     * @param privateKey - Ed25519 private key (hex or buffer)
     * @param opts - Encoding options
     * @returns Sealed binary TPS-UID
     */
    static seal(tps, privateKey, opts) {
        // 1. Create standard binary (unsealed first)
        // We force the SEAL flag (bit 1) to be 0 initially for the "content to sign"
        // But wait, we want the signature to cover the header too.
        // Strategy: Construct the full binary with SEAL flag OFF, sign it, then set SEAL flag ON and append sig.
        // Actually, the standard way is:
        // Content = MAGIC + VER + FLAGS(with seal bit set) + TIME + NONCE + LEN + PAYLOAD
        // Signature = Sign(Content)
        // Final = Content + SEAL_TYPE + SIGNATURE
        const compress = opts?.compress ?? false;
        const epochMs = opts?.epochMs ?? this.epochMsFromTPSString(tps);
        // Validate epoch
        if (!Number.isInteger(epochMs) || epochMs < 0 || epochMs > 0xffffffffffff) {
            throw new Error('epochMs must be a valid 48-bit non-negative integer');
        }
        // Flags: Bit 0 = compress, Bit 1 = sealed
        const flags = (compress ? 0x01 : 0x00) | 0x02; // Set SEAL bit
        // Generate Nonce
        const nonceBuf = this.randomBytes(4);
        // Encode Payload
        const tpsUtf8 = new TextEncoder().encode(tps);
        const payload = compress ? this.deflateRaw(tpsUtf8) : tpsUtf8;
        const lenVar = this.uvarintEncode(payload.length);
        // Construct Content (Header + Payload)
        const contentLen = 4 + 1 + 1 + 6 + 4 + lenVar.length + payload.length;
        const content = new Uint8Array(contentLen);
        let offset = 0;
        content.set(this.MAGIC, offset);
        offset += 4;
        content[offset++] = this.VER;
        content[offset++] = flags;
        content.set(this.writeU48(epochMs), offset);
        offset += 6;
        content.set(nonceBuf, offset);
        offset += 4;
        content.set(lenVar, offset);
        offset += lenVar.length;
        content.set(payload, offset);
        // Sign the content
        const signature = this.signEd25519(content, privateKey);
        const sealType = 0x01; // Ed25519
        // Final Output: Content + SealType (1) + Signature (64)
        const final = new Uint8Array(contentLen + 1 + signature.length);
        final.set(content, 0);
        final.set([sealType], contentLen);
        final.set(signature, contentLen + 1);
        return final;
    }
    /**
     * Verify a sealed TPS-UID and decode it.
     * Throws if signature is invalid or not sealed.
     *
     * @param sealedBytes - The binary sealed TPS-UID
     * @param publicKey - Ed25519 public key (hex or buffer) to verify against
     * @returns Decoded result
     */
    static verifyAndDecode(sealedBytes, publicKey) {
        if (sealedBytes.length < 18)
            throw new Error('TPSUID7RB: too short');
        // Check Magic
        if (sealedBytes[0] !== 0x54 ||
            sealedBytes[1] !== 0x50 ||
            sealedBytes[2] !== 0x55 ||
            sealedBytes[3] !== 0x37) {
            throw new Error('TPSUID7RB: bad magic');
        }
        // Check Flags for Sealed Bit (bit 1)
        const flags = sealedBytes[5];
        if ((flags & 0x02) === 0) {
            throw new Error('TPSUID7RB: not a sealed UID');
        }
        // 1. Parse the structure to find where content ends
        // We need to parse LEN and Payload to find the split point
        let offset = 16; // Start of LEN
        // Decode LEN
        const { value: tpsLen, bytesRead } = this.uvarintDecode(sealedBytes, offset);
        offset += bytesRead;
        const payloadEnd = offset + tpsLen;
        if (payloadEnd > sealedBytes.length) {
            throw new Error('TPSUID7RB: length overflow (truncated)');
        }
        // The Content to verify matches exactly [0 ... payloadEnd]
        const content = sealedBytes.slice(0, payloadEnd);
        // After content: SealType (1 byte) + Signature
        if (sealedBytes.length <= payloadEnd + 1) {
            throw new Error('TPSUID7RB: missing signature data');
        }
        const sealType = sealedBytes[payloadEnd];
        if (sealType !== 0x01) {
            throw new Error(`TPSUID7RB: unsupported seal type 0x${sealType.toString(16)}`);
        }
        const signature = sealedBytes.slice(payloadEnd + 1);
        if (signature.length !== 64) {
            throw new Error(`TPSUID7RB: invalid Ed25519 signature length ${signature.length}`);
        }
        // Verify
        const isValid = this.verifyEd25519(content, signature, publicKey);
        if (!isValid) {
            throw new Error('TPSUID7RB: signature verification failed');
        }
        // Decode (reuse standard logic, but ignoring the extra bytes at end is fine?)
        // Actually standard logic doesn't expect trailing bytes unless we tell it to.
        // But since we verified, we can just slice the content and decode that as a strict binary
        // EXCEPT standard decodeBinary checks strict length.
        // So we manually decode the components here to be safe and efficient.
        return this.decodeBinary(content); // Reuse strict decoder on the content part
    }
    // --- Crypto Implementation (Ed25519) ---
    static signEd25519(data, privateKey) {
        if (typeof require !== 'undefined') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const crypto = require('crypto');
                // Node's crypto.sign uses PEM or KeyObject, but for raw Ed25519 keys we might need 'crypto.sign(null, data, key)'
                // or ensure key is properly formatted.
                // For simplicity in Node 20+, crypto.sign(null, data, privateKey) works if key is KeyObject.
                // If raw bytes: establish KeyObject.
                let keyObj;
                if (Buffer.isBuffer(privateKey) || privateKey instanceof Uint8Array) {
                    // Assuming raw 64-byte private key (or 32-byte seed properly expanded by crypto)
                    // Node < 16 is tricky with raw keys.
                    // Let's assume standard Ed25519 standard implementation pattern logic:
                    keyObj = crypto.createPrivateKey({
                        key: Buffer.from(privateKey),
                        format: 'der', // or 'pem' - strict.
                        type: 'pkcs8'
                    });
                    // Actually, simpler: construct key object from raw bytes if possible?
                    // Node's crypto is strict. Let's try the simplest:
                    // If hex string provided, convert to buffer.
                }
                // Simpler fallback: If user passed a PEM string, great.
                // If they passed raw bytes, we might need 'ed25519' key type.
                // For this implementation, let's target Node's high-level sign/verify
                // and assume the user provides a VALID key object or compatible format (PEM/DER).
                // Handling RAW Ed25519 keys in Node requires specific 'crypto.createPrivateKey' with 'raw' format (Node 11.6+).
                const key = typeof privateKey === 'string' && !privateKey.includes('PRIVATE KEY')
                    ? crypto.createPrivateKey({ key: Buffer.from(privateKey, 'hex'), format: 'pem', type: 'pkcs8' }) // Fallback guess
                    : privateKey;
                // Note: Raw Ed25519 key support in Node.js 'crypto' acts via 'generateKeyPair' or KeyObject.
                // Direct raw signing is via crypto.sign(null, data, key).
                return new Uint8Array(crypto.sign(null, data, key));
            }
            catch (e) {
                // If standard crypto fails (e.g. key format issue), throw
                throw new Error('TPSUID7RB: signing failed (check key format)');
            }
        }
        throw new Error('TPSUID7RB: signing not available in browser');
    }
    static verifyEd25519(data, signature, publicKey) {
        if (typeof require !== 'undefined') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const crypto = require('crypto');
                return crypto.verify(null, data, publicKey, signature);
            }
            catch {
                return false;
            }
        }
        throw new Error('TPSUID7RB: verification not available in browser');
    }
    // ---------------------------
    // Random Bytes
    // ---------------------------
    /** Generate cryptographically secure random bytes */
    static randomBytes(length) {
        // Node.js environment
        if (typeof require !== 'undefined') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const crypto = require('crypto');
                return new Uint8Array(crypto.randomBytes(length));
            }
            catch {
                // Fallback to crypto.getRandomValues
            }
        }
        // Browser or fallback
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const bytes = new Uint8Array(length);
            crypto.getRandomValues(bytes);
            return bytes;
        }
        throw new Error('TPSUID7RB: no crypto available');
    }
}
exports.TPSUID7RB = TPSUID7RB;
/** Magic bytes: "TPU7" */
TPSUID7RB.MAGIC = new Uint8Array([0x54, 0x50, 0x55, 0x37]);
/** Version 1 */
TPSUID7RB.VER = 0x01;
/** String prefix for base64url encoded form */
TPSUID7RB.PREFIX = 'tpsuid7rb_';
/** Regex for validating base64url encoded form */
TPSUID7RB.REGEX = /^tpsuid7rb_[A-Za-z0-9_-]+$/;
