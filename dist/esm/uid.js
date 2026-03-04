/**
 * TPS-UID v1 — Temporal Positioning System Identifier (Binary Reversible)
 */
import { TPS } from "./index";
import { DefaultCalendars } from "./types";
import { Env } from "./utils/env";
export class TPSUID7RB {
    static encodeBinary(tps, opts = {}) {
        const compress = opts.compress ?? false;
        const epochMs = opts.epochMs ?? this.epochMsFromTPSString(tps);
        if (!Number.isInteger(epochMs) || epochMs < 0 || epochMs > 0xffffffffffff) {
            throw new Error("TPSUID7RB: Invalid epochMs (must be 48-bit non-negative integer)");
        }
        const flags = compress ? 0x01 : 0x00;
        const nonceBuf = Env.randomBytes(4);
        const tpsUtf8 = new TextEncoder().encode(tps);
        const payload = compress ? Env.deflate(tpsUtf8) : tpsUtf8;
        const lenVar = this.uvarintEncode(payload.length);
        const out = new Uint8Array(4 + 1 + 1 + 6 + 4 + lenVar.length + payload.length);
        let offset = 0;
        out.set(this.MAGIC, offset);
        offset += 4;
        out[offset++] = this.VER;
        out[offset++] = flags;
        out.set(this.writeU48(epochMs), offset);
        offset += 6;
        out.set(nonceBuf, offset);
        offset += 4;
        out.set(lenVar, offset);
        offset += lenVar.length;
        out.set(payload, offset);
        return out;
    }
    static decodeBinary(bytes) {
        if (bytes.length < 17)
            throw new Error("TPSUID7RB: too short");
        if (bytes[0] !== 0x54 ||
            bytes[1] !== 0x50 ||
            bytes[2] !== 0x55 ||
            bytes[3] !== 0x37) {
            throw new Error("TPSUID7RB: bad magic");
        }
        const ver = bytes[4];
        if (ver !== this.VER)
            throw new Error(`TPSUID7RB: unsupported version ${ver}`);
        const flags = bytes[5];
        const compressed = (flags & 0x01) === 0x01;
        const epochMs = this.readU48(bytes, 6);
        const nonce = ((bytes[12] << 24) >>> 0) +
            ((bytes[13] << 16) >>> 0) +
            ((bytes[14] << 8) >>> 0) +
            bytes[15];
        let offset = 16;
        const { value: tpsLen, bytesRead } = this.uvarintDecode(bytes, offset);
        offset += bytesRead;
        if (offset + tpsLen > bytes.length)
            throw new Error("TPSUID7RB: length overflow");
        const payload = bytes.slice(offset, offset + tpsLen);
        const tpsUtf8 = compressed ? Env.inflate(payload) : payload;
        const tps = new TextDecoder().decode(tpsUtf8);
        return { version: "tpsuid7rb", epochMs, compressed, nonce, tps };
    }
    static encodeBinaryB64(tps, opts) {
        const bytes = this.encodeBinary(tps, opts ?? {});
        return `${this.PREFIX}${this.base64UrlEncode(bytes)}`;
    }
    static decodeBinaryB64(id) {
        const s = id.trim();
        if (!s.startsWith(this.PREFIX))
            throw new Error("TPSUID7RB: missing prefix");
        return this.decodeBinary(this.base64UrlDecode(s.slice(this.PREFIX.length)));
    }
    static validateBinaryB64(id) {
        return this.REGEX.test(id.trim());
    }
    static generate(opts) {
        const now = new Date();
        const time = TPS.fromDate(now, DefaultCalendars.TPS, {
            order: opts?.order,
        });
        let space = "unknown";
        if (opts?.latitude !== undefined && opts?.longitude !== undefined) {
            space = `${opts.latitude},${opts.longitude}`;
            if (opts.altitude !== undefined)
                space += `,${opts.altitude}m`;
        }
        const tps = `tps://${space}@${time}`;
        return this.encodeBinaryB64(tps, {
            compress: opts?.compress,
            epochMs: now.getTime(),
        });
    }
    static seal(tps, privateKey, opts) {
        const compress = opts?.compress ?? false;
        const epochMs = opts?.epochMs ?? this.epochMsFromTPSString(tps);
        if (!Number.isInteger(epochMs) || epochMs < 0 || epochMs > 0xffffffffffff) {
            throw new Error("TPSUID7RB: Invalid epochMs");
        }
        const flags = (compress ? 0x01 : 0x00) | 0x02; // Set SEAL bit
        const nonceBuf = Env.randomBytes(4);
        const tpsUtf8 = new TextEncoder().encode(tps);
        const payload = compress ? Env.deflate(tpsUtf8) : tpsUtf8;
        const lenVar = this.uvarintEncode(payload.length);
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
        const signature = Env.signEd25519(content, privateKey);
        const final = new Uint8Array(contentLen + 1 + signature.length);
        final.set(content, 0);
        final.set([0x01], contentLen); // Ed25519 type
        final.set(signature, contentLen + 1);
        return final;
    }
    static verifyAndDecode(sealedBytes, publicKey) {
        if (sealedBytes.length < 18)
            throw new Error("TPSUID7RB: too short");
        if (sealedBytes[5] & 0x02 ? false : true)
            throw new Error("TPSUID7RB: not sealed");
        let offset = 16;
        const { value: tpsLen, bytesRead } = this.uvarintDecode(sealedBytes, offset);
        const payloadEnd = offset + bytesRead + tpsLen;
        const content = sealedBytes.slice(0, payloadEnd);
        const signature = sealedBytes.slice(payloadEnd + 1);
        if (!Env.verifyEd25519(content, signature, publicKey)) {
            throw new Error("TPSUID7RB: verification failed");
        }
        return this.decodeBinary(content);
    }
    static epochMsFromTPSString(tps) {
        const date = TPS.toDate(tps);
        if (date)
            return date.getTime();
        const stripped = tps.replace(/;[^?#]*/, "").replace(/[?#].*$/, "");
        const retryDate = TPS.toDate(stripped);
        if (!retryDate)
            throw new Error("TPS: unable to parse date for epoch");
        return retryDate.getTime();
    }
    static writeU48(epochMs) {
        const b = new Uint8Array(6);
        const v = BigInt(epochMs);
        b[0] = Number((v >> 40n) & 0xffn);
        b[1] = Number((v >> 32n) & 0xffn);
        b[2] = Number((v >> 24n) & 0xffn);
        b[3] = Number((v >> 16n) & 0xffn);
        b[4] = Number((v >> 8n) & 0xffn);
        b[5] = Number(v & 0xffn);
        return b;
    }
    static readU48(bytes, offset) {
        const v = (BigInt(bytes[offset]) << 40n) +
            (BigInt(bytes[offset + 1]) << 32n) +
            (BigInt(bytes[offset + 2]) << 24n) +
            (BigInt(bytes[offset + 3]) << 16n) +
            (BigInt(bytes[offset + 4]) << 8n) +
            BigInt(bytes[offset + 5]);
        return Number(v);
    }
    static uvarintEncode(n) {
        const out = [];
        let x = n >>> 0;
        while (x >= 0x80) {
            out.push((x & 0x7f) | 0x80);
            x >>>= 7;
        }
        out.push(x);
        return new Uint8Array(out);
    }
    static uvarintDecode(bytes, offset) {
        let x = 0, s = 0, i = 0;
        while (true) {
            const b = bytes[offset + i];
            if (b < 0x80) {
                x |= b << s;
                return { value: x >>> 0, bytesRead: i + 1 };
            }
            x |= (b & 0x7f) << s;
            s += 7;
            i++;
        }
    }
    static base64UrlEncode(bytes) {
        if (typeof Buffer !== "undefined") {
            return Buffer.from(bytes)
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/g, "");
        }
        return btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    }
    static base64UrlDecode(b64url) {
        const padLen = (4 - (b64url.length % 4)) % 4;
        const b64 = (b64url + "=".repeat(padLen))
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        if (typeof Buffer !== "undefined")
            return new Uint8Array(Buffer.from(b64, "base64"));
        const binary = atob(b64);
        return new Uint8Array(Array.from(binary).map((c) => c.charCodeAt(0)));
    }
}
TPSUID7RB.MAGIC = new Uint8Array([0x54, 0x50, 0x55, 0x37]);
TPSUID7RB.VER = 0x01;
TPSUID7RB.PREFIX = "tpsuid7rb_";
TPSUID7RB.REGEX = /^tpsuid7rb_[A-Za-z0-9_-]+$/;
//# sourceMappingURL=uid.js.map