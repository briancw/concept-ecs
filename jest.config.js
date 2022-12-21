// https://jestjs.io/docs/configuration
export default {
    preset: 'ts-jest',
    // Hopefully ts-jest options won't be needed, but here they are in case
    // https://kulshekhar.github.io/ts-jest/docs/getting-started/options
    testEnvironment: 'node',
    // Coverage
    collectCoverage: true,
    // collectCoverageFrom: [],
    // coverageDirectory: '',
    // coveragePathIgnorePatterns: [],
    coverageProvider: 'v8',
}
