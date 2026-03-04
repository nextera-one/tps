import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const banner = `/*! TPS v${pkg.version} | Apache-2.0 */`;

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/tps.min.js",
      format: "iife",
      name: "TPS",
      banner,
      exports: "named",
      sourcemap: false,
    },
  ],
  plugins: [
    resolve({ preferBuiltins: true }),
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: false,
      sourceMap: false,
    }),
  ],
  // Node builtins (crypto, zlib) are optional in browser; stub them out
  external: [],
};
