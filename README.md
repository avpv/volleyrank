# 🏐 VolleyRank

**Smart team builder for volleyball coaches and organizers**

Stop guessing who should play where. VolleyRank helps you:
- Rate each player's skill at every position they can play (Setter, Opposite, Outside Hitter, Middle Blocker, Libero)
- Compare players through simple head-to-head matchups
- Automatically create balanced teams

Perfect for training sessions where you need fair teams fast.

[Try it now](https://avpv.github.io/volleyrank/) - runs entirely in your browser


## Features

- **Multi-Position Support**: Players can play multiple positions, each rated independently
- **Position-Based Comparisons**: Compare players at specific positions to build accurate ratings
- **Smart Comparison System**: Shows you the most useful comparisons first
- **Position-Specific Rankings**: View separate rankings for each volleyball position
- **Intelligent Team Builder**: Automatically create balanced teams
- **Data Persistence**: All data saved in your browser automatically
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

## How It Works

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

## Advanced Features

The app uses multiple smart algorithms to find the best team combinations:
- Tests thousands of different team arrangements
- Finds the most balanced option automatically
- Works even with complex team compositions
- Usually creates teams within seconds



## Browser Compatibility

- Works in modern browsers (Chrome, Firefox, Safari, Edge)
- All data saved in your browser
- No installation required - just open and use

## Contributing

Feel free to fork this project and submit pull requests for improvements or bug fixes.

## License

Open source - feel free to use and modify for your volleyball team!

---

**Version 3.0** - Multi-Position Rating System with Advanced Optimization Algorithms
