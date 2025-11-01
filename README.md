# 🏐 VolleyRank

**Smart team builder for volleyball coaches and organizers**

Stop guessing who should play where. VolleyRank uses proven mathematics to:
- Rate each player's skill at every position they can play (Setter, Opposite, Outside Hitter, Middle Blocker, Libero)
- Compare players through simple head-to-head matchups
- Automatically create balanced teams using advanced optimization algorithms

Perfect for training sessions where you need fair teams fast.

[Try it now](https://avpv.github.io/volleyrank/) - runs entirely in your browser


## Features

- **Multi-Position Support**: Players can play multiple positions, each with independent ELO ratings
- **Position-Based Comparisons**: Compare players at specific positions to build accurate skill ratings
- **Smart Comparison System**: Prioritizes comparing players with fewer previous comparisons
- **Position-Specific Rankings**: View separate rankings for each volleyball position
- **Intelligent Team Builder**: Automatically create balanced teams using position-specific ratings
- **Data Persistence**: All data is saved locally in your browser with automatic migration from older versions
- **Import/Export**: Bulk import players via CSV/JSON and export your data

## Volleyball Positions

- **S** - Setter
- **OPP** - Opposite
- **OH** - Outside Hitter
- **MB** - Middle Blocker
- **L** - Libero

## How to Use

### 1. Add Players
- Go to the **Settings** tab
- Enter player name
- Select **all positions** the player can play (multiple selections allowed)
- Click "Add Player"

**Example**: A player who can play both Outside Hitter and Middle Blocker will have separate ELO ratings for each position.

### 2. Compare Players
- Go to the **Compare** tab
- Select a position from the dropdown (e.g., "Outside Hitters")
- Click on the better player in each matchup
- **Only the rating for that specific position will change**
- The system prioritizes pairs who haven't been compared yet

### 3. View Rankings
- Go to the **Rankings** tab to see players ranked by position
- Each position shows only players who can play that position
- Rankings display position-specific ELO ratings and comparison counts

### 4. Create Teams
- Go to the **Teams** tab
- Set the number of teams (2-+inf)
- Define team composition (players per position)
- Click "Create Teams" for optimally balanced team suggestions
- The optimizer uses each player's rating for their assigned position

### 5. Import/Export Players
- **Export**: Download your player list as CSV
- **Import**: Upload CSV or JSON files, or paste data directly
- **CSV Format**: `name,positions` (e.g., `"John Smith","OH,MB"`)
- **Template**: Download a sample CSV template to get started

## How It Works

### Multiple Position Rating System
- Each player starts with **1500 ELO** for each of their positions
- When comparing players at a position, **only that position's rating changes**
- Example: If "John" (OH/MB) beats "Alice" (OH) at Outside Hitter:
  - John's OH rating increases
  - Alice's OH rating decreases
  - John's MB rating remains unchanged

### Team Formation Algorithm

The team optimizer uses a multi-algorithm approach with position-specific ratings:

#### 1. Initial Solution Generation
- **Snake Draft**: Top players distributed in serpentine pattern (1-2-3-3-2-1)
- **Balanced Rating**: Players assigned to teams with lowest current total rating
- **Random Solutions**: Multiple random distributions for diversity

#### 2. Advanced Optimization
- **Simulated Annealing**: 50,000 iterations with cooling schedule
  - Temperature starts at 1000, cools by 0.995 per iteration
  - Accepts worse solutions probabilistically to escape local optima
- **Position-Aware Swaps**: Only swaps players at same position between teams
- **Multi-Candidate Selection**: Compares 4+ different optimization approaches

#### 3. Position-Specific Rating Usage
- Players are assigned to positions where they can play
- **Uses the player's rating for their assigned position**, not an average
- Example: Player with OH=1600, MB=1450 assigned to OH uses 1600 rating

#### 4. Balance Evaluation
- **Team Balance**: Minimizes difference between strongest/weakest teams
- **Rating Variance**: Penalizes uneven talent distribution
- **Target**: < 300 ELO difference between teams

### Comparison System
- Filters players by selected position
- Prioritizes players with fewest comparisons at that position
- Excludes pairs already compared at that position
- Randomizes selection among suitable pairs for fairness

### Import/Export Formats

#### CSV Format
```csv
name,positions
"John Smith","OH,MB"
"Alice Johnson","S"
"Bob Williams","MB"
"Sarah Davis","L"
"Mike Brown","OPP,OH"
```

#### JSON Format
```json
[
  {
    "name": "John Smith",
    "positions": ["OH", "MB"]
  },
  {
    "name": "Alice Johnson",
    "positions": ["S"]
  }
]
```

## File Structure

```
volleyrank/
│
├── 📄 Entry Points (3)
│   ├── index.html
│   ├── 404.html
│   └── README.md
│
├── 📁 assets/ (3)
│   └── styles/
│       ├── main.css
│       ├── components.css
│       └── pages.css
│
└── 📁 src/ (21)
    ├── app.js
    │
    ├── core/ (4)
    │   ├── Router.js
    │   ├── EventBus.js
    │   ├── StateManager.js
    │   └── StorageAdapter.js
    │
    ├── services/ (4)
    │   ├── PlayerService.js
    │   ├── EloService.js
    │   ├── ComparisonService.js
    │   └── TeamOptimizerService.js
    │
    ├── components/ (4)
    │   └── base/
    │       ├── Component.js
    │       ├── Toast.js
    │       ├── Modal.js
    │       └── Button.js
    │
    ├── pages/ (5)
    │   ├── BasePage.js
    │   ├── SettingsPage.js
    │   ├── ComparePage.js
    │   ├── RankingsPage.js
    │   └── TeamsPage.js
    │
    └── utils/ (4)
        ├── constants.js
        ├── validation.js
        ├── csv.js
        └── formatters.js
  ```

## Optimization Algorithms

### Algorithm Comparison

| Algorithm | Iterations | Key Feature | Best For |
|-----------|-----------|-------------|----------|
| **Simulated Annealing** | 50,000 | Probabilistic acceptance | Escaping local optima |
| **Genetic Algorithm** | 20×100 | Population evolution | Global exploration |
| **Tabu Search** | 5,000 | Memory-based prohibition | Avoiding cycles |
| **Adaptive Swaps** | Embedded | Intelligent targeting | Fast convergence |

### Configuration Parameters

```javascript
{
  // Simulated Annealing
  maxIterations: 50000,
  initialTemperature: 1000,
  coolingRate: 0.995,
  
  // Genetic Algorithm
  populationSize: 20,
  generationCount: 100,
  mutationRate: 0.15,
  crossoverRate: 0.7,
  
  // Tabu Search
  tabuTenure: 50,
  tabuIterations: 5000,
  
  // Adaptive Swaps
  adaptiveSwapEnabled: true
}
```



## Browser Compatibility

- Requires modern browser with ES6+ support
- Uses localStorage for data persistence
- Data persists between sessions
- No server required - runs entirely in browser

## Technical Details

### Core Technologies
- **Frontend**: Vanilla JavaScript (ES6+ modules)
- **UI**: HTML5, CSS3 (GitHub-inspired design)
- **Architecture**: Single Page Application (SPA)
- **Routing**: History API with client-side router
- **Storage**: LocalStorage API for data persistence
- **Deployment**: Static site on GitHub Pages

### Architecture Patterns
- **Event-driven**: EventBus for component communication
- **State Management**: Centralized StateManager with localStorage sync
- **Component-based**: Modular page and component structure
- **Service Layer**: Separated business logic (ELO, Comparison, Optimization)
- **MVC-inspired**: Clear separation of concerns

### Project Structure
```
src/
├── core/           # Core framework (Router, EventBus, State)
├── services/       # Business logic (ELO, Teams, Comparisons)
├── components/     # Reusable UI components
├── pages/          # Page controllers
└── utils/          # Helper functions and constants
```

### No Dependencies
- Zero external libraries or frameworks
- Pure vanilla JavaScript
- No build step required
- Works directly in browser

## Development

### Key Classes

- **StateManager**: Centralized state with localStorage persistence
- **PlayerManager**: Player validation and position-based queries
- **EloCalculator**: Rating calculations with position support
- **TeamOptimizer**: Advanced team balancing algorithms
- **UIController**: Complete UI management and event handling

### Adding New Features

1. Update StateManager for data structure changes
2. Add business logic to appropriate manager class
3. Update UIController for UI changes
4. Test with existing data (migration should work)

## Contributing

Feel free to fork this project and submit pull requests for improvements or bug fixes.

## License

Open source - feel free to use and modify for your volleyball team!

---

**Version 3.0** - Multi-Position Rating System with Advanced Optimization Algorithms
