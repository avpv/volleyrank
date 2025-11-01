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

## ⚙️ How It Works

### ELO Rating System

VolleyRank uses the **ELO rating system**, the same method used in chess rankings and many competitive sports. Here's how it works in simple terms:

- Every player starts with the same rating (**1500 points**) for each position they can play
- When you compare two players, you're essentially saying "Player A is better than Player B at this position"
- The winner gains points, the loser loses points
- **The amount of points exchanged depends on the ratings difference:**
  - If a lower-rated player wins, they gain more points (upset victory!)
  - If a higher-rated player wins, they gain fewer points (expected result)
- Each position has its own separate rating, so a player who excels as Setter might have different rating as Outside Hitter

**Example:** If "John" (OH/MB) beats "Alice" (OH) in an Outside Hitter comparison:
- John's OH rating goes up
- Alice's OH rating goes down
- John's MB rating stays the same (we only compared OH skills)

This system quickly learns who the best players are and creates accurate rankings with surprisingly few comparisons!

### Team Optimization Algorithms

When you create teams, VolleyRank uses several smart algorithms working together to find the most balanced team combinations. Think of it as trying thousands of different team arrangements in seconds to find the fairest split:

**The algorithms include:**

- **Genetic Algorithm** - Mimics natural evolution: creates "generations" of team combinations, keeps the best ones, and combines them to make even better solutions

- **Simulated Annealing** - Inspired by metalworking: starts with random changes and gradually becomes more selective, like metal cooling into its strongest form

- **Ant Colony Optimization** - Based on how ants find food: many "virtual ants" explore different solutions and leave "trails" to guide others toward better team combinations

- **Tabu Search** - Has a "memory" of recent attempts and avoids repeating bad combinations, helping it explore new possibilities

- **Local Search** - Makes small improvements step by step, swapping players between teams until balance improves

- **Constraint Programming** - Uses logical rules to eliminate impossible combinations early, focusing only on valid team formations

All these algorithms run in parallel, and VolleyRank automatically picks the most balanced result. This ensemble approach means you get fair teams even with complex requirements (like "I need 2 Setters per team" or "Create 5 teams of 6 players each").

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

## 🎯 Why VolleyRank Works So Well

### Multiple Algorithms Working Together

Instead of using just one method, VolleyRank runs several different algorithms at the same time and picks the best result. It's like asking multiple experts for advice and choosing the best solution:

- **Fast Results**: Tests thousands of team combinations in just seconds
- **Handles Complexity**: Works with any team size and position requirements
- **Always Improving**: Each algorithm approaches the problem differently, increasing chances of finding the perfect balance

### Intelligent Comparisons

VolleyRank doesn't waste your time with random comparisons. It shows you the matchups that matter most:
- Focuses on players who need more data
- Chooses comparisons that will reveal the most about player rankings
- Separates ratings by position for accurate assessment
- Builds reliable rankings quickly

## 🌐 Browser Compatibility

Works in all modern browsers:
- ✅ Chrome/Edge (2021 or newer)
- ✅ Firefox (2021 or newer)
- ✅ Safari (2021 or newer)
- 💾 All your data stays in your browser - completely private
- 📱 Works on desktop, tablet, and mobile devices

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs or suggest features via [GitHub Issues](https://github.com/avpv/volleyrank/issues)
- Submit improvements via Pull Requests
- Share your feedback and ideas

### Ideas for Improvements

- Additional optimization methods
- Performance enhancements for large teams
- UI/UX improvements
- Support for more export formats
- Translations to other languages
- Better mobile experience

## 📄 License

MIT License - feel free to use and modify for your volleyball team!

## 🙏 Acknowledgments

- **ELO rating system** - Created by Arpad Elo for chess, now used worldwide in competitive games and sports
- **Optimization algorithms** - Inspired by nature and mathematics to solve complex problems
- Built with passion for fair and fun volleyball games

---

**Version 4.0** - Multi-algorithm team optimization with ELO ratings

**[🏐 Try it Now](https://avpv.github.io/volleyrank/)** | **[🐛 Report Bug](https://github.com/avpv/volleyrank/issues)** | **[💡 Request Feature](https://github.com/avpv/volleyrank/issues)**
