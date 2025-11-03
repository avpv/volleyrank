# VolleyRank

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

### ELO Rating System Explained

VolleyRank uses the **ELO rating system**, the same proven method used in chess rankings and competitive sports worldwide. Here's how it works in simple terms:

**The Basics:**
- Every player starts with the **same rating** (1500 points) for each position they can play
- When you compare two players, you're saying "Player A is better than Player B at this position"
- The winner gains points, the loser loses points
- Each position has its own separate rating

**How Points Are Calculated:**
- **The amount of points exchanged depends on the ratings difference:**
  - If a lower-rated player wins → they gain **more points** (upset victory!)
  - If a higher-rated player wins → they gain **fewer points** (expected result)
- This makes the system self-correcting: surprises teach us more than expected outcomes

**Example:** If "John" (OH/MB, rating 1520) beats "Alice" (OH, rating 1480) at Outside Hitter:
- John's OH rating goes up slightly (maybe +8 points) → 1528
- Alice's OH rating goes down slightly (-8 points) → 1472
- John's MB rating stays the same (we only compared OH skills)

But if Alice (lower rated) had won instead:
- Alice would gain more points (maybe +12) → 1492
- John would lose more points (-12) → 1508
- This bigger swing reflects the surprising result

**Why ELO Works:**
- Automatically balances itself over time
- Uncertain matchups reveal more information
- A few key comparisons can establish accurate rankings quickly
- Each position develops independently, so versatile players get fair ratings everywhere

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

### Import Formats

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

## Team Optimization Algorithms

VolleyRank doesn't rely on just one method to create balanced teams. Instead, it runs **six different optimization algorithms** simultaneously and picks the best result. Think of it as asking multiple experts for advice and choosing the best solution.

Here's how each algorithm approaches the problem:

### 1. Genetic Algorithm - Evolution in Action

Inspired by natural selection and evolution:
- Creates a "population" of different team arrangements (like different species)
- Tests each arrangement to see how balanced it is (survival of the fittest)
- Keeps the best arrangements and "breeds" them together to create even better solutions
- Each new "generation" is better than the last
- After many generations, finds excellent team combinations

**Think of it like:** Breeding dogs for specific traits, but we're breeding team arrangements for balance!

### 2. Simulated Annealing - Cooling Metal into Shape

Inspired by the metalworking process of heating and slowly cooling metal to remove defects:
- Starts with random team changes (high temperature - lots of movement)
- Gradually becomes more selective about changes (cooling down)
- Early on, accepts even bad swaps to explore possibilities
- As it "cools," only keeps improvements
- Final result is like perfectly cooled metal - strong and balanced

**Think of it like:** A blacksmith tempering steel - start hot and flexible, end cool and perfect.

### 3. Ant Colony Optimization - Following the Trail

Based on how ants find the shortest path to food:
- Many "virtual ants" explore different team combinations
- Good solutions leave stronger "pheromone trails"
- Other ants are attracted to these trails
- Over time, the best paths get reinforced
- Weak trails evaporate, leading all ants to the optimal solution

**Think of it like:** Ants discovering the best route to a picnic - the good paths get more traffic!

### 4. Tabu Search - Learning from Mistakes

Uses memory to avoid repeating bad decisions:
- Keeps a "tabu list" (forbidden list) of recent poor combinations
- Remembers which player swaps didn't work well
- Won't try the same bad ideas again for a while
- Forces exploration of new possibilities
- Eventually tries everything good, avoids everything bad

**Think of it like:** "We already tried putting these players together and it didn't work - let's try something else!"

### 5. Local Search - Step by Step Improvements

Takes an incremental approach:
- Starts with any team arrangement
- Tries swapping players between teams
- If a swap improves balance → keep it
- If it makes things worse → undo it
- Keeps making small improvements until no swap helps anymore
- Fast and reliable for finding good solutions

**Think of it like:** Rearranging furniture in a room - try moving things around until everything fits just right.

### 6. Constraint Programming - Logical Reasoning

Uses mathematical logic to eliminate impossible solutions:
- Applies strict rules: "Team 1 needs exactly 2 setters"
- Eliminates millions of invalid combinations instantly
- Only considers arrangements that meet all requirements
- Uses logical deduction to narrow down options
- Finds solutions that satisfy all constraints perfectly

**Think of it like:** Solving a Sudoku puzzle - use logic to eliminate what can't work, find what must work.

---

**Why Multiple Algorithms?**

Different algorithms excel in different situations:
- Some are fast but might miss the perfect solution
- Others are thorough but take more time
- Complex team requirements favor certain approaches
- Running all six and picking the best gives you the optimal result every time

The whole process typically completes in **under 5 seconds** for most team configurations!



## Browser Compatibility

- Works in modern browsers (Chrome, Firefox, Safari, Edge)
- All data saved in your browser
- No installation required - just open and use

## Contributing

Feel free to fork this project and submit pull requests for improvements or bug fixes.

## License

Open source - feel free to use and modify for your volleyball team!

---

**Version 4.0** - Multi-Position Rating System with ELO Rankings and 6 Optimization Algorithms

**[Try it now](https://avpv.github.io/volleyrank/)** | **[Report issues](https://github.com/avpv/volleyrank/issues)**
