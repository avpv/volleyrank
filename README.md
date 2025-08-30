# 🏐 VolleyRank

An ELO rating system for your volleyball team that helps track player skill levels and create balanced teams.

Try the application: [https://avpv.github.io/volleyrank/](https://avpv.github.io/volleyrank/)

## Features

- **Player Management**: Add, remove, and reset players with position tracking
- **ELO Rating System**: Compare players head-to-head to build accurate skill ratings
- **Smart Comparisons**: Prioritizes comparing players with fewer previous comparisons
- **Position-Based Rankings**: View rankings for each volleyball position
- **Team Builder**: Automatically create balanced teams based on ELO ratings and position requirements
- **Data Persistence**: All data is saved locally in your browser

## Volleyball Positions

- **S** - Setter
- **OPP** - Opposite
- **OH** - Outside Hitter
- **MB** - Middle Blocker
- **L** - Libero

## How to Use

### 1. Add Players
- Go to the **Settings** tab
- Enter player name and select their position
- Click "Add Player"

### 2. Compare Players
- Go to the **Compare** tab
- Select a position from the dropdown
- Click on the better player in each matchup
- The ELO ratings will automatically adjust

### 3. View Rankings
- Go to the **Rankings** tab to see players ranked by position
- Rankings are based on ELO ratings from comparisons

### 4. Create Teams
- Go to the **Teams** tab
- Set the number of teams and composition (players per position)
- Click "Create Teams" for balanced team suggestions

## How It Works

### ELO Rating System
- Initial rating for each player: 1500
- K-factor: 30 (determines the speed of rating change)
- Rating changes based on expected match outcome

### Team Formation Algorithm
1. **Position Distribution**: players are distributed according to specified composition
2. **Snake Draft**: strongest players are distributed in snake pattern between teams
3. **Optimization**: 20,000 iterations of random swaps to improve balance
4. **Result**: teams with minimal difference in total rating

### Comparison System
- Priority given to players with fewest comparisons
- Excludes repeat comparisons between same players
- Random selection from suitable pairs for fairness

## File Structure

```
volleyrank/
├── index.html              # Main HTML file with proper script includes
├── styles/main.css         # All CSS styles
├── scripts/
│   ├── StateManager.js     # Complete state management
│   ├── PlayerManager.js    # Player business logic
│   ├── EloCalculator.js    # ELO rating calculations
│   ├── TeamOptimizer.js    # Team balancing algorithms
│   ├── UIController.js     # Complete UI management
│   └── app.js             # Application initialization
└── README.md              # Project documentation
```

## Browser Compatibility

This application uses modern web technologies and requires a recent browser version. It stores data locally using localStorage, so your data persists between sessions.

## Contributing

Feel free to fork this project and submit pull requests for improvements or bug fixes.

## License

Open source - feel free to use and modify for your volleyball team!
