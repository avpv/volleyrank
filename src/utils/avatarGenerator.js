/**
 * Avatar Generator - Deterministic SVG Avatar Creation
 *
 * Generates simple, unique SVG avatars based on player names.
 * Same name always produces the same avatar (deterministic).
 *
 * @version 1.0.0
 */

/**
 * Simple hash function to convert string to number
 * @param {string} str - Input string (player name)
 * @returns {number} - Hash value
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Generate a color from hash value
 * @param {number} hash - Hash value
 * @param {number} index - Color index for variation
 * @returns {string} - HSL color string
 */
function getColor(hash, index = 0) {
    // Use different hue ranges for variety
    const hueRanges = [
        [200, 240], // Blues
        [260, 290], // Purples
        [160, 200], // Cyans
        [280, 320], // Magentas
        [140, 180], // Teals
    ];

    const rangeIndex = (hash + index) % hueRanges.length;
    const [minHue, maxHue] = hueRanges[rangeIndex];
    const hue = minHue + ((hash + index * 13) % (maxHue - minHue));

    const saturation = 60 + ((hash + index * 7) % 30); // 60-90%
    const lightness = 50 + ((hash + index * 11) % 20); // 50-70%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generate geometric pattern SVG
 * @param {number} hash - Hash value
 * @param {number} size - Avatar size
 * @returns {string} - SVG pattern
 */
function generatePattern(hash, size) {
    const patternType = hash % 5;
    const color1 = getColor(hash, 0);
    const color2 = getColor(hash, 1);
    const color3 = getColor(hash, 2);

    const center = size / 2;
    const quarter = size / 4;
    const eighth = size / 8;

    switch (patternType) {
        case 0: // Concentric circles
            return `
                <circle cx="${center}" cy="${center}" r="${center}" fill="${color1}"/>
                <circle cx="${center}" cy="${center}" r="${center * 0.7}" fill="${color2}"/>
                <circle cx="${center}" cy="${center}" r="${center * 0.4}" fill="${color3}"/>
            `;

        case 1: // Geometric grid
            return `
                <rect width="${size}" height="${size}" fill="${color1}"/>
                <circle cx="${quarter}" cy="${quarter}" r="${eighth}" fill="${color2}"/>
                <circle cx="${quarter * 3}" cy="${quarter}" r="${eighth}" fill="${color2}"/>
                <circle cx="${quarter}" cy="${quarter * 3}" r="${eighth}" fill="${color2}"/>
                <circle cx="${quarter * 3}" cy="${quarter * 3}" r="${eighth}" fill="${color2}"/>
                <circle cx="${center}" cy="${center}" r="${quarter}" fill="${color3}"/>
            `;

        case 2: // Diagonal split with circles
            return `
                <rect width="${size}" height="${size}" fill="${color1}"/>
                <polygon points="0,0 ${size},0 0,${size}" fill="${color2}"/>
                <circle cx="${quarter}" cy="${quarter * 3}" r="${quarter}" fill="${color3}"/>
                <circle cx="${quarter * 3}" cy="${quarter}" r="${eighth}" fill="${color1}"/>
            `;

        case 3: // Quadrants
            return `
                <rect width="${center}" height="${center}" fill="${color1}"/>
                <rect x="${center}" width="${center}" height="${center}" fill="${color2}"/>
                <rect y="${center}" width="${center}" height="${center}" fill="${color3}"/>
                <rect x="${center}" y="${center}" width="${center}" height="${center}" fill="${color1}"/>
                <circle cx="${center}" cy="${center}" r="${quarter}" fill="${color2}"/>
            `;

        case 4: // Triangular pattern
            return `
                <rect width="${size}" height="${size}" fill="${color1}"/>
                <polygon points="${center},${eighth} ${quarter * 3},${quarter * 3} ${quarter},${quarter * 3}" fill="${color2}"/>
                <polygon points="${quarter},${quarter * 2.5} ${quarter * 3},${quarter * 2.5} ${center},${size - eighth}" fill="${color3}"/>
            `;

        default:
            return `<rect width="${size}" height="${size}" fill="${color1}"/>`;
    }
}

/**
 * Generate SVG avatar based on name
 * @param {string} name - Player name
 * @param {number} size - Avatar size (default: 96)
 * @returns {string} - SVG string
 */
export function generateAvatar(name, size = 96) {
    if (!name || typeof name !== 'string') {
        // Fallback for invalid input
        return `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${size}" height="${size}" fill="hsl(220, 60%, 60%)"/>
                <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}"
                      fill="white" text-anchor="middle" dominant-baseline="central" font-weight="bold">?</text>
            </svg>
        `.trim();
    }

    const hash = hashString(name.toLowerCase().trim());
    const pattern = generatePattern(hash, size);

    // Get initials for overlay
    const initials = name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    const fontSize = size * 0.35;

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            ${pattern}
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}"
                  fill="white" text-anchor="middle" dominant-baseline="central"
                  font-weight="bold" style="text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${initials}</text>
        </svg>
    `.trim();
}

/**
 * Generate avatar with specific size presets
 */
export const AvatarSizes = {
    SMALL: 48,
    MEDIUM: 64,
    LARGE: 96,
    XLARGE: 128
};

export default {
    generateAvatar,
    AvatarSizes
};
