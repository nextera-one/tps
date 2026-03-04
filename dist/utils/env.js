"use strict";
/**
 * Environment & Compatibility Layer
 * Abstracts Node.js vs Browser differences.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Env = void 0;
/* eslint-disable @typescript-eslint/no-require-imports */
const isNode = typeof require !== "undefined";
/**
 * Node.js crypto module (conditional)
 */
const crypto = isNode ? require("crypto") : null;
/**
 * Node.js zlib module (conditional)
 */
const zlib = isNode ? require("zlib") : null;
exports.Env = {
    isNode,
    randomBytes(length) {
        if (isNode && crypto) {
            return new Uint8Array(crypto.randomBytes(length));
        }
        if (typeof window !== "undefined" && window.crypto) {
            return window.crypto.getRandomValues(new Uint8Array(length));
        }
        throw new Error("TPS: randomBytes not available in this environment");
    },
    deflate(data) {
        if (isNode && zlib) {
            return new Uint8Array(zlib.deflateRawSync(data));
        }
        throw new Error("TPS: deflate not available in this environment");
    },
    inflate(data) {
        if (isNode && zlib) {
            return new Uint8Array(zlib.inflateRawSync(data));
        }
        throw new Error("TPS: inflate not available in this environment");
    },
    signEd25519(data, privateKey) {
        if (isNode && crypto) {
            let key;
            if (typeof privateKey === "string") {
                if (privateKey.includes("PRIVATE KEY")) {
                    key = privateKey;
                }
                else {
                    key = crypto.createPrivateKey({
                        key: Buffer.from(privateKey, "hex"),
                        format: "der",
                        type: "pkcs8",
                    });
                }
            }
            else if (typeof privateKey === "object" &&
                privateKey !== null &&
                "asymmetricKeyType" in privateKey) {
                key = privateKey;
            }
            else {
                key = crypto.createPrivateKey({
                    key: Buffer.from(privateKey),
                    format: "der",
                    type: "pkcs8",
                });
            }
            return new Uint8Array(crypto.sign(null, data, key));
        }
        throw new Error("TPS: signEd25519 not available in this environment");
    },
    verifyEd25519(data, signature, publicKey) {
        if (isNode && crypto) {
            return crypto.verify(null, data, publicKey, signature);
        }
        throw new Error("TPS: verifyEd25519 not available in this environment");
    },
};
//# sourceMappingURL=env.js.map