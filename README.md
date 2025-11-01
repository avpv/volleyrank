# 🏐 VolleyRank

**Enterprise-grade volleyball team builder with advanced optimization algorithms**

Stop guessing who should play where. VolleyRank is a sophisticated player rating and team optimization system that helps volleyball coaches and organizers:
- Rate each player's skill at every position they can play (Setter, Opposite, Outside Hitter, Middle Blocker, Libero)
- Compare players through simple head-to-head matchups using ELO rating system
- Automatically create balanced teams using multiple optimization algorithms

Perfect for training sessions, tournaments, and recreational volleyball where you need fair teams fast.

**[Try it now](https://avpv.github.io/volleyrank/)** - runs entirely in your browser, no installation required

---

## ✨ Features

- **Multi-Position Support**: Players can play multiple positions, each rated independently using separate ELO ratings
- **Position-Based Comparisons**: Compare players at specific positions to build accurate, position-specific ratings
- **Smart Comparison System**: Prioritizes the most informative comparisons to build accurate rankings quickly
- **Position-Specific Rankings**: View separate rankings for each volleyball position with detailed statistics
- **Advanced Team Optimization**: Uses multiple state-of-the-art algorithms (Genetic Algorithm, Simulated Annealing, Ant Colony, Tabu Search, and more)
- **Data Persistence**: All data saved locally in your browser - no server, no account needed
- **Import/Export**: Bulk import players via CSV/JSON and export your data for backup or sharing
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Zero Installation**: Progressive Web App that works entirely in your browser

## 🏐 Volleyball Positions

- **S** - Setter
- **OPP** - Opposite
- **OH** - Outside Hitter
- **MB** - Middle Blocker
- **L** - Libero

## 🚀 Quick Start

Visit **[https://avpv.github.io/volleyrank/](https://avpv.github.io/volleyrank/)** and start using immediately - no account or installation needed!

## 📖 How to Use

### 1. Add Players
- Go to the **Settings** tab
- Enter player name
- Select **all positions** the player can play (multiple selections allowed)
- Click "Add Player"

**Example**: A player who can play both Outside Hitter and Middle Blocker will have separate ratings for each position.

### 2. Compare Players
- Go to the **Compare** tab
- Select a position from the dropdown (e.g., "Outside Hitters")
- Click on the better player in each matchup
- **Only the rating for that specific position will change**
- The system prioritizes pairs who haven't been compared yet

### 3. View Rankings
- Go to the **Rankings** tab to see players ranked by position
- Each position shows only players who can play that position
- Rankings display ratings and how many comparisons you've made

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

## 🔧 Technical Stack

VolleyRank is built with modern web technologies:

- **Frontend**: Vanilla JavaScript (ES6+ Modules) - no framework dependencies
- **Architecture**: Single Page Application (SPA) with custom routing
- **State Management**: Event-driven architecture with centralized state management
- **Storage**: Browser LocalStorage for data persistence
- **Styling**: Custom CSS with GitHub-inspired design
- **Build**: Zero build step - runs directly in the browser
- **Deployment**: GitHub Pages

### Key Technologies & Algorithms

- **ELO Rating System**: Industry-standard player rating algorithm
- **Optimization Algorithms**:
  - Genetic Algorithm (GA) - Population-based evolutionary optimization
  - Simulated Annealing (SA) - Probabilistic optimization with cooling schedule
  - Ant Colony Optimization (ACO) - Nature-inspired swarm intelligence
  - Tabu Search - Memory-based local search with forbidden moves
  - Local Search - Hill-climbing with strategic improvements
  - Constraint Programming - Logical constraint satisfaction
- **Smart Comparison Selection**: Prioritizes high-impact comparisons for faster convergence

## ⚙️ How It Works

### Rating System
- Each player starts with the **same rating** (1500) for each of their positions
- When comparing players at a position, **only that position's rating changes**
- Example: If "John" (OH/MB) beats "Alice" (OH) at Outside Hitter:
  - John's OH rating goes up
  - Alice's OH rating goes down
  - John's MB rating stays the same

### Team Formation

The app creates balanced teams by:
- Using each player's rating for their assigned position
- Testing many different team combinations
- Finding teams with the smallest skill difference
- Creating teams that are as fair as possible

### Smart Comparisons
- Shows you players who haven't been compared much yet
- Focuses on one position at a time
- Helps you rate all players fairly and quickly

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

## 🎯 Advanced Features

### Multi-Algorithm Team Optimization

VolleyRank employs a sophisticated ensemble of optimization algorithms to find the best team combinations:

- **Parallel Algorithm Execution**: Runs multiple algorithms simultaneously
- **Best Solution Selection**: Automatically chooses the most balanced result
- **Thousands of Evaluations**: Tests extensive team arrangements in seconds
- **Complex Constraint Handling**: Works with any team composition
- **Performance Optimized**: Smart caching and efficient data structures

### Intelligent Player Comparison

The comparison system is designed to minimize the number of comparisons needed:
- Prioritizes pairs with uncertain outcomes
- Focuses on players with fewer comparisons
- Position-specific comparison tracking
- Statistical confidence indicators

## 💻 Development

### Project Structure

```
volleyrank/
├── index.html              # Main HTML entry point
├── src/
│   ├── app.js             # Application bootstrap
│   ├── core/              # Core framework (Router, EventBus, StateManager)
│   ├── pages/             # Page components (Settings, Compare, Rankings, Teams)
│   ├── components/        # Reusable UI components
│   └── services/          # Business logic services
│       ├── EloService.js
│       ├── PlayerService.js
│       ├── ComparisonService.js
│       ├── TeamOptimizerService.js
│       └── optimizer/     # Optimization algorithms
│           └── algorithms/
├── assets/
│   └── styles/           # CSS stylesheets
└── demo-players.csv      # Sample data
```

### Running Locally

Since VolleyRank is a static site with no build process:

```bash
# Clone the repository
git clone https://github.com/avpv/volleyrank.git
cd volleyrank

# Serve with any static file server
python -m http.server 8000
# or
npx serve
# or
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### Development Guidelines

- **No Build Step**: Pure ES6 modules - edit and refresh
- **ES6+ Features**: Use modern JavaScript features
- **Modular Architecture**: Keep components small and focused
- **Event-Driven**: Use EventBus for cross-component communication
- **State Management**: Centralized state through StateManager
- **Performance**: Optimize for large player lists (100+ players)

## 🌐 Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ All modern browsers with ES6 module support
- 💾 All data saved in browser LocalStorage
- 📱 Responsive design for mobile and tablet

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly in multiple browsers
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Ideas for Contributions

- Additional optimization algorithms
- Performance improvements
- UI/UX enhancements
- New export formats
- Internationalization (i18n)
- Accessibility improvements
- Mobile app wrapper

## 📄 License

MIT License - feel free to use and modify for your volleyball team!

## 🙏 Acknowledgments

- ELO rating system pioneered by Arpad Elo
- Optimization algorithms from operations research literature
- Inspired by the need for fair team formation in recreational volleyball

---

**Version 4.0.0** - Enterprise-grade optimization with multi-algorithm support

**[View Live Demo](https://avpv.github.io/volleyrank/)** | **[Report Bug](https://github.com/avpv/volleyrank/issues)** | **[Request Feature](https://github.com/avpv/volleyrank/issues)**
