/**
 * File classification utilities
 * Detects test files and library files based on path patterns
 */

/**
 * Test file patterns
 */
const TEST_FILE_PATTERNS = [
  /\.test\.(ts|js|tsx|jsx|py|java|cs)$/i,
  /\.spec\.(ts|js|tsx|jsx|py|java|cs)$/i,
  /_test\.(ts|js|tsx|jsx|py|java|cs)$/i,
  /_spec\.(ts|js|tsx|jsx|py|java|cs)$/i,
  /test_.*\.(py|java|cs)$/i,
];

/**
 * Test directory patterns
 */
const TEST_DIR_PATTERNS = [
  /__tests__\//,
  /\/tests?\//,
  /\/spec\//,
  /\/test\//,
];

/**
 * Library/vendor directory patterns
 */
const LIBRARY_DIR_PATTERNS = [
  /\/node_modules\//,
  /\/vendor\//,
  /\/packages\//,
  /\/dist\//,
  /\/build\//,
  /\/out\//,
  /\/target\//,
  /\/bin\//,
  /\/obj\//,
  /\/.venv\//,
  /\/venv\//,
  /\/site-packages\//,
];

/**
 * Check if a file path represents a test file
 */
export function isTestFile(filePath: string): boolean {
  // Check filename patterns
  for (const pattern of TEST_FILE_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }

  // Check directory patterns
  for (const pattern of TEST_DIR_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a file path represents a library/vendor file
 */
export function isLibraryFile(filePath: string): boolean {
  for (const pattern of LIBRARY_DIR_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Classify a file path
 */
export interface FileClassification {
  isTest: boolean;
  isLibrary: boolean;
}

export function classifyFile(filePath: string): FileClassification {
  return {
    isTest: isTestFile(filePath),
    isLibrary: isLibraryFile(filePath),
  };
}
