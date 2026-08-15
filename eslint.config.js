import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // site/vendor/ and site/src/presets.generated.ts are build output (scripts/build-site.mjs).
  { ignores: ["dist/", "node_modules/", "docs/", "examples/", "bin/", "site/vendor/", "site/src/presets.generated.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // The CLI's page.evaluate callbacks run inside the browser context, where the
      // harness's window globals aren't visible to the Node-side type checker — `as any`
      // there is deliberate, not an oversight.
      "@typescript-eslint/no-explicit-any": "off",
      // `while (node.firstChild) node.removeChild(...)` style clear-loops and guard
      // clauses read better without forced braces; match the existing codebase.
      "prefer-const": ["error", { destructuring: "all" }],
    },
  },
  {
    files: ["test/**/*.mjs", "scripts/**/*.mjs", "site/**/*.mjs", "marketing/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        // marketing/compose.mjs stringifies one function to inject into a Playwright page —
        // its body runs in the browser, not in Node, same deliberate split as src/cli.ts's
        // page.evaluate callbacks.
        document: "readonly",
        window: "readonly",
      },
    },
  },
  {
    // The playground test's page.evaluate callbacks are Node source that runs inside the
    // browser — same situation cli.ts's own page.evaluate comment describes.
    files: ["site/**/*.spec.mjs"],
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        location: "readonly",
        Image: "readonly",
        Event: "readonly",
      },
    },
  }
);
