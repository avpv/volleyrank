# VolleyRank

Try the application: [https://avpv.github.io/volleyrank/](https://avpv.github.io/volleyrank/)

An ELO rating system for volleyball teams. This application helps objectively evaluate player skills and create balanced teams.

## Features

- **Player Comparison**: Pairwise comparisons with automatic ELO rating calculation
- **Position Rankings**: Player rankings within each position
- **Automatic Team Formation**: Create balanced teams based on ratings
- **Player Management**: Add, remove, and reset player statistics

## How to Use

### 1. Adding Players

1. Go to the "Settings" tab
2. Enter player name and select position:
   - **S** - Setter
   - **OPP** - Opposite
   - **OH** - Outside Hitter
   - **MB** - Middle Blocker
   - **L** - Libero
3. Click "Add Player"

### 2. Comparing Players

1. On the "Compare" tab, select a position from the dropdown
2. The system will automatically select a pair of players for comparison
3. Click on the card of the stronger player
4. Ratings will update automatically using the ELO system

### 3. Team Formation

1. Go to the "Teams" tab
2. Configure parameters:
   - **Number of teams**: from 1 to 6
   - **Team composition**: specify the number of players for each position
3. Click "Create Teams"
4. The system will create maximally balanced teams

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








## Feedback

If you have suggestions for improvements or found bugs, please create an Issue in this repository.
