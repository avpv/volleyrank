// src/components/base/Icons.js

/**
 * Icons - SVG icon components
 * Centralized icon system using inline SVG
 */

/**
 * Get SVG icon by name
 * @param {string} name - Icon name
 * @param {Object} options - Icon options (size, color, className)
 * @returns {string} SVG markup
 */
export function getIcon(name, options = {}) {
    const {
        size = 24,
        color = 'currentColor',
        className = '',
        strokeWidth = 2
    } = options;

    const icons = {
        // Success / Check
        check: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><polyline points="20 6 9 17 4 12"></polyline></svg>`,

        // Error / Close / X
        x: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,

        // Warning / Alert
        alert: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,

        // Info
        info: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,

        // Trash / Delete
        trash: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,

        // Plus / Add / New
        plus: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,

        // Arrow Up / Upload
        'arrow-up': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,

        // Arrow Down / Download
        'arrow-down': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`,

        // Edit / Pencil
        edit: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,

        // Refresh / Rotate / Reset
        refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,

        // Shuffle / Random
        shuffle: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>`,

        // Win-Win / Both winners
        'win-win': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M12 2l2.5 7.5h7.5l-6 4.5 2.5 7.5-6-4.5-6 4.5 2.5-7.5-6-4.5h7.5z"></path></svg>`,

        // Users / Team
        users: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,

        // Users X / No Users
        'users-x': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>`,

        // Chevron Down
        'chevron-down': `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><polyline points="6 9 12 15 18 9"></polyline></svg>`
    };

    return icons[name] || icons.info;
}

/**
 * Icon component wrapper
 */
export class Icon {
    /**
     * Render icon to element
     */
    static render(name, options = {}) {
        const div = document.createElement('div');
        div.innerHTML = getIcon(name, options);
        return div.firstChild;
    }

    /**
     * Get icon as string
     */
    static toString(name, options = {}) {
        return getIcon(name, options);
    }
}

/**
 * Get TeamBalance logo SVG
 * @param {Object} options - Logo options (size, color, className)
 * @returns {string} SVG markup
 */
export function getLogo(options = {}) {
    const {
        size = 32,
        color = null,
        className = ''
    } = options;

    const gradientId = `logo-gradient-${Math.random().toString(36).substr(2, 9)}`;

    // Use gradient if color is not specified
    const fillValue = color || `url(#${gradientId})`;

    return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 1024 1024" class="${className}">
<defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#2f81f7;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
</defs>
<path fill="${fillValue}" opacity="1.000000" stroke="none" d="M385.985596,223.013397 C410.453979,224.353027 434.437500,222.604599 458.398499,223.179047 C492.038574,223.985565 525.681702,223.682220 559.308655,223.413986 C585.778687,223.202881 612.238586,223.562759 638.693848,223.768005 C687.807373,224.149017 726.373291,245.425568 754.825073,285.150085 C770.452454,306.969055 779.884705,331.484436 782.098877,358.150909 C786.100647,406.346527 771.875854,447.792877 734.068298,479.692169 C733.320435,480.323151 732.638367,481.032074 731.704468,481.913300 C734.655029,485.604645 738.691895,487.717316 742.109985,490.515747 C767.917114,511.644562 783.875916,538.990356 790.106689,571.319275 C801.893066,632.473755 783.350769,684.496582 738.719299,727.048035 C712.348145,752.190369 680.445801,766.896545 644.087769,771.572937 C640.097534,772.086182 636.151184,772.360962 632.162415,772.361511 C539.347046,772.373291 446.531647,772.375244 353.716248,772.372070 C344.992249,772.371765 344.656586,772.022949 344.656494,763.385986 C344.655029,622.413147 344.655029,481.440308 344.654480,340.467468 C344.654449,338.301208 344.677734,336.134552 344.644104,333.968811 C344.545197,327.595734 342.332672,325.428925 335.805084,325.332458 C332.806183,325.288116 329.806366,325.301544 326.806946,325.300873 C290.314056,325.292847 253.821182,325.291870 217.328293,325.277344 C208.249756,325.273743 205.662231,322.737701 205.657791,313.809906 C205.644348,286.815094 205.641907,259.820312 205.659897,232.825500 C205.664917,225.286575 207.271118,223.719711 214.673218,223.641632 C236.150604,223.415085 257.617889,222.827652 279.108765,223.522217 C292.076935,223.941345 305.080750,223.131332 318.069183,223.093719 C326.556946,223.069153 335.046570,223.622864 343.534119,223.590576 C357.519501,223.537323 371.503845,223.219299 385.985596,223.013397 M652.194397,665.663940 C691.156189,646.907349 706.231140,603.533203 685.966309,566.564209 C674.008423,544.749573 655.317383,531.669739 629.973938,531.424072 C574.151184,530.882874 518.320007,531.197632 462.492310,531.198547 C456.495941,531.198669 453.356812,534.765137 453.380768,541.772095 C453.521484,582.926453 453.151489,624.075500 452.361023,665.222107 C452.232422,671.916748 452.364929,671.957214 458.948944,671.958740 C513.111023,671.971558 567.273254,671.900330 621.434998,672.031006 C631.945801,672.056396 641.915222,670.150085 652.194397,665.663940 M630.376404,325.320862 C575.067017,325.308838 519.757568,325.291229 464.448151,325.290497 C455.631165,325.290375 453.372406,327.613068 453.354279,336.613281 C453.298279,364.434601 453.264343,392.255890 453.206085,420.077209 C453.186462,429.452576 455.295715,431.643341 464.527954,431.643494 C517.838440,431.644409 571.149475,431.497284 624.459290,431.689026 C655.886902,431.802063 686.828308,405.212280 679.820312,367.368347 C675.564697,344.387482 654.580139,325.592010 630.376404,325.320862 z"/>
</svg>`;
}

export default Icon;
