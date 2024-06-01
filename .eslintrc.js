module.exports = // https://eslint.org/docs/user-guide/configuring/
{
    // https://eslint.org/docs/user-guide/configuring/language-options#specifying-environments
    "env": {
        "browser": true,
        "es2021": true
    },
    //
    // https://eslint.org/docs/user-guide/configuring/configuration-files#extending-configuration-files
    // https://typescript-eslint.io/docs/linting/configs
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:@typescript-eslint/strict"
    ],
    //
    // https://eslint.org/docs/user-guide/configuring/plugins#specifying-parser
    "parser": "@typescript-eslint/parser",
    //
    // https://eslint.org/docs/user-guide/configuring/language-options#specifying-parser-options
    // https://typescript-eslint.io/docs/linting/typed-linting/
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module",
        "tsconfigRootDir": __dirname,
        "project": [
            "./tsconfig.json"
        ]
    },
    //
    // https://eslint.org/docs/user-guide/configuring/plugins
    "plugins": [
        "@typescript-eslint"
    ],
    "ignorePatterns": [".eslintrc.js"],
    //
    // https://eslint.org/docs/user-guide/configuring/rules
    "rules": {
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
        "no-shadow": "error", // https://eslint.org/docs/latest/rules/no-shadow
        "no-template-curly-in-string": "warn", // https://eslint.org/docs/latest/rules/no-template-curly-in-string
        "no-throw-literal": "error", // https://eslint.org/docs/rules/no-throw-literal
        "no-useless-computed-key": "warn", // https://eslint.org/docs/latest/rules/no-useless-computed-key
        "prefer-promise-reject-errors": "error", // https://eslint.org/docs/rules/prefer-promise-reject-errors
        "prefer-template": "warn", //https://eslint.org/docs/latest/rules/prefer-template
        "semi": "warn", //semicolon https://eslint.org/docs/rules/semi
        "@typescript-eslint/consistent-indexed-object-style": "off", // https://typescript-eslint.io/rules/consistent-indexed-object-style/
        "@typescript-eslint/explicit-function-return-type": "error", // https://typescript-eslint.io/rules/explicit-function-return-type/
        "@typescript-eslint/explicit-member-accessibility": "warn", // https://typescript-eslint.io/rules/explicit-member-accessibility/
        "@typescript-eslint/no-floating-promises": "off", // https://typescript-eslint.io/rules/no-floating-promises/
        "@typescript-eslint/no-non-null-assertion": "off", // https://typescript-eslint.io/rules/no-non-null-assertion
        "@typescript-eslint/no-require-imports": "warn", // https://typescript-eslint.io/rules/no-require-imports/
        "@typescript-eslint/no-unnecessary-condition": "off", //https://typescript-eslint.io/rules/no-unnecessary-condition/
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/prefer-readonly": "warn", // https://typescript-eslint.io/rules/prefer-readonly/
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