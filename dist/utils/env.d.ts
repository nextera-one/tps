/**
 * Environment & Compatibility Layer
 * Abstracts Node.js vs Browser differences.
 */
export declare const Env: {
    isNode: boolean;
    randomBytes(length: number): Uint8Array;
    deflate(data: Uint8Array): Uint8Array;
    inflate(data: Uint8Array): Uint8Array;
    signEd25519(data: Uint8Array, privateKey: any): Uint8Array;
    verifyEd25519(data: Uint8Array, signature: Uint8Array, publicKey: any): boolean;
};
