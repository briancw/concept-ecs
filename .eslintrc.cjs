// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path')

module.exports = {
    root: true,
    extends: [
        'brian',
        'plugin:@typescript-eslint/recommended',
        // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    env: {
        es2022: true,
        node: true,
    },
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
        'eslint-plugin-tsdoc',
    ],
    parserOptions: {
        sourceType: 'module',
        // ecmaVersion: '2022',
        project: [
            path.join(__dirname, 'tsconfig.json'),
        ],
    },
    rules: {
        'no-bitwise': 'off',
        'unicorn/filename-case': 'off',
        'import/default': 'off', // Doesn't seem to work well with TS projects
        'tsdoc/syntax': 'warn',
    },
    ignorePatterns: [
        'dist',
    ],
    // Fix import resolution failing
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.ts'],
                // moduleDirectory: ['./'],
            },
        },
    },
}
