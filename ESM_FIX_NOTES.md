# ESM Compatibility Fix — Notes & Follow-ups (v0.8.1)

Author: automated fix on 2026-06-09. Branch: `fix/esm-node-compat`.

## What was broken

`@nextera.one/tps-standard@0.8.0` could not be imported as **native ESM on Node**.
This blocked `@nextera.one/openlogs-sdk` (and therefore the OpenExecution/IDEL
runtime, which is `"type": "module"`) from loading at all. Three distinct bugs:

1. **Extensionless relative imports in the ESM build.** `dist/esm/*.js` emitted
   `import ... from "./drivers/gregorian"` (no extension). Node's ESM resolver
   requires explicit extensions → `ERR_MODULE_NOT_FOUND`. Root cause: the ESM
   `tsconfig` used `moduleResolution: bundler`, which tells TypeScript not to
   require/emit extensions — but the output is loaded directly by Node, not a
   bundler.

2. **Node detection via `typeof require`.** `require` is `undefined` in ESM even
   on Node, so `isNode` was `false` under ESM → `crypto` and `zlib` were `null`
   → `randomBytes`, `deflate`/`inflate`, `signEd25519`, `verifyEd25519` all threw
   "not available in this environment". This silently breaks TPS-UID generation
   and any signing path when imported as ESM.

3. **Node builtins unreachable in ESM.** Even with correct detection, builtins
   were loaded only via `require`. ESM has no `require`.

## What changed

- **Source**: added explicit `.js` extensions to all 51 relative import/export
  specifiers across 14 `src/*.ts` files.
- **`src/utils/env.ts`**:
  - `isNode` now uses `process.versions.node` (works in CJS and ESM).
  - `randomBytes` prefers Web Crypto (`globalThis.crypto.getRandomValues`),
    available in both module systems and browsers.
  - Node builtins load via `require` when present, else
    `process.getBuiltinModule(name)` (Node ≥ 22.3), else `null`.
- **`tsconfig.esm.json`**: `module: ESNext`, `moduleResolution: Bundler`
  (extensions in source are now preserved in the emit).
- **`package.json` build script**: writes `dist/esm/package.json`
  `{"type":"module"}` so Node treats the ESM build as ESM with no reparse warning.
- **`tsconfig.json`**: `ts-node.experimentalResolver: true` so the existing
  `npx ts-node` test suite resolves `.js`-suffixed source imports to `.ts`.

## Verification done

- `npm run build` clean (CJS + ESM).
- `npm run tests` — all suites pass (9 + 68 + 13 + 9 + 32 + 44, 0 failures).
- ESM entry loads under Node with no warning; drivers, `toURI`/`parse`,
  TPS-UID encode (compressed + uncompressed) all work.
- CJS unchanged (no regression).
- **End-to-end**: linked into `@nextera.one/openlogs-sdk` and ran the full
  signed v2 chain under ESM — `createV2Record → signV2Record → verifyV2Chain`
  returns `ok:true, integrity:true, sig:true, trusted:1`.

## ⚠️ Open items / things to confirm on review

1. **PUBLISH REQUIRED.** Version is bumped to **0.8.1** but NOT published to npm
   (the automation environment is not authenticated to npm). To release:
   ```
   cd tps && npm run build && npm run bundle && npm publish --access public
   ```
   Until this is published, downstream consumers (openlogs-sdk → IDEL) depend on
   it via a local link / overlay, not the registry.

2. **`process.getBuiltinModule` requires Node ≥ 22.3.** For the **ESM build on
   Node 20–22.2**, `zlib`/`node:crypto` will be `null` (no `require`, no
   `getBuiltinModule`). Impact: compressed TPS-UID (`deflate`) and TPS's own
   Ed25519 helpers degrade on that narrow range under ESM. `randomBytes` still
   works there (Web Crypto). If Node 20 ESM must be fully supported, add a
   `createRequire(import.meta.url)` path in an ESM-only shim. CJS is unaffected
   on all supported versions.

3. **`dist/` is committed.** This repo checks in build output. The committed
   `dist` was regenerated; keep `build && bundle` in sync with source on every
   change, or move `dist` to a publish-time-only artifact.

4. **Browser bundle circular-dep warning** (`index ↔ uid`, `index ↔ date`) is
   pre-existing and not introduced by this fix; left as-is.
