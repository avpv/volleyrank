// Basketball sport configuration

export default {
    name: 'Basketball',

    positions: {
        'PG': 'Point Guard',
        'SG': 'Shooting Guard',
        'SF': 'Small Forward',
        'PF': 'Power Forward',
        'C': 'Center'
    },

    positionWeights: {
        'PG': 1.2,
        'SG': 1.15,
        'SF': 1.15,
        'PF': 1.1,
        'C': 1.2
    },

    positionOrder: ['PG', 'SG', 'SF', 'PF', 'C'],

    defaultComposition: {
        'PG': 1,
        'SG': 1,
        'SF': 1,
        'PF': 1,
        'C': 1
    }
    // Team size auto-calculated: 1 + 1 + 1 + 1 + 1 = 5
};
