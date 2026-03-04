/**
 * Environment & Compatibility Layer
 * Abstracts Node.js vs Browser differences.
 */

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

export const Env = {
  isNode,

  randomBytes(length: number): Uint8Array {
    if (isNode && crypto) {
      return new Uint8Array(crypto.randomBytes(length));
    }
    if (typeof window !== "undefined" && window.crypto) {
      return window.crypto.getRandomValues(new Uint8Array(length));
    }
    throw new Error("TPS: randomBytes not available in this environment");
  },

  deflate(data: Uint8Array): Uint8Array {
    if (isNode && zlib) {
      return new Uint8Array(zlib.deflateRawSync(data));
    }
    throw new Error("TPS: deflate not available in this environment");
  },

  inflate(data: Uint8Array): Uint8Array {
    if (isNode && zlib) {
      return new Uint8Array(zlib.inflateRawSync(data));
    }
    throw new Error("TPS: inflate not available in this environment");
  },

  signEd25519(data: Uint8Array, privateKey: any): Uint8Array {
    if (isNode && crypto) {
      let key: any;
      if (typeof privateKey === "string") {
        if (privateKey.includes("PRIVATE KEY")) {
          key = privateKey;
        } else {
          key = crypto.createPrivateKey({
            key: Buffer.from(privateKey, "hex"),
            format: "der",
            type: "pkcs8",
          });
        }
      } else if (
        typeof privateKey === "object" &&
        privateKey !== null &&
        "asymmetricKeyType" in privateKey
      ) {
        key = privateKey;
      } else {
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

  verifyEd25519(
    data: Uint8Array,
    signature: Uint8Array,
    publicKey: any,
  ): boolean {
    if (isNode && crypto) {
      return crypto.verify(null, data, publicKey, signature);
    }
    throw new Error("TPS: verifyEd25519 not available in this environment");
  },
};
