/**
 * TPS-UID v1 — Temporal Positioning System Identifier (Binary Reversible)
 */
import { TimeOrder } from "./types";
/**
 * Decoded result from TPSUID7RB binary format.
 */
export type TPSUID7RBDecodeResult = {
    version: "tpsuid7rb";
    epochMs: number;
    compressed: boolean;
    nonce: number;
    tps: string;
};
/**
 * Encoding options for TPSUID7RB.
 */
export type TPSUID7RBEncodeOptions = {
    compress?: boolean;
    epochMs?: number;
};
export declare class TPSUID7RB {
    private static readonly MAGIC;
    private static readonly VER;
    private static readonly PREFIX;
    static readonly REGEX: RegExp;
    static encodeBinary(tps: string, opts?: TPSUID7RBEncodeOptions): Uint8Array;
    static decodeBinary(bytes: Uint8Array): TPSUID7RBDecodeResult;
    static encodeBinaryB64(tps: string, opts?: TPSUID7RBEncodeOptions): string;
    static decodeBinaryB64(id: string): TPSUID7RBDecodeResult;
    static validateBinaryB64(id: string): boolean;
    static generate(opts?: {
        latitude?: number;
        longitude?: number;
        altitude?: number;
        compress?: boolean;
        order?: TimeOrder;
    }): string;
    static seal(tps: string, privateKey: any, opts?: TPSUID7RBEncodeOptions): Uint8Array;
    static verifyAndDecode(sealedBytes: Uint8Array, publicKey: any): TPSUID7RBDecodeResult;
    static epochMsFromTPSString(tps: string): number;
    private static writeU48;
    private static readU48;
    private static uvarintEncode;
    private static uvarintDecode;
    private static base64UrlEncode;
    private static base64UrlDecode;
}
