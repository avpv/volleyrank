# TeamBuilding

**Universal smart team builder for any activity - sports, work, education, and more**

**Currently configured for: Volleyball** 🏐

Stop guessing who should be on which team. TeamBuilding helps you:
- Rate each participant's skill at every role/position they can fill
- Compare participants through simple head-to-head matchups
- Automatically create balanced teams using advanced optimization algorithms

Perfect for coaches, organizers, managers - anyone who needs to build fair, balanced teams quickly.

[Try the Volleyball demo](https://avpv.github.io/volleyrank/) - runs entirely in your browser

---

## 🌟 Universal Design

**TeamBuilding is activity-agnostic**. It works for:

- ✅ **Sports**: Volleyball, Basketball, Soccer, Tennis, etc.
- ✅ **Work**: Project teams, department distribution, study groups
- ✅ **Events**: Hackathons, workshops, training sessions
- ✅ **Education**: Class group projects, lab teams

**Simply create a configuration file** with your positions/roles, weights, and team composition. That's it!

---

## Features

- **Multi-Position/Role Support**: Participants can fill multiple roles, each rated independently
- **Role-Based Comparisons**: Compare participants at specific roles to build accurate ratings
- **Smart Comparison System**: Shows you the most useful comparisons first
- **Role-Specific Rankings**: View separate rankings for each position/role
- **Intelligent Team Builder**: Automatically create balanced teams using optimization algorithms
- **Data Persistence**: All data saved in your browser automatically
- **Import/Export**: Bulk import participants via CSV/JSON and export your data
- **Easy Configuration**: Add new activities by creating a simple config file

---

## Current Configuration: Volleyball

The demo is currently configured for volleyball with these positions:

- **S** - Setter
- **OPP** - Opposite
- **OH** - Outside Hitter
- **MB** - Middle Blocker
- **L** - Libero

**Want to use it for basketball, soccer, or your own activity?** See the [Configuration Guide](#configuration-for-different-activities) below.

---

## How to Use

### 1. Add Participants
- Go to the **Settings** tab
- Enter participant name
- Select **all positions/roles** they can fill (multiple selections allowed)
- Click "Add Player"

**Example**: A player who can play both Outside Hitter and Middle Blocker will have separate ratings for each position.

### 2. Compare Participants
- Go to the **Compare** tab
- Select a position/role from the dropdown
- Click on the better participant in each matchup
- **Only the rating for that specific role will change**
- The system prioritizes pairs who haven't been compared yet

### 3. View Rankings
- Go to the **Rankings** tab to see participants ranked by position/role
- Each role shows only participants who can fill that role
- Rankings display ratings and comparison counts

### 4. Create Teams
- Go to the **Teams** tab
- Set the number of teams (2+)
- Define team composition (participants per position/role)
- Click "Create Teams" for optimally balanced team suggestions
- The optimizer uses each participant's rating for their assigned role

### 5. Import/Export Data
- **Export**: Download your participant list as CSV
- **Import**: Upload CSV or JSON files, or paste data directly
- **CSV Format**: `name,positions` (e.g., `"John Smith","OH,MB"`)
- **Template**: Download a sample CSV template to get started

---

## How It Works

### ELO Rating System Explained

TeamBuilding uses the **ELO rating system**, the same proven method used in chess rankings and competitive sports worldwide. Here's how it works:

**The Basics:**
- Every participant starts with the **same rating** (1500 points) for each role they can fill
- When you compare two participants, you're saying "Person A is better than Person B at this role"
- The winner gains points, the loser loses points
- Each role has its own separate rating

**How Points Are Calculated:**
- **The amount of points exchanged depends on the ratings difference:**
  - If a lower-rated participant wins → they gain **more points** (upset victory!)
  - If a higher-rated participant wins → they gain **fewer points** (expected result)
- This makes the system self-correcting: surprises teach us more than expected outcomes

**Example:** If "John" (rating 1520) beats "Alice" (rating 1480) at a specific role:
- John's rating goes up slightly (maybe +8 points) → 1528
- Alice's rating goes down slightly (-8 points) → 1472
- Only the rating for that specific role changes

But if Alice (lower rated) had won instead:
- Alice would gain more points (maybe +12) → 1492
- John would lose more points (-12) → 1508
- This bigger swing reflects the surprising result

**Why ELO Works:**
- Automatically balances itself over time
- Uncertain matchups reveal more information
- A few key comparisons can establish accurate rankings quickly
- Each role develops independently, so versatile participants get fair ratings everywhere

---

## Configuration for Different Activities

TeamBuilding is designed to be universal. You can configure it for **any activity** by creating a config file.

### Example Configurations

<details>
<summary><b>Basketball (5-player)</b></summary>

```javascript
// src/config/activities/basketball.js
export default {
    name: 'Basketball',
    teamSize: 5,
    positions: {
        'PG': 'Point Guard',
        'SG': 'Shooting Guard',
        'SF': 'Small Forward',
        'PF': 'Power Forward',
        'C': 'Center'
    },
    positionWeights: {
        'PG': 1.25,
        'SG': 1.15,
        'SF': 1.2,
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
};
```
</details>

<details>
<summary><b>Work Project Teams</b></summary>

```javascript
// src/config/activities/work-project.js
export default {
    name: 'Project Team',
    teamSize: 6,
    positions: {
        'TL': 'Tech Lead',
        'BE': 'Backend Developer',
        'FE': 'Frontend Developer',
        'QA': 'QA Engineer',
        'UX': 'UX Designer',
        'PM': 'Product Manager'
    },
    positionWeights: {
        'TL': 1.3,
        'PM': 1.25,
        'BE': 1.2,
        'FE': 1.15,
        'QA': 1.1,
        'UX': 1.1
    },
    positionOrder: ['TL', 'PM', 'BE', 'FE', 'UX', 'QA'],
    defaultComposition: {
        'TL': 1,
        'PM': 1,
        'BE': 2,
        'FE': 1,
        'UX': 0,  // shared across teams
        'QA': 1
    }
};
```
</details>

<details>
<summary><b>Soccer (5-a-side)</b></summary>

```javascript
// src/config/activities/soccer.js
export default {
    name: 'Soccer',
    teamSize: 5,
    positions: {
        'GK': 'Goalkeeper',
        'DF': 'Defender',
        'MF': 'Midfielder',
        'FW': 'Forward'
    },
    positionWeights: {
        'GK': 1.3,
        'DF': 1.15,
        'MF': 1.2,
        'FW': 1.1
    },
    positionOrder: ['GK', 'DF', 'MF', 'FW'],
    defaultComposition: {
        'GK': 1,
        'DF': 1,
        'MF': 2,
        'FW': 1
    }
};
```
</details>

### Creating Your Own Configuration

See `src/config/activities/README.md` for a complete guide on creating custom activity configurations.

**Key fields:**
- `name`: Display name of your activity
- `positions`: Object mapping position codes to full names
- `positionWeights`: Importance weights for team balancing (1.0 - 1.5)
- `positionOrder`: Display order for positions
- `defaultComposition`: Default team composition

---

## Tech Stack

- **Vanilla JavaScript** (ES6 Modules) - No framework dependencies
- **ELO Rating System** - Proven algorithm for skill assessment
- **Genetic Algorithm** - Advanced team optimization
- **localStorage** - Automatic data persistence
- **GitHub Pages** - Static hosting

---

## Architecture

TeamBuilding follows clean architecture principles:

- **Activity-Agnostic Core**: All business logic is independent of any specific activity
- **Configuration-Driven**: Activities are defined through simple config files
- **Dependency Injection**: Services receive configuration at runtime
- **Event-Driven**: Loose coupling between components
- **Immutable State**: Predictable data flow

---

## Development

```bash
# Clone the repository
git clone https://github.com/avpv/volleyrank.git
cd volleyrank

# Open in browser (no build step required!)
# Use a local server for development:
python -m http.server 8000
# or
npx serve
```

Visit `http://localhost:8000`

---

## Contributing

We welcome contributions! Whether it's:
- Adding new activity configurations
- Improving the optimization algorithms
- Enhancing the UI/UX
- Fixing bugs
- Writing documentation

Please open an issue or submit a pull request.

---

## License

MIT License - see LICENSE file for details

---

## Credits

- **ELO Rating System**: Arpad Elo's chess rating system
- **Team Optimization**: Custom genetic algorithm implementation
- **Inspired by**: The need for fair team distribution in sports and beyond

---

## Related Projects

- [team-optimizer](https://github.com/avpv/team-optimizer) - The underlying team optimization library (also universal!)

---

**Built with ❤️ for coaches, organizers, and team leaders everywhere**
