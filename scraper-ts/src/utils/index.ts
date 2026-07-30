/**
 * Utility Functions
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensure folder exists, create if not
 */
export function ensureFolderExists(folderPath: string): string {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
}

/**
 * Generate CSV filename with timestamp
 */
export function generateCSVFilename(asset: string, prefix: string = 'quotedata'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${asset.toLowerCase()}_${prefix}_${timestamp}.csv`;
}

/**
 * Validate CSV file
 */
export function validateCSVFile(
  filePath: string,
  minRows: number = 1
): {
  isValid: boolean;
  rowCount: number;
  errorMessage?: string;
} {
  if (!fs.existsSync(filePath)) {
    return {
      isValid: false,
      rowCount: 0,
      errorMessage: `File not found: ${filePath}`,
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = content.split('\n').filter(row => row.trim().length > 0);
    const rowCount = rows.length;

    if (rowCount < minRows) {
      return {
        isValid: false,
        rowCount,
        errorMessage: `File has only ${rowCount} rows (minimum ${minRows} required)`,
      };
    }

    return {
      isValid: true,
      rowCount,
    };
  } catch (error) {
    return {
      isValid: false,
      rowCount: 0,
      errorMessage: `Error reading file: ${error}`,
    };
  }
}

/**
 * Log scraper activity
 */
export function logScraperActivity(
  asset: string,
  status: 'START' | 'SUCCESS' | 'ERROR' | 'INFO',
  message: string = '',
  filePath?: string
): void {
  const icons: Record<string, string> = {
    START: '▶️',
    SUCCESS: '✅',
    ERROR: '❌',
    INFO: 'ℹ️',
  };

  const icon = icons[status] || '•';
  const timestamp = new Date().toLocaleTimeString();

  console.log(`[${timestamp}] ${icon} ${asset.toUpperCase()}: ${message}`);

  if (filePath) {
    console.log(`          → ${path.basename(filePath)}`);
  }
}

/**
 * Clean CSV data (remove empty rows, trim whitespace)
 */
export function cleanCSVData(inputPath: string, outputPath?: string): string {
  if (!outputPath) {
    outputPath = inputPath;
  }

  const content = fs.readFileSync(inputPath, 'utf-8');
  const rows = content
    .split('\n')
    .map(row => row.trim())
    .filter(row => row.length > 0);

  const cleanedContent = rows.join('\n');
  fs.writeFileSync(outputPath, cleanedContent, 'utf-8');

  return outputPath;
}

/**
 * Get timestamp string
 */
export function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}
