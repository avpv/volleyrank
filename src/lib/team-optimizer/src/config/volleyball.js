// Volleyball sport configuration

export default {
    name: 'Volleyball',

    positions: {
        'S': 'Setter',
        'OPP': 'Opposite',
        'OH': 'Outside Hitter',
        'MB': 'Middle Blocker',
        'L': 'Libero'
    },

    positionWeights: {
        'S': 1.3,
        'OPP': 1.2,
        'OH': 1.15,
        'MB': 1.1,
        'L': 1.0
    },

    positionOrder: ['S', 'OPP', 'OH', 'MB', 'L'],

    defaultComposition: {
        'S': 1,
        'OPP': 1,
        'OH': 2,
        'MB': 2,
        'L': 1
    }
    // Team size auto-calculated: 1 + 1 + 2 + 2 + 1 = 7
};
