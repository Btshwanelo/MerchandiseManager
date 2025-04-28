/**
 * CSV parser utility for parsing CSV files with validation
 */

interface CsvParserOptions<T> {
  delimiter?: string;
  required?: Array<keyof T>;
  validate?: (row: Partial<T>) => string[];
}

interface CsvParserResult<T> {
  data: T[];
  errors: string[];
}

/**
 * Generate a CSV template string based on provided headers
 */
export function generateCSVTemplate(headers: string[], sampleData: string[][] = []): string {
  let csv = headers.join(',') + '\n';
  
  // Add sample data rows if provided
  if (sampleData.length > 0) {
    sampleData.forEach(row => {
      csv += row.join(',') + '\n';
    });
  }
  
  return csv;
}

/**
 * Download a CSV file with the provided content
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse CSV string into an array of objects with validation
 */
export async function parseCSV<T>(
  csvContent: string,
  options: CsvParserOptions<T> = {}
): Promise<CsvParserResult<T>> {
  const delimiter = options.delimiter || ',';
  const required = options.required || [];
  const validate = options.validate;
  
  const errors: string[] = [];
  const data: T[] = [];
  
  // Split content into lines
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    errors.push('CSV file must contain at least a header row and one data row');
    return { data, errors };
  }
  
  // Parse header row
  const headers = lines[0].split(delimiter).map(header => header.trim());
  
  // Validate that required columns exist
  for (const requiredField of required) {
    if (!headers.includes(requiredField as string)) {
      errors.push(`Required column "${String(requiredField)}" is missing from CSV headers`);
    }
  }
  
  if (errors.length > 0) {
    return { data, errors };
  }
  
  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const rowData = parseRow(line, delimiter);
    const rowObject: Record<string, any> = {};
    
    // Map column values to object properties
    headers.forEach((header, index) => {
      rowObject[header] = rowData[index] || '';
    });
    
    // Check required fields
    const rowErrors: string[] = [];
    
    for (const requiredField of required) {
      if (!rowObject[requiredField as string]) {
        rowErrors.push(`Row ${i}: Missing required field "${String(requiredField)}"`);
      }
    }
    
    // Run custom validation if provided
    if (validate) {
      const validationErrors = validate(rowObject as Partial<T>);
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
          rowErrors.push(`Row ${i}: ${error}`);
        });
      }
    }
    
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      data.push(rowObject as T);
    }
  }
  
  return { data, errors };
}

/**
 * Parse a single CSV row, handling quoted values and escaped quotes
 */
function parseRow(row: string, delimiter: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote inside quotes
        currentValue += '"';
        i++;
      } else {
        // Toggle insideQuotes flag
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      // End of value
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      // Regular character
      currentValue += char;
    }
  }
  
  // Add the last value
  values.push(currentValue.trim());
  
  return values;
}