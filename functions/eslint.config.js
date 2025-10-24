// functions/eslint.config.js
import js from '@eslint/js'

// Load plugins dynamically for ESM flat config
const tsParser = (await import('@typescript-eslint/parser')).default
const tsPlugin = (await import('@typescript-eslint/eslint-plugin')).default
const importPlugin = (await import('eslint-plugin-import')).default

export default [
    // 1) Ignore build artifacts & this config file itself
    { ignores: ['lib/**', 'node_modules/**', 'eslint.config.js'] },

    // 2) Base recommended rules
    js.configs.recommended,

    // 3) Our rules for JS/TS in this functions package
    {
        files: ['**/*.ts', '**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',        // Firebase Functions build/output
            parser: tsParser,              // TS syntax, but NOT type-aware
            globals: {
                module: 'writable',
                exports: 'writable',
                require: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            import: importPlugin,
        },
        rules: {
            // TS/Import basics without type info
            'import/no-unresolved': 'off', // module resolution can be odd in Functions
            'require-jsdoc': 'off',
            // Add anything you like here
        },
    },
]
