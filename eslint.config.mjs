// @ts-check

import eslint from '@eslint/js';
import globals from "globals";
import tsEslint from 'typescript-eslint';


export default tsEslint.config(
    eslint.configs.recommended,
    tsEslint.configs.recommendedTypeChecked,
    tsEslint.configs.stylisticTypeChecked,
    tsEslint.configs.strictTypeChecked,
    {
        // https://eslint.org/docs/latest/use/configure/ignore
        ignores: ["eslint.config.mjs", "**/*.js"],
    },
    {
        // https://eslint.org/docs/latest/use/configure/language-options
        languageOptions: {

            // https://eslint.org/docs/latest/use/configure/language-options#predefined-global-variables
            globals: {
                ...globals.browser,
            },

            // https://typescript-eslint.io/getting-started/typed-linting
            // https://typescript-eslint.io/packages/parser
            parserOptions: {
                projectService: true, // https://typescript-eslint.io/packages/parser#projectservice
                tsconfigRootDir: import.meta.dirname, // https://typescript-eslint.io/packages/parser#tsconfigrootdir
            },
        },


        // https://eslint.org/docs/latest/use/configure/rules
        rules: {
            "array-callback-return": "warn", // https://eslint.org/docs/latest/rules/array-callback-return
            "consistent-return": "error", // https://eslint.org/docs/rules/consistent-return
            "default-case-last": "warn", // https://eslint.org/docs/rules/default-case-last
            "dot-notation": "warn", // https://eslint.org/docs/latest/rules/dot-notation
            "eqeqeq": "warn", // https://eslint.org/docs/latest/rules/eqeqeq
            "new-cap": ["error", // https://eslint.org/docs/rules/new-cap
                { "capIsNewExceptionPattern": "[A-Z_]+" } // allow all-uppercase
            ],
            "no-array-constructor": "warn", // https://eslint.org/docs/rules/no-array-constructor   
            "no-confusing-arrow": "warn", // https://eslint.org/docs/rules/no-confusing-arrow
            "no-debugger": "warn", // https://eslint.org/docs/latest/rules/no-debugger
            "no-empty": "warn", // https://eslint.org/docs/rules/no-empty
            "no-empty-function": "off", // https://eslint.org/docs/latest/rules/no-empty-function
            "no-invalid-this": "error", // https://eslint.org/docs/rules/no-invalid-this
            "no-loop-func": "error", // https://eslint.org/docs/rules/no-loop-func
            "no-param-reassign": "error", // https://eslint.org/docs/rules/no-param-reassign
            "no-promise-executor-return": "warn", // https://eslint.org/docs/latest/rules/no-promise-executor-return
            "no-template-curly-in-string": "warn", // https://eslint.org/docs/latest/rules/no-template-curly-in-string
            "no-throw-literal": "error", // https://eslint.org/docs/rules/no-throw-literal
            "no-useless-computed-key": "warn", // https://eslint.org/docs/latest/rules/no-useless-computed-key
            "prefer-promise-reject-errors": "error", // https://eslint.org/docs/rules/prefer-promise-reject-errors
            "prefer-template": "warn", //https://eslint.org/docs/latest/rules/prefer-template
            "semi": "warn", //semicolon https://eslint.org/docs/rules/semi
            "@typescript-eslint/no-unnecessary-type-parameters": "warn", // https://typescript-eslint.io/rules/no-unnecessary-type-parameters/
            "@typescript-eslint/consistent-indexed-object-style": "off", // https://typescript-eslint.io/rules/consistent-indexed-object-style/
            "@typescript-eslint/explicit-function-return-type": "error", // https://typescript-eslint.io/rules/explicit-function-return-type/
            "@typescript-eslint/explicit-member-accessibility": "warn", // https://typescript-eslint.io/rules/explicit-member-accessibility/
            "@typescript-eslint/no-floating-promises": "off", // https://typescript-eslint.io/rules/no-floating-promises/
            "@typescript-eslint/no-non-null-assertion": "off", // https://typescript-eslint.io/rules/no-non-null-assertion
            "@typescript-eslint/no-require-imports": "warn", // https://typescript-eslint.io/rules/no-require-imports/
            "@typescript-eslint/no-unnecessary-condition": "off", //https://typescript-eslint.io/rules/no-unnecessary-condition/
            "@typescript-eslint/no-unused-vars": "warn", // https://typescript-eslint.io/rules/no-unused-vars
            "@typescript-eslint/prefer-readonly": "warn", // https://typescript-eslint.io/rules/prefer-readonly/
            "@typescript-eslint/consistent-type-definitions": "off", // https://typescript-eslint.io/rules/consistent-type-definitions/

            // doc says it defaults to true but it was showing the error anyway
            // https://typescript-eslint.io/rules/restrict-template-expressions/#allownumber
            "@typescript-eslint/restrict-template-expressions": ["warn", { "allowNumber": true }],

            // https://typescript-eslint.io/rules/no-confusing-void-expression/#ignorearrowshorthand
            "@typescript-eslint/no-confusing-void-expression": ["error", { "ignoreArrowShorthand": true }],


            // https://typescript-eslint.io/rules/naming-convention/
            "@typescript-eslint/naming-convention": [
                "warn",
                {
                    "selector": ["property", "memberLike"],
                    "modifiers": ["readonly"],
                    "format": ["UPPER_CASE"]
                }
            ],
            "no-shadow": "off",
            "@typescript-eslint/no-shadow": ["error"]

        }
    }

);