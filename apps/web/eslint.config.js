// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      // Disable prefer-inject rule - constructor injection is still valid and widely used
      "@angular-eslint/prefer-inject": "off",
      // Allow type aliases - generated models use type instead of interface
      "@typescript-eslint/consistent-type-definitions": "off",
      // Allow explicit any in specific cases - will be addressed incrementally
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars with underscore prefix and in catch clauses
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_|error|err",
        },
      ],
      // Allow empty functions for interface implementations
      "@typescript-eslint/no-empty-function": "warn",
      // Allow case declarations with proper scoping
      "no-case-declarations": "warn",
      // Allow empty lifecycle methods (will be addressed incrementally)
      "@angular-eslint/no-empty-lifecycle-method": "warn",
      // Allow async promise executors (legacy code pattern)
      "no-async-promise-executor": "warn",
      // Allow require imports in specific cases (e.g., dynamic imports)
      "@typescript-eslint/no-require-imports": "warn",
      // Allow non-standalone components (legacy code pattern)
      "@angular-eslint/prefer-standalone": "warn",
    },
  },
  {
    // Relaxed rules for generated model files (orb-schema-generator issue #59)
    files: ["**/core/models/*Model.ts", "**/core/models/*Enum.ts", "**/core/enums/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // Accessibility rules as warnings for incremental improvement
      "@angular-eslint/template/click-events-have-key-events": "warn",
      "@angular-eslint/template/interactive-supports-focus": "warn",
      "@angular-eslint/template/label-has-associated-control": "warn",
      "@angular-eslint/template/no-negated-async": "warn",
    },
  }
);
