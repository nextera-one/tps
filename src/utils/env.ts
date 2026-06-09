/**
 * Environment & Compatibility Layer
 * Abstracts Node.js vs Browser differences.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Detect Node.js in a way that works under BOTH CommonJS and native ESM.
 * `typeof require` is unreliable: `require` is undefined in ESM even on Node,
 * which previously made every crypto/zlib path throw when the package was
 * imported as ESM. `process.versions.node` is present in both module systems.
 */
const isNode =
  typeof process !== "undefined" &&
  !!(process as any).versions &&
  !!(process as any).versions.node;

/**
 * The Web Crypto API (`globalThis.crypto`) is present in both CommonJS and
 * native ESM on modern Node and in browsers, so it is the most portable source
 * of secure random bytes. Node builtins are only needed for zlib and Ed25519.
 */
const webCrypto: Crypto | null =
  typeof globalThis !== "undefined" && (globalThis as any).crypto
    ? (globalThis as any).crypto
    : null;

/**
 * Load a Node.js builtin module in a module-system-agnostic way, without
 * `eval` or `import.meta` (which are illegal in the opposite build target).
 *
 * 1. CommonJS build: `require` exists directly.
 * 2. Native ESM build: `require` is undefined, so we use
 *    `process.getBuiltinModule` (Node >= 22.3) which returns builtins
 *    synchronously regardless of module system.
 *
 * Browsers/Deno have neither and simply get `null`, falling back to Web APIs.
 */
function loadNodeBuiltin(name: string): any {
  if (!isNode) return null;
  if (typeof require !== "undefined") {
    try {
      return require(name);
    } catch {
      /* fall through */
    }
  }
  const getBuiltin = (process as any).getBuiltinModule;
  if (typeof getBuiltin === "function") {
    try {
      return getBuiltin.call(process, name);
    } catch {
      /* not resolvable */
    }
  }
  return null;
}

/**
 * Node.js crypto module (conditional) — used for Ed25519 sign/verify only.
 */
const crypto = loadNodeBuiltin("node:crypto") ?? loadNodeBuiltin("crypto");

/**
 * Node.js zlib module (conditional).
 */
const zlib = loadNodeBuiltin("node:zlib") ?? loadNodeBuiltin("zlib");

export const Env = {
  isNode,

  randomBytes(length: number): Uint8Array {
    // Prefer Web Crypto: available in both CJS and ESM on Node and in browsers.
    if (webCrypto && typeof webCrypto.getRandomValues === "function") {
      return webCrypto.getRandomValues(new Uint8Array(length));
    }
    if (crypto) {
      return new Uint8Array(crypto.randomBytes(length));
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
