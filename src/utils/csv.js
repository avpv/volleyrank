/**
 * CSV Parsing and Generation Utilities
 */

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvString) {
    const lines = csvString.trim().split('\n');
    
    if (lines.length < 2) {
        throw new Error('CSV must contain header and data rows');
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    
    // Parse data rows
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        
        data.push(row);
    }
    
    return data;
}

/**
 * Parse single CSV line handling quotes
 */
export function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values.map(v => v.replace(/^"|"$/g, ''));
}

/**
 * Convert array of objects to CSV string
 */
export function toCSV(data, headers = null) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Data must be a non-empty array');
    }
    
    // Auto-detect headers if not provided
    if (!headers) {
        headers = Object.keys(data[0]);
    }
    
    const lines = [];
    
    // Add header row
    lines.push(headers.map(h => escapeCSVValue(h)).join(','));
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            return escapeCSVValue(value);
        });
        lines.push(values.join(','));
    });
    
    return lines.join('\n');
}

/**
 * Escape CSV value (handle quotes, commas, newlines)
 */
export function escapeCSVValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    
    const stringValue = String(value);
    
    // If contains comma, quote, or newline, wrap in quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    
    return stringValue;
}

/**
 * Detect CSV delimiter
 */
export function detectDelimiter(csvString) {
    const delimiters = [',', ';', '\t', '|'];
    const firstLine = csvString.split('\n')[0];
    
    let maxCount = 0;
    let bestDelimiter = ',';
    
    delimiters.forEach(delimiter => {
        const count = (firstLine.match(new RegExp(delimiter, 'g')) || []).length;
        if (count > maxCount) {
            maxCount = count;
            bestDelimiter = delimiter;
        }
    });
    
    return bestDelimiter;
}

/**
 * Validate CSV structure
 */
export function validateCSV(csvString) {
    try {
        const lines = csvString.trim().split('\n');
        
        if (lines.length < 2) {
            return {
                isValid: false,
                error: 'CSV must have at least header and one data row'
            };
        }
        
        const headerCount = parseCSVLine(lines[0]).length;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const valueCount = parseCSVLine(line).length;
            if (valueCount !== headerCount) {
                return {
                    isValid: false,
                    error: `Row ${i + 1} has ${valueCount} values, expected ${headerCount}`
                };
            }
        }
        
        return { isValid: true };
    } catch (error) {
        return {
            isValid: false,
            error: error.message
        };
    }
}

/**
 * Generate CSV template
 */
export function generateTemplate(headers) {
    const headerRow = headers.map(h => escapeCSVValue(h)).join(',');
    const exampleRow = headers.map(() => '').join(',');
    return `${headerRow}\n${exampleRow}`;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvString, filename = 'data.csv') {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

export default {
    parseCSV,
    parseCSVLine,
    toCSV,
    escapeCSVValue,
    detectDelimiter,
    validateCSV,
    generateTemplate,
    downloadCSV
};
