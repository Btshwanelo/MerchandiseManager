/**
 * CSV Parser Utility
 * Handles parsing of CSV files for inventory and store uploads
 */

/**
 * Parse a CSV file and return an array of objects
 * @param file The CSV file to parse
 * @param headerMapping Object mapping CSV headers to database fields
 * @returns Promise resolving to an array of parsed objects
 */
export async function parseCSV<T>(
  file: File, 
  headerMapping: Record<string, string>
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          reject(new Error("Failed to read file"));
          return;
        }
        
        const csvText = event.target.result as string;
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error("CSV file must contain headers and at least one data row"));
          return;
        }
        
        // Parse headers (first line)
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Map CSV headers to database fields
        const fieldIndices: Record<string, number> = {};
        for (const csvHeader in headerMapping) {
          const index = headers.findIndex(h => h.toLowerCase() === csvHeader.toLowerCase());
          if (index !== -1) {
            fieldIndices[headerMapping[csvHeader]] = index;
          }
        }
        
        // Required fields check
        const missingFields = Object.keys(headerMapping)
          .filter(csvHeader => !headers.some(h => h.toLowerCase() === csvHeader.toLowerCase()));
          
        if (missingFields.length > 0) {
          reject(new Error(`Missing required CSV headers: ${missingFields.join(', ')}`));
          return;
        }

        // Parse data rows
        const result: T[] = [];
        for (let i = 1; i < lines.length; i++) {
          // Handle commas within quoted fields
          let currentLine = lines[i];
          const values: string[] = [];
          let insideQuotes = false;
          let currentValue = '';
          
          for (let j = 0; j < currentLine.length; j++) {
            const char = currentLine[j];
            
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          
          values.push(currentValue.trim()); // Add the last value
          
          // Create object using the mapped fields
          const row: Record<string, string> = {};
          for (const field in fieldIndices) {
            const index = fieldIndices[field];
            // Handle removing quotes if present
            let value = values[index] || '';
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.substring(1, value.length - 1);
            }
            row[field] = value;
          }
          
          result.push(row as unknown as T);
        }
        
        resolve(result);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse CSV'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Generate a sample CSV template with headers
 * @param headers Array of header names
 * @returns CSV string with headers
 */
export function generateCSVTemplate(headers: string[]): string {
  return headers.join(',') + '\n';
}

/**
 * Download a string as a CSV file
 * @param content The CSV content
 * @param filename The filename to use
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}