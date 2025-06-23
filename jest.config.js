/** @type {import('jest').Config} */
const config = {
  // Configuración de entorno
  testEnvironment: 'jsdom',
  
  // Archivos de setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Paths de módulos
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Patrones de archivos de prueba
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js)',
    '**/*.test.(ts|tsx|js)'
  ],
  
  // Ignorar estos archivos
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true
    }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // Clear mocks
  clearMocks: true,
  
  // Test timeout
  testTimeout: 10000,
  
  // Preset para TypeScript
  preset: 'ts-jest/presets/default-esm',
  
  // Extensiones de archivos
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
}

module.exports = config 