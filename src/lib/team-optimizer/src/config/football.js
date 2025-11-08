// Football (Soccer) sport configuration

export default {
    name: 'Football',

    positions: {
        'GK': 'Goalkeeper',
        'DEF': 'Defender',
        'MID': 'Midfielder',
        'FWD': 'Forward'
    },

    positionWeights: {
        'GK': 1.3,
        'DEF': 1.1,
        'MID': 1.2,
        'FWD': 1.15
    },

    positionOrder: ['GK', 'DEF', 'MID', 'FWD'],

    defaultComposition: {
        'GK': 1,
        'DEF': 4,
        'MID': 3,
        'FWD': 3
    }
    // Team size auto-calculated: 1 + 4 + 3 + 3 = 11
};
