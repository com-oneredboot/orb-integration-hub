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
      // Allow explicit any - will be addressed incrementally
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars with underscore prefix allowed, catch clause errors allowed
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: ".*",
        },
      ],
      // Allow empty functions for interface implementations (ControlValueAccessor, etc.)
      "@typescript-eslint/no-empty-function": "off",
      // Allow non-standalone components - migration path, not a bug
      "@angular-eslint/prefer-standalone": "warn",
    },
  },

  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // Accessibility rules as warnings - incremental improvement
      "@angular-eslint/template/click-events-have-key-events": "warn",
      "@angular-eslint/template/interactive-supports-focus": "warn",
      "@angular-eslint/template/label-has-associated-control": "warn",
    },
  }
);
