/**
 * String Utilities
 * Centralized string manipulation and sanitization functions
 *
 * This module provides reusable string utilities used across the application,
 * eliminating code duplication and ensuring consistent behavior.
 */

import uiConfig from '../config/ui.js';

/**
 * HTML escape map for security
 * Maps dangerous characters to their HTML entity equivalents
 */
const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
};

/**
 * Regex pattern for HTML escaping
 * Matches all characters that need to be escaped
 */
const HTML_ESCAPE_REGEX = /[&<>"'\/]/g;

/**
 * Escapes HTML special characters to prevent XSS attacks
 *
 * Converts potentially dangerous characters to their HTML entity equivalents:
 * - & becomes &amp;
 * - < becomes &lt;
 * - > becomes &gt;
 * - " becomes &quot;
 * - ' becomes &#x27;
 * - / becomes &#x2F;
 *
 * @param {string} str - The string to escape
 * @returns {string} The escaped string safe for HTML insertion
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
 *
 * @example
 * escapeHtml("User's name")
 * // Returns: 'User&#x27;s name'
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') {
        return String(str);
    }
    return str.replace(HTML_ESCAPE_REGEX, char => HTML_ESCAPE_MAP[char]);
}

/**
 * Sanitizes player name input
 * Removes leading/trailing whitespace and limits length
 *
 * @param {string} name - The name to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 50)
 * @returns {string} The sanitized name
 *
 * @example
 * sanitizeName('  John Doe  ')
 * // Returns: 'John Doe'
 *
 * @example
 * sanitizeName('A'.repeat(100), 10)
 * // Returns: 'AAAAAAAAAA' (truncated to 10 chars)
 */
export function sanitizeName(name, maxLength = uiConfig.INPUT_CONSTRAINTS.TEXT_TRUNCATE.DEFAULT_MAX_LENGTH) {
    if (typeof name !== 'string') {
        return '';
    }
    return name.trim().slice(0, maxLength);
}

/**
 * Capitalizes the first letter of a string
 *
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 *
 * @example
 * capitalize('hello world')
 * // Returns: 'Hello world'
 */
export function capitalize(str) {
    if (typeof str !== 'string' || str.length === 0) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to title case
 * Capitalizes the first letter of each word
 *
 * @param {string} str - The string to convert
 * @returns {string} The title-cased string
 *
 * @example
 * toTitleCase('hello world')
 * // Returns: 'Hello World'
 */
export function toTitleCase(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Truncates a string to a maximum length
 * Adds ellipsis (...) if truncated
 *
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @param {string} suffix - Suffix to add when truncated (default: '...')
 * @returns {string} The truncated string
 *
 * @example
 * truncate('This is a long string', 10)
 * // Returns: 'This is a...'
 */
export function truncate(str, maxLength, suffix = '...') {
    if (typeof str !== 'string') {
        return '';
    }
    if (str.length <= maxLength) {
        return str;
    }
    return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Pluralizes a word based on count
 *
 * @param {number} count - The count to check
 * @param {string} singular - Singular form of the word
 * @param {string} plural - Plural form of the word (optional, adds 's' by default)
 * @returns {string} The word with appropriate plural/singular form
 *
 * @example
 * pluralize(1, 'player')
 * // Returns: '1 player'
 *
 * @example
 * pluralize(5, 'player')
 * // Returns: '5 players'
 *
 * @example
 * pluralize(2, 'category', 'categories')
 * // Returns: '2 categories'
 */
export function pluralize(count, singular, plural = null) {
    const word = count === 1 ? singular : (plural || `${singular}s`);
    return `${count} ${word}`;
}

/**
 * Generates initials from a name
 *
 * @param {string} name - The full name
 * @param {number} maxInitials - Maximum number of initials (default: 2)
 * @returns {string} The initials in uppercase
 *
 * @example
 * getInitials('John Doe')
 * // Returns: 'JD'
 *
 * @example
 * getInitials('Mary Jane Watson', 3)
 * // Returns: 'MJW'
 */
export function getInitials(name, maxInitials = 2) {
    if (typeof name !== 'string' || !name.trim()) {
        return '';
    }

    const words = name.trim().split(/\s+/);
    const initials = words
        .slice(0, maxInitials)
        .map(word => word.charAt(0).toUpperCase())
        .join('');

    return initials;
}

/**
 * Removes all whitespace from a string
 *
 * @param {string} str - The string to process
 * @returns {string} The string without whitespace
 *
 * @example
 * removeWhitespace('  Hello  World  ')
 * // Returns: 'HelloWorld'
 */
export function removeWhitespace(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str.replace(/\s+/g, '');
}

/**
 * Normalizes whitespace in a string
 * Replaces multiple spaces with single space and trims
 *
 * @param {string} str - The string to normalize
 * @returns {string} The normalized string
 *
 * @example
 * normalizeWhitespace('  Hello    World  ')
 * // Returns: 'Hello World'
 */
export function normalizeWhitespace(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str.trim().replace(/\s+/g, ' ');
}

/**
 * Checks if a string is empty or only whitespace
 *
 * @param {string} str - The string to check
 * @returns {boolean} True if empty or whitespace only
 *
 * @example
 * isEmpty('   ')
 * // Returns: true
 *
 * @example
 * isEmpty('Hello')
 * // Returns: false
 */
export function isEmpty(str) {
    return typeof str !== 'string' || str.trim().length === 0;
}

/**
 * Converts a string to a URL-friendly slug
 *
 * @param {string} str - The string to convert
 * @returns {string} The slugified string
 *
 * @example
 * slugify('Hello World!')
 * // Returns: 'hello-world'
 */
export function slugify(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Default export with all string utilities
 */
export default {
    escapeHtml,
    sanitizeName,
    capitalize,
    toTitleCase,
    truncate,
    pluralize,
    getInitials,
    removeWhitespace,
    normalizeWhitespace,
    isEmpty,
    slugify
};
