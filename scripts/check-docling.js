#!/usr/bin/env node

import { execSync } from 'child_process';

/**
 * Check for Python Docling CLI availability
 * 
 * This script verifies that the Python Docling package is installed and accessible.
 * It will be used as a postinstall check to ensure users have the required dependencies.
 * 
 * Requirements:
 * - Python 3.10+
 * - Docling package (pip install docling)
 * 
 * Exit codes:
 * - 0: Docling is available
 * - 1: Docling is not available or check failed
 */

/**
 * Check if Python is installed and get version
 * @returns {string|null} Python version string or null if not found
 */
function checkPython() {
  try {
    // Try python3 first (preferred on Unix systems)
    const version = execSync('python3 --version', { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'] 
    }).trim();
    return version;
  } catch {
    try {
      // Fallback to python (Windows or systems with python3 aliased)
      const version = execSync('python --version', { 
        encoding: 'utf8', 
        stdio: ['pipe', 'pipe', 'pipe'] 
      }).trim();
      return version;
    } catch {
      return null;
    }
  }
}

/**
 * Parse Python version string and check if it meets minimum requirement
 * @param {string} versionString - Python version string (e.g., "Python 3.10.5")
 * @returns {boolean} True if version >= 3.10
 */
function isPythonVersionValid(versionString) {
  const match = versionString.match(/Python (\d+)\.(\d+)/);
  if (!match) return false;
  
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  
  return major > 3 || (major === 3 && minor >= 10);
}

/**
 * Check if Docling package is installed
 * @returns {boolean} True if Docling is installed
 */
function checkDoclingInstalled() {
  try {
    // Try docling CLI directly (preferred method)
    execSync('docling --version', { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'] 
    });
    return true;
  } catch {
    try {
      // Try python3 -m docling
      execSync('python3 -m docling --version', { 
        encoding: 'utf8', 
        stdio: ['pipe', 'pipe', 'pipe'] 
      });
      return true;
    } catch {
      try {
        // Fallback to python -m docling
        execSync('python -m docling --version', { 
          encoding: 'utf8', 
          stdio: ['pipe', 'pipe', 'pipe'] 
        });
        return true;
      } catch {
        return false;
      }
    }
  }
}

/**
 * Main function to check Docling availability
 * @returns {Promise<{success: boolean, pythonVersion?: string, error?: string}>}
 */
export async function checkDocling() {
  // Check Python installation
  const pythonVersion = checkPython();
  
  if (!pythonVersion) {
    return {
      success: false,
      error: 'Python is not installed or not in PATH'
    };
  }
  
  // Check Python version
  if (!isPythonVersionValid(pythonVersion)) {
    return {
      success: false,
      pythonVersion,
      error: 'Python version must be 3.10 or higher'
    };
  }
  
  // Check Docling installation
  const doclingInstalled = checkDoclingInstalled();
  
  if (!doclingInstalled) {
    return {
      success: false,
      pythonVersion,
      error: 'Docling package is not installed'
    };
  }
  
  return {
    success: true,
    pythonVersion
  };
}

/**
 * Display helpful error message with installation instructions
 * @param {object} result - Check result object
 */
function displayErrorMessage(result) {
  console.error('\n❌ Docling Setup Required\n');
  console.error(`Error: ${result.error}\n`);
  
  if (result.error === 'Python is not installed or not in PATH') {
    console.error('Python 3.10 or higher is required to use this package.\n');
    console.error('Installation instructions:');
    console.error('  • macOS:   brew install python@3.11');
    console.error('  • Ubuntu:  sudo apt install python3.11');
    console.error('  • Windows: Download from https://www.python.org/downloads/\n');
    console.error('After installing Python, run: pip install docling\n');
  } else if (result.error === 'Python version must be 3.10 or higher') {
    console.error(`Found: ${result.pythonVersion}`);
    console.error('Required: Python 3.10 or higher\n');
    console.error('Upgrade instructions:');
    console.error('  • macOS:   brew upgrade python');
    console.error('  • Ubuntu:  sudo apt install python3.11');
    console.error('  • Windows: Download latest from https://www.python.org/downloads/\n');
    console.error('After upgrading Python, run: pip install docling\n');
  } else if (result.error === 'Docling package is not installed') {
    console.error(`Python version: ${result.pythonVersion} ✓\n`);
    console.error('Install Docling with:');
    console.error('  pip install docling\n');
    console.error('Or if using pip3:');
    console.error('  pip3 install docling\n');
    console.error('For more information, visit: https://github.com/DS4SD/docling\n');
  }
}

// Run the check if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDocling()
    .then((result) => {
      if (result.success) {
        console.log(`✓ Docling is available (${result.pythonVersion})`);
        process.exit(0);
      } else {
        displayErrorMessage(result);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Docling check failed unexpectedly\n');
      console.error(`Error: ${error.message}\n`);
      console.error('Please ensure Python 3.10+ is installed and run:');
      console.error('  pip install docling\n');
      process.exit(1);
    });
}
