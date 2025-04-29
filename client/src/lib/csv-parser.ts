/**
 * CSV parser utility for parsing CSV files with validation
 */

interface CsvParserOptions<T> {
  delimiter?: string;
  required?: Array<keyof T>;
  validate?: (row: Partial<T>) => string[];
}

/**
 * Read a File object as text
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
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
 * Parse CSV data into an array of objects with validation
 * @param csvData - Either a File object or a CSV string
 * @param headerMapping - Mapping from CSV headers to object properties
 * @param options - Additional options for parsing
 */
export async function parseCSV<T>(
  csvData: File | string,
  headerMapping: Record<string, string> = {},
  options: CsvParserOptions<T> = {}
): Promise<T[]> {
  let csvContent: string;
  
  // Handle File object
  if (csvData instanceof File) {
    csvContent = await readFileAsText(csvData);
  } else {
    csvContent = csvData;
  }
  
  const delimiter = options.delimiter || ',';
  const required = options.required || [];
  const validate = options.validate;
  
  const errors: string[] = [];
  const data: T[] = [];
  
  // Split content into lines
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }
  
  // Parse header row
  const headers = lines[0].split(delimiter).map(header => header.trim());
  
  // Validate that required columns exist
  for (const requiredField of required) {
    if (!headers.includes(requiredField as string)) {
      throw new Error(`Required column "${String(requiredField)}" is missing from CSV headers`);
    }
  }
  
  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const rowData = parseRow(line, delimiter);
    const rowObject: Record<string, any> = {};
    
    // Map column values to object properties
    headers.forEach((header, index) => {
      // Map to the target property name if provided in headerMapping
      const targetProp = headerMapping[header] || header;
      rowObject[targetProp] = rowData[index] || '';
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
      // Continue to next row, don't add rows with errors
    } else {
      data.push(rowObject as T);
    }
  }
  
  // If there are errors, throw with the first error message
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }
  
  return data;
}