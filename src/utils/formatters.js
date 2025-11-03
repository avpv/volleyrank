// src/utils/formatters.js

/**
 * Data Formatting Utilities
 */

/**
 * Format ELO rating
 */
export function formatRating(rating) {
    return Math.round(rating);
}

/**
 * Format date
 */
export function formatDate(dateString, format = 'short') {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }
    
    if (format === 'short') {
        return date.toLocaleDateString();
    }
    
    if (format === 'long') {
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    if (format === 'time') {
        return date.toLocaleTimeString();
    }
    
    if (format === 'datetime') {
        return date.toLocaleString();
    }
    
    return date.toISOString();
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 0) {
    return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format position name
 */
export function formatPosition(positionKey) {
    const positions = {
        'S': 'Setter',
        'OPP': 'Opposite',
        'OH': 'Outside Hitter',
        'MB': 'Middle Blocker',
        'L': 'Libero'
    };
    
    return positions[positionKey] || positionKey;
}

/**
 * Format player name (capitalize)
 */
export function formatPlayerName(name) {
    if (!name) return '';
    
    return name
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format time duration
 */
export function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    
    return `${seconds}s`;
}

/**
 * Truncate text
 */
export function truncate(text, maxLength = 50, suffix = '...') {
    if (!text || text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Pluralize word
 */
export function pluralize(word, count) {
    if (count === 1) return word;
    
    // Simple pluralization rules
    if (word.endsWith('y')) {
        return word.slice(0, -1) + 'ies';
    }
    
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch')) {
        return word + 'es';
    }
    
    return word + 's';
}

/**
 * Format comparison count
 */
export function formatComparisonCount(count) {
    if (count === 0) return 'No comparisons';
    if (count === 1) return '1 comparison';
    return `${count} comparisons`;
}

/**
 * Format team balance
 */
export function formatBalance(difference) {
    if (difference < 100) return 'Excellent';
    if (difference < 200) return 'Very Good';
    if (difference < 300) return 'Good';
    if (difference < 500) return 'Fair';
    return 'Poor';
}

/**
 * Format ordinal number (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(num) {
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    
    return num + 'th';
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} ${pluralize('minute', diffMinutes)} ago`;
    if (diffHours < 24) return `${diffHours} ${pluralize('hour', diffHours)} ago`;
    if (diffDays < 30) return `${diffDays} ${pluralize('day', diffDays)} ago`;
    
    return formatDate(dateString, 'short');
}

export default {
    formatRating,
    formatDate,
    formatPercentage,
    formatPosition,
    formatPlayerName,
    formatNumber,
    formatFileSize,
    formatDuration,
    truncate,
    pluralize,
    formatComparisonCount,
    formatBalance,
    formatOrdinal,
    formatRelativeTime
};
