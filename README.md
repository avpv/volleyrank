# TeamBalance 🎯

### Stop endless team arguments. Create perfectly balanced teams in minutes.

**Works for any activity**: volleyball, basketball, work projects, educational groups, and more.

<div align="center">

### [🚀 Try the Demo Now](https://avpv.github.io/team-balance/)
*Works in your browser. No installation required.*

</div>

---

## 😫 Sound Familiar?

- **Endless arguments** about who should be on which team
- **Unbalanced teams** where one side dominates every time
- **Wasted time** manually distributing players/participants
- **Subjective assessments** based on emotions and personal preferences
- **Unhappy participants** due to unfair distribution

## ✨ The Solution — TeamBalance

TeamBalance uses a **mathematically proven rating system** (the same one used in chess and professional sports) to create truly balanced teams.

### 🎯 What You Get:

- ⚡ **Save Time**: 2 minutes instead of 20 to form teams
- 🎪 **Fairness**: Mathematically balanced teams, no subjectivity
- 📊 **Objectivity**: Rating system based on real comparisons
- 🔄 **Flexibility**: Account for multiple positions per participant
- 💾 **Persistence**: All data saved automatically
- 🌍 **Universal**: Works for sports, work, education — anything!

---

## 💪 Who Is This For?

### 🏃 Sports Coaches
Form balanced teams for training where everyone enjoys fair play.

### 👔 Project Managers
Distribute developers, designers, and other specialists across project teams optimally.

### 🎓 Educators
Create study groups accounting for student skills in different areas.

### 🎪 Event Organizers
Form teams for hackathons, workshops, and training sessions quickly and fairly.

---

## 🚀 How It Works

### Simple. Intuitive. Effective.

**1️⃣ Add Participants**
- Enter names
- Specify positions/roles they can fill
- Done! (5 seconds per participant)

**2️⃣ Compare Skills**
- System shows you pairs of participants
- Choose who's better at a specific position
- Just 10-15 comparisons — and ratings are ready!

**3️⃣ Create Teams**
- Click "Create Teams" button
- Algorithm finds optimal distribution
- Get balanced teams in seconds!

### 🧠 The Magic Behind It

TeamBalance uses **ELO rating** — a proven system used in chess, esports, and professional leagues worldwide. The system automatically accounts for:
- Each participant's strength at every position
- Unexpected results (surprises provide more information)
- Continuous rating improvements

Then a **genetic optimization algorithm** finds the best team distribution, considering all ratings and positions.

**The result?** Teams as balanced as mathematically possible.

---

## 🌍 Universal Solution

**TeamBalance isn't just for volleyball!** Configure it for any activity in 5 minutes.

### ✅ Pre-built Configurations:
- 🏐 Volleyball (Setter, Outside Hitter, Middle Blocker, Opposite, Libero)
- 🏀 Basketball (Point Guard, Shooting Guard, Small Forward, Power Forward, Center)
- ⚽ Soccer (Goalkeeper, Defender, Midfielder, Forward)
- 💼 Project Teams (Tech Lead, Backend, Frontend, QA, UX, PM)

### 🎨 Create Your Own Configuration!

Need a config for hockey? Theater troupe? Research groups?

**Just create a configuration file** with your positions and weights. Examples and instructions included!

<details>
<summary><b>📋 Example: Basketball (click to view)</b></summary>

```javascript
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
    defaultComposition: {
        'PG': 1, 'SG': 1, 'SF': 1, 'PF': 1, 'C': 1
    }
};
```
</details>

---

## 🎁 Additional Features

- 📥 **Import/Export**: Load participants from CSV or Excel
- 📊 **Rating Tables**: Track progress by each position
- 💾 **Auto-save**: Never lose your data
- 🔒 **Privacy**: All data stored locally in your browser
- 📱 **Works Everywhere**: Desktop, tablet, mobile
- 🚀 **No Installation**: Just open the link and start working

---

## ⚡ Get Started Now!

### Online Version (Recommended)
**[👉 Open TeamBalance](https://avpv.github.io/team-balance/)**

Works immediately in your browser. Nothing to install!

### Local Version
```bash
# Clone the repository
git clone https://github.com/avpv/team-balance.git
cd team-balance

# Start a local server
python -m http.server 8000
# or
npx serve
```

Open `http://localhost:8000` in your browser.

---

## 💡 Real-World Use Cases

**🏐 Volleyball Club** — Coach creates 4 teams from 24 players for a tournament. Previously took 30 minutes and there were always complaints. Now — 5 minutes, all teams equally matched.

**💼 IT Company** — Manager forms 3 project teams from 18 developers with different skills. TeamBalance accounts for developers who can do both frontend and backend.

**🎓 University** — Professor creates groups for lab work, considering each student's strengths in programming, testing, and documentation.

---

## 🛠️ Technical Details (For the Curious)

<details>
<summary><b>What's Inside?</b></summary>

### Technologies
- **Vanilla JavaScript (ES6)** — fast, no unnecessary dependencies
- **ELO Rating System** — mathematically sound rating system
- **Genetic Algorithm** — team distribution optimization
- **localStorage** — automatic data persistence
- **GitHub Pages** — free hosting

### Architecture
- Clean architecture with separation of concerns
- Configuration-driven approach
- Event-driven component interaction
- Dependency injection for flexibility

### Open Source
Full source code available on GitHub. You can:
- Study the algorithms
- Suggest improvements
- Create your own version
- Add new features

</details>

---

## 🤝 Join the Community

- 💬 **Questions?** Open an issue on GitHub
- 🐛 **Found a bug?** Let us know!
- 💡 **Have an idea?** We welcome suggestions!
- 🌟 **Like the project?** Star it on GitHub!

---

## 📄 License

MIT License — use freely for any purpose!

---

## 🌟 Related Projects

- [team-optimizer](https://github.com/avpv/team-optimizer) — team optimization library (used in TeamBalance)

---

<div align="center">

### Ready to Create Perfect Teams?

**[🚀 Try TeamBalance Now](https://avpv.github.io/team-balance/)**

*Made with ❤️ for coaches, organizers, and team leaders worldwide*

</div>
