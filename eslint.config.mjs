import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    // Guard against bundling server credentials into the browser. `components/`
    // is where every client component lives, so the rule is scoped there rather
    // than applied globally, where it would flag legitimate server imports.
    // The real enforcement is the `server-only` import inside each module,
    // which fails the build regardless of where it is imported from.
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin", "@/lib/billing/dodo", "@/lib/storage/r2"],
              message:
                "This module holds server-only credentials and must not be imported by a client component. Use the corresponding route handler instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // The logger is the one place raw console output is intended.
    files: ["lib/logger.ts"],
    rules: { "no-console": "off" },
  },
  {
    // CLI tooling writes its report to stdout by design.
    files: ["scripts/**/*.mjs", "scripts/**/*.js"],
    rules: { "no-console": "off" },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
