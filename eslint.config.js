import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "docs/", "examples/", "bin/"] },
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
    files: ["test/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
      },
    },
  }
);
