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
    plugins: ['@typescript-eslint'],
    parserOptions: {
        sourceType: 'module',
        // ecmaVersion: '2022',
        project: [
            path.join(__dirname, 'tsconfig.json'),
        ],
    },
    rules: {
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
