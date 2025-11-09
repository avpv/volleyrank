# Activity Configurations

This directory contains activity configurations for the TeamBuilding library. Each configuration defines positions, weights, and team composition for different activities (sports, work projects, etc.).

## Universal Design

TeamBuilding is designed to work with **ANY** activity that requires team distribution:
- ✅ **Sports**: Volleyball, Basketball, Soccer, Tennis, etc.
- ✅ **Work**: Project teams, department distribution, study groups
- ✅ **Events**: Hackathons, workshops, training sessions
- ✅ **Education**: Class group projects, lab teams

## Configuration Structure

Each activity config must follow this structure:

```javascript
export default {
    name: 'Activity Name',              // Display name

    // Metadata (optional)
    activityType: 'sport',              // 'sport', 'work', 'education', etc.
    teamSize: 6,                        // Default team size
    description: 'Description',         // Short description

    // Required: Position/Role definitions
    positions: {
        'CODE': 'Full Name',            // e.g., 'PG': 'Point Guard'
        'CODE2': 'Another Position',
        // ... add as many as needed
    },

    // Required: Position weights for balancing
    // Higher weight = more important for team balance
    positionWeights: {
        'CODE': 1.3,                    // 1.0 - 1.5 recommended
        'CODE2': 1.1,
        // ... must match position codes above
    },

    // Required: Display order
    positionOrder: ['CODE', 'CODE2'],   // Array of position codes

    // Required: Default team composition
    defaultComposition: {
        'CODE': 1,                      // Number of this position per team
        'CODE2': 2,
        // ... must match position codes
        // Sum should equal teamSize
    }
};
```

## Available Configurations

### Sports
- **volleyball.js** - 6-player volleyball (S, OPP, OH, MB, L)
- **basketball.js** - 5-player basketball (PG, SG, SF, PF, C)
- **soccer.js** - 5-a-side soccer (GK, DF, MF, FW)

### Non-Sports
- **work-project.js** - Project team building (TL, PM, BE, FE, UX, QA)

## Creating a New Configuration

### Example: Adding Tennis

Create `tennis.js`:

```javascript
export default {
    name: 'Tennis',
    activityType: 'sport',
    teamSize: 2,
    description: 'Tennis doubles team building',

    positions: {
        'NET': 'Net Player',
        'BASE': 'Baseline Player'
    },

    positionWeights: {
        'NET': 1.2,
        'BASE': 1.1
    },

    positionOrder: ['NET', 'BASE'],

    defaultComposition: {
        'NET': 1,
        'BASE': 1
    }
};
```

Then add to `index.js`:
```javascript
import tennis from './tennis.js';

export const activities = {
    // ... existing activities
    tennis
};
```

## Position Weight Guidelines

Position weights affect team balance calculations:
- **1.3+** - Critical positions (e.g., Setter in volleyball, QB in football)
- **1.2** - Very important positions
- **1.15** - Important positions
- **1.1** - Standard positions
- **1.0** - Supporting positions

The algorithm uses these weights with player ratings to create balanced teams.

## Tips

1. **Keep it simple**: Start with 3-5 positions
2. **Meaningful weights**: Reflect actual importance in team success
3. **Total composition**: Should sum to your target team size
4. **Position codes**: Use short, memorable abbreviations (2-4 chars)
5. **Test your config**: Create players and generate teams to validate

## Switching Activities

To change the default activity, modify `index.js`:

```javascript
export const defaultActivity = basketball; // Change this
```

Or load dynamically:
```javascript
import { getActivityConfig } from './activities/index.js';
const config = getActivityConfig('basketball');
```

## Philosophy

TeamBuilding is **activity-agnostic** by design:
- The core library doesn't know about volleyball, basketball, or any specific activity
- All activity-specific logic is in these config files
- You can create configs for anything that needs balanced team distribution
- Clean separation of concerns = maximum flexibility

## Need Help?

The system is flexible - if you need a feature that doesn't fit this structure, consider:
1. Can it be expressed as positions and weights?
2. Is there a creative way to model it?
3. Submit an issue to discuss extending the config schema

Happy team building! 🎯
