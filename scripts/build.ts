import { $ } from "bun";
import pkg from "../package.json";

const result = await Bun.build({
  entrypoints: ["src/cli/index.ts"],
  outdir: "dist/bin",
  naming: "cli.mjs",
  target: "node",
  format: "esm",
  minify: true,
  sourcemap: "external",
  packages: "external",
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  banner: "#!/usr/bin/env node",
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

await $`chmod +x dist/bin/cli.mjs`;
console.log("Build complete: dist/bin/cli.mjs");
