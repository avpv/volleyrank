/**
 * Character Avatar Generator - Human-like SVG Avatar Creation
 *
 * Generates customizable character avatars with facial features,
 * hair, accessories, and more.
 *
 * @version 1.0.0
 */

// ============================================================================
// PRESETS & CONFIGURATION
// ============================================================================

const SKIN_TONES = [
    '#FFDFC4', // Light
    '#F0D5BE', // Fair
    '#D4A574', // Medium
    '#C68642', // Tan
    '#A67C52', // Brown
    '#8D5524', // Deep Brown
    '#6B4423', // Dark Brown
    '#4A2511', // Very Dark
];

const HAIR_COLORS = [
    '#2C1B18', // Black
    '#4E3629', // Dark Brown
    '#8B6D47', // Brown
    '#D4A574', // Light Brown
    '#E5C084', // Blonde
    '#F0E6D2', // Platinum
    '#B55239', // Auburn
    '#E56717', // Red
    '#9CA3AF', // Gray
];

const EYE_COLORS = [
    '#4A5568', // Dark Gray
    '#6B4423', // Brown
    '#8B6D47', // Light Brown
    '#4299E1', // Blue
    '#48BB78', // Green
    '#9F7AEA', // Purple
];

const BACKGROUND_COLORS = [
    '#EBF8FF', // Light Blue
    '#F0FFF4', // Light Green
    '#FEFCE8', // Light Yellow
    '#FFF5F5', // Light Red
    '#FAF5FF', // Light Purple
    '#F7FAFC', // Light Gray
    '#E6FFFA', // Light Teal
    '#FFFAF0', // Light Orange
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Hash function to convert string to number
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

/**
 * Seeded random number generator
 */
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    pick(array) {
        return array[this.nextInt(0, array.length - 1)];
    }
}

// ============================================================================
// SVG PART GENERATORS
// ============================================================================

/**
 * Generate background
 */
function generateBackground(options, random) {
    const bgColor = options.backgroundColor || random.pick(BACKGROUND_COLORS);

    if (options.backgroundStyle === 'gradient') {
        const color2 = random.pick(BACKGROUND_COLORS);
        return `
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#bgGradient)" rx="100"/>
        `;
    }

    return `<rect width="200" height="200" fill="${bgColor}" rx="100"/>`;
}

/**
 * Generate head/face
 */
function generateHead(skinTone) {
    return `
        <!-- Head -->
        <ellipse cx="100" cy="100" rx="45" ry="50" fill="${skinTone}"/>
        <!-- Neck -->
        <rect x="85" y="140" width="30" height="20" fill="${skinTone}"/>
    `;
}

/**
 * Generate hair styles
 */
function generateHair(style, color) {
    const styles = {
        bald: '',

        short: `
            <ellipse cx="100" cy="65" rx="47" ry="25" fill="${color}"/>
        `,

        long: `
            <ellipse cx="100" cy="65" rx="47" ry="25" fill="${color}"/>
            <ellipse cx="60" cy="90" rx="10" ry="35" fill="${color}"/>
            <ellipse cx="140" cy="90" rx="10" ry="35" fill="${color}"/>
        `,

        curly: `
            <ellipse cx="100" cy="60" rx="48" ry="28" fill="${color}"/>
            <circle cx="70" cy="70" r="8" fill="${color}"/>
            <circle cx="85" cy="65" r="7" fill="${color}"/>
            <circle cx="115" cy="65" r="7" fill="${color}"/>
            <circle cx="130" cy="70" r="8" fill="${color}"/>
        `,

        ponytail: `
            <ellipse cx="100" cy="65" rx="47" ry="25" fill="${color}"/>
            <ellipse cx="145" cy="95" rx="8" ry="20" fill="${color}"/>
        `,

        spiky: `
            <polygon points="70,70 75,50 80,70" fill="${color}"/>
            <polygon points="85,70 90,45 95,70" fill="${color}"/>
            <polygon points="100,70 100,40 105,70" fill="${color}"/>
            <polygon points="105,70 110,45 115,70" fill="${color}"/>
            <polygon points="120,70 125,50 130,70" fill="${color}"/>
            <ellipse cx="100" cy="70" rx="40" ry="12" fill="${color}"/>
        `,

        wavy: `
            <path d="M 55 70 Q 70 60, 85 70 Q 100 60, 115 70 Q 130 60, 145 70 L 145 75 Q 130 65, 115 75 Q 100 65, 85 75 Q 70 65, 55 75 Z" fill="${color}"/>
        `,

        buzzcut: `
            <ellipse cx="100" cy="68" rx="46" ry="20" fill="${color}"/>
        `,
    };

    return styles[style] || styles.short;
}

/**
 * Generate eyes
 */
function generateEyes(shape, color) {
    const shapes = {
        round: `
            <circle cx="82" cy="95" r="8" fill="white"/>
            <circle cx="118" cy="95" r="8" fill="white"/>
            <circle cx="82" cy="95" r="5" fill="${color}"/>
            <circle cx="118" cy="95" r="5" fill="${color}"/>
            <circle cx="84" cy="93" r="2" fill="black"/>
            <circle cx="120" cy="93" r="2" fill="black"/>
        `,

        almond: `
            <ellipse cx="82" cy="95" rx="10" ry="7" fill="white"/>
            <ellipse cx="118" cy="95" rx="10" ry="7" fill="white"/>
            <ellipse cx="82" cy="95" rx="5" ry="5" fill="${color}"/>
            <ellipse cx="118" cy="95" rx="5" ry="5" fill="${color}"/>
            <circle cx="84" cy="93" r="2" fill="black"/>
            <circle cx="120" cy="93" r="2" fill="black"/>
        `,

        wide: `
            <ellipse cx="82" cy="95" rx="11" ry="8" fill="white"/>
            <ellipse cx="118" cy="95" rx="11" ry="8" fill="white"/>
            <circle cx="82" cy="95" r="5" fill="${color}"/>
            <circle cx="118" cy="95" r="5" fill="${color}"/>
            <circle cx="84" cy="93" r="2" fill="black"/>
            <circle cx="120" cy="93" r="2" fill="black"/>
        `,

        squint: `
            <ellipse cx="82" cy="95" rx="9" ry="4" fill="white"/>
            <ellipse cx="118" cy="95" rx="9" ry="4" fill="white"/>
            <ellipse cx="82" cy="95" rx="4" ry="3" fill="${color}"/>
            <ellipse cx="118" cy="95" rx="4" ry="3" fill="${color}"/>
        `,
    };

    return shapes[shape] || shapes.round;
}

/**
 * Generate eyebrows
 */
function generateEyebrows(shape) {
    const shapes = {
        straight: `
            <line x1="70" y1="82" x2="90" y2="82" stroke="#2C1B18" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="110" y1="82" x2="130" y2="82" stroke="#2C1B18" stroke-width="2.5" stroke-linecap="round"/>
        `,

        curved: `
            <path d="M 70 84 Q 80 80, 90 82" stroke="#2C1B18" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M 110 82 Q 120 80, 130 84" stroke="#2C1B18" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        `,

        angry: `
            <line x1="70" y1="85" x2="90" y2="80" stroke="#2C1B18" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="110" y1="80" x2="130" y2="85" stroke="#2C1B18" stroke-width="2.5" stroke-linecap="round"/>
        `,

        raised: `
            <path d="M 70 85 Q 80 78, 90 80" stroke="#2C1B18" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M 110 80 Q 120 78, 130 85" stroke="#2C1B18" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        `,

        thick: `
            <line x1="70" y1="82" x2="90" y2="82" stroke="#2C1B18" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="110" y1="82" x2="130" y2="82" stroke="#2C1B18" stroke-width="3.5" stroke-linecap="round"/>
        `,
    };

    return shapes[shape] || shapes.straight;
}

/**
 * Generate mouth
 */
function generateMouth(expression) {
    const expressions = {
        neutral: `
            <line x1="88" y1="120" x2="112" y2="120" stroke="#2C1B18" stroke-width="2" stroke-linecap="round"/>
        `,

        smile: `
            <path d="M 85 118 Q 100 125, 115 118" stroke="#2C1B18" stroke-width="2" fill="none" stroke-linecap="round"/>
        `,

        bigSmile: `
            <path d="M 82 115 Q 100 128, 118 115" stroke="#2C1B18" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M 90 120 Q 100 123, 110 120" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        `,

        sad: `
            <path d="M 85 125 Q 100 118, 115 125" stroke="#2C1B18" stroke-width="2" fill="none" stroke-linecap="round"/>
        `,

        surprised: `
            <ellipse cx="100" cy="122" rx="6" ry="8" fill="none" stroke="#2C1B18" stroke-width="2"/>
        `,

        smirk: `
            <path d="M 85 120 Q 95 122, 112 118" stroke="#2C1B18" stroke-width="2" fill="none" stroke-linecap="round"/>
        `,
    };

    return expressions[expression] || expressions.neutral;
}

/**
 * Generate nose (simple)
 */
function generateNose() {
    return `
        <line x1="100" y1="100" x2="100" y2="110" stroke="#00000020" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 98 110 Q 100 112, 102 110" stroke="#00000020" stroke-width="1" fill="none"/>
    `;
}

/**
 * Generate accessories
 */
function generateAccessories(type, random) {
    const accessories = {
        none: '',

        glasses: `
            <g id="glasses">
                <!-- Frames -->
                <circle cx="82" cy="95" r="10" fill="none" stroke="#2C1B18" stroke-width="2"/>
                <circle cx="118" cy="95" r="10" fill="none" stroke="#2C1B18" stroke-width="2"/>
                <!-- Bridge -->
                <line x1="92" y1="95" x2="108" y2="95" stroke="#2C1B18" stroke-width="2"/>
                <!-- Arms -->
                <line x1="72" y1="95" x2="62" y2="92" stroke="#2C1B18" stroke-width="2"/>
                <line x1="128" y1="95" x2="138" y2="92" stroke="#2C1B18" stroke-width="2"/>
            </g>
        `,

        sunglasses: `
            <g id="sunglasses">
                <!-- Frames -->
                <ellipse cx="82" cy="95" rx="11" ry="8" fill="#2C1B18" opacity="0.8"/>
                <ellipse cx="118" cy="95" rx="11" ry="8" fill="#2C1B18" opacity="0.8"/>
                <!-- Bridge -->
                <line x1="93" y1="95" x2="107" y2="95" stroke="#2C1B18" stroke-width="2"/>
                <!-- Shine -->
                <ellipse cx="80" cy="92" rx="3" ry="2" fill="white" opacity="0.5"/>
                <ellipse cx="116" cy="92" rx="3" ry="2" fill="white" opacity="0.5"/>
            </g>
        `,

        beard: `
            <g id="beard">
                <path d="M 65 115 Q 70 135, 80 140 Q 90 143, 100 143 Q 110 143, 120 140 Q 130 135, 135 115"
                      fill="#2C1B18" opacity="0.9"/>
                <ellipse cx="100" cy="135" rx="15" ry="10" fill="#2C1B18" opacity="0.9"/>
            </g>
        `,

        mustache: `
            <g id="mustache">
                <path d="M 75 112 Q 85 117, 95 115" fill="#2C1B18" opacity="0.9"/>
                <path d="M 105 115 Q 115 117, 125 112" fill="#2C1B18" opacity="0.9"/>
            </g>
        `,

        hat: `
            <g id="hat">
                <ellipse cx="100" cy="63" rx="45" ry="8" fill="#4A5568"/>
                <rect x="70" y="45" width="60" height="18" fill="#4A5568" rx="3"/>
            </g>
        `,

        headphones: `
            <g id="headphones">
                <!-- Band -->
                <path d="M 55 90 Q 100 45, 145 90" stroke="#4A5568" stroke-width="5" fill="none" stroke-linecap="round"/>
                <!-- Left ear -->
                <rect x="50" y="90" width="12" height="18" fill="#4A5568" rx="3"/>
                <!-- Right ear -->
                <rect x="138" y="90" width="12" height="18" fill="#4A5568" rx="3"/>
            </g>
        `,
    };

    return accessories[type] || '';
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate avatar options from seed/name
 */
function generateOptionsFromSeed(seed) {
    const random = new SeededRandom(seed);

    const hairStyles = ['bald', 'short', 'long', 'curly', 'ponytail', 'spiky', 'wavy', 'buzzcut'];
    const eyeShapes = ['round', 'almond', 'wide', 'squint'];
    const eyebrowShapes = ['straight', 'curved', 'angry', 'raised', 'thick'];
    const mouthExpressions = ['neutral', 'smile', 'bigSmile', 'sad', 'surprised', 'smirk'];
    const accessoryTypes = ['none', 'none', 'none', 'glasses', 'sunglasses', 'beard', 'mustache', 'hat', 'headphones'];

    return {
        skinTone: random.pick(SKIN_TONES),
        hairStyle: random.pick(hairStyles),
        hairColor: random.pick(HAIR_COLORS),
        eyeShape: random.pick(eyeShapes),
        eyeColor: random.pick(EYE_COLORS),
        eyebrowShape: random.pick(eyebrowShapes),
        mouthExpression: random.pick(mouthExpressions),
        accessory: random.pick(accessoryTypes),
        backgroundColor: random.pick(BACKGROUND_COLORS),
        backgroundStyle: random.next() > 0.7 ? 'gradient' : 'solid',
    };
}

/**
 * Generate character avatar
 * @param {string|number} seedOrName - Seed number or name string
 * @param {Object} customOptions - Optional custom options to override generated ones
 * @param {number} size - Avatar size (default: 200)
 * @returns {string} - SVG string
 */
export function generateCharacterAvatar(seedOrName, customOptions = {}, size = 200) {
    // Generate seed from string if needed
    const seed = typeof seedOrName === 'string'
        ? hashString(seedOrName.toLowerCase().trim())
        : seedOrName;

    const random = new SeededRandom(seed);

    // Generate base options from seed
    const baseOptions = generateOptionsFromSeed(seed);

    // Merge with custom options
    const options = { ...baseOptions, ...customOptions };

    // Generate all parts
    const background = generateBackground(options, random);
    const head = generateHead(options.skinTone);
    const hair = generateHair(options.hairStyle, options.hairColor);
    const eyes = generateEyes(options.eyeShape, options.eyeColor);
    const eyebrows = generateEyebrows(options.eyebrowShape);
    const nose = generateNose();
    const mouth = generateMouth(options.mouthExpression);
    const accessories = generateAccessories(options.accessory, random);

    // Assemble SVG
    const viewBoxSize = 200;
    const scale = size / viewBoxSize;

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" xmlns="http://www.w3.org/2000/svg">
            ${background}
            ${head}
            ${hair}
            ${eyes}
            ${eyebrows}
            ${nose}
            ${mouth}
            ${accessories}
        </svg>
    `.trim();
}

/**
 * Avatar size presets
 */
export const AvatarSizes = {
    SMALL: 48,
    MEDIUM: 64,
    LARGE: 96,
    XLARGE: 128,
    XXLARGE: 200,
};

/**
 * Get available options for customization
 */
export const AvatarOptions = {
    skinTones: SKIN_TONES,
    hairColors: HAIR_COLORS,
    eyeColors: EYE_COLORS,
    hairStyles: ['bald', 'short', 'long', 'curly', 'ponytail', 'spiky', 'wavy', 'buzzcut'],
    eyeShapes: ['round', 'almond', 'wide', 'squint'],
    eyebrowShapes: ['straight', 'curved', 'angry', 'raised', 'thick'],
    mouthExpressions: ['neutral', 'smile', 'bigSmile', 'sad', 'surprised', 'smirk'],
    accessories: ['none', 'glasses', 'sunglasses', 'beard', 'mustache', 'hat', 'headphones'],
};

export default {
    generateCharacterAvatar,
    AvatarSizes,
    AvatarOptions,
};
