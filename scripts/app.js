// Global variables
let players = [];
let comparisons = 0;
let currentPair = null;

// Positions and their names
const positions = {
    'S': 'Setter',
    'OPP': 'Opposite', 
    'OH': 'Outside Hitter',
    'MB': 'Middle Blocker',
    'L': 'Libero'
};

// FUNCTION: Add a player
function addPlayer() {
    const nameInput = document.getElementById('playerName');
    const positionSelect = document.getElementById('playerPosition');
    const name = nameInput.value.trim();
    const position = positionSelect.value;
    
    if (!name) {
        alert('Please enter a player name.');
        return;
    }
    if (players.some(p => p.name === name)) {
        alert('A player with this name already exists.');
        return;
    }
    
    players.push({
        name: name,
        position: position,
        rating: 1500,
        comparisons: 0,
        comparedWith: []
    });
    
    nameInput.value = '';
    saveData();
    updateDisplay();
    alert(`Player "${name}" added successfully!`);
}

// FUNCTION: Delete a player
function deletePlayer(playerIndex) {
    if (playerIndex < 0 || playerIndex >= players.length) return;
    const playerName = players[playerIndex].name;
    
    if (confirm(`Are you sure you want to delete the player "${playerName}"?`)) {
        players.splice(playerIndex, 1);
        // Also remove this player from the 'comparedWith' list of all other players
        players.forEach(p => {
            p.comparedWith = p.comparedWith.filter(name => name !== playerName);
        });
        saveData();
        updateDisplay();
        alert(`Player "${playerName}" deleted.`);
    }
}

// FUNCTION: Reset a single player's rating and stats
function resetSinglePlayer(playerIndex) {
    if (playerIndex < 0 || playerIndex >= players.length) return;
    const playerToReset = players[playerIndex];

    if (confirm(`Are you sure you want to reset the rating and comparison count for "${playerToReset.name}"? This will allow them to be compared again with previous opponents.`)) {
        const resetPlayerName = playerToReset.name;
        
        // Reset the target player's stats
        playerToReset.rating = 1500;
        playerToReset.comparisons = 0;
        playerToReset.comparedWith = [];

        // To ensure data consistency, remove the reference to the reset player 
        // from any other player who has been compared with them.
        players.forEach(p => {
            if (p.name !== resetPlayerName) {
                 const indexInComparedWith = p.comparedWith.indexOf(resetPlayerName);
                 if (indexInComparedWith > -1) {
                     p.comparedWith.splice(indexInComparedWith, 1);
                 }
            }
        });

        saveData();
        updateDisplay();
        alert(`Player "${playerToReset.name}" has been reset.`);
    }
}

// FUNCTION: Reset all player ratings to default
function resetAllRatings() {
    if (confirm('Are you sure you want to reset the ELO rating and comparison count for ALL players? Their names and positions will be kept.')) {
        players.forEach(player => {
            player.rating = 1500;
            player.comparisons = 0;
            player.comparedWith = [];
        });
        comparisons = 0; // Reset global comparison counter
        saveData();
        updateDisplay();
        // Also refresh the comparison view
        if(document.getElementById('positionFilter').value) updateComparison();
        alert('All player ratings and comparison counts have been reset to default.');
    }
}

// FUNCTION: Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to delete all players and reset all stats? This action cannot be undone!')) {
        players = [];
        comparisons = 0;
        saveData();
        updateDisplay();
        document.getElementById('comparisonContainer').innerHTML = '<div class="no-comparison">Select a position to start comparing players</div>';
        document.getElementById('teamsDisplay').innerHTML = '';
        document.getElementById('positionFilter').value = '';
        alert('All data has been cleared!');
    }
}

// FUNCTION: Display teams
function displayTeams(teams) {
    const container = document.getElementById('teamsDisplay');
    if (!container) return;
    if (!teams || teams.length === 0) {
        container.innerHTML = '<div class="no-comparison">Teams have not been created</div>';
        return;
    }
    const teamLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    let html = '';
    teams.forEach((team, i) => {
        const teamStrength = team.reduce((sum, p) => sum + p.rating, 0);
        const avgRating = team.length > 0 ? Math.round(teamStrength / team.length) : 0;
        html += `<div class="team"><h3>Team ${teamLabels[i]} (${Math.round(teamStrength)} ELO, avg ${avgRating})</h3><div style="color: var(--text-secondary); margin-bottom: 1rem;">Players: ${team.length}</div>`;
        team.sort((a, b) => {
            const order = {'S':1, 'OPP':2, 'OH':3, 'MB':4, 'L':5};
            return (order[a.position] || 6) - (order[b.position] || 6);
        }).forEach(player => {
            html += `<div class="team-player"><span>${player.name} (<b>${positions[player.position]}</b>)</span><span>${Math.round(player.rating)}</span></div>`;
        });
        html += '</div>';
    });
    container.innerHTML = html;
}

// FUNCTION: Optimize teams
function optimizeTeams() {
    const teamCount = parseInt(document.getElementById('teamCount').value) || 1;
    const requiredComposition = {};
    const positionKeys = ['S', 'OPP', 'OH', 'MB', 'L'];
    positionKeys.forEach(pos => {
        const count = parseInt(document.getElementById(`comp_${pos}`).value);
        if (count > 0) requiredComposition[pos] = count;
    });

    const playersPerTeam = Object.values(requiredComposition).reduce((a, b) => a + b, 0);
    if (playersPerTeam === 0) {
        alert('Please select at least one player in the team composition.');
        return;
    }
    
    const teamsDisplay = document.getElementById('teamsDisplay');
    teamsDisplay.innerHTML = `<div class="no-comparison" style="color: var(--text-secondary);">⚡ Searching for optimal teams...</div>`;

    setTimeout(() => {
        const playersByPosition = { 'S': [], 'OPP': [], 'OH': [], 'MB': [], 'L': [] };
        players.forEach(p => { if (playersByPosition[p.position]) playersByPosition[p.position].push(p); });

        let errorMessage = '';
        const requiredPositions = Object.keys(requiredComposition);
        for (const pos of requiredPositions) {
            const needed = requiredComposition[pos] * teamCount;
            const available = playersByPosition[pos] ? playersByPosition[pos].length : 0;
            if (available < needed) errorMessage += `Not enough players at position "${positions[pos]}": need ${needed}, have ${available}.\n`;
        }

        if (errorMessage) {
            alert('Cannot create teams:\n\n' + errorMessage);
            teamsDisplay.innerHTML = '';
            return;
        }
        
        let teams = Array.from({ length: teamCount }, () => []);
        for (const pos of requiredPositions) {
            const playersForPos = playersByPosition[pos].sort((a, b) => b.rating - a.rating).slice(0, requiredComposition[pos] * teamCount);
            for (let i = 0; i < playersForPos.length; i++) {
                const teamIndex = i % (2 * teamCount) < teamCount ? i % teamCount : teamCount - 1 - (i % teamCount);
                teams[teamIndex].push(playersForPos[i]);
            }
        }

        for (let i = 0; i < 20000; i++) {
            if (teamCount < 2 || requiredPositions.length === 0) continue;
            const team1Index = Math.floor(Math.random() * teamCount);
            let team2Index;
            do { team2Index = Math.floor(Math.random() * teamCount); } while (team1Index === team2Index);
            const [team1, team2] = [teams[team1Index], teams[team2Index]];
            const posToSwap = requiredPositions[Math.floor(Math.random() * requiredPositions.length)];
            const players1_pos = team1.filter(p => p.position === posToSwap);
            const players2_pos = team2.filter(p => p.position === posToSwap);
            if (players1_pos.length === 0 || players2_pos.length === 0) continue;
            const player1_to_swap = players1_pos[Math.floor(Math.random() * players1_pos.length)];
            const player2_to_swap = players2_pos[Math.floor(Math.random() * players2_pos.length)];
            const currentStrengths = teams.map(t => t.reduce((sum, p) => sum + p.rating, 0));
            const currentBalance = Math.max(...currentStrengths) - Math.min(...currentStrengths);
            const newStrengths = [...currentStrengths];
            newStrengths[team1Index] += player2_to_swap.rating - player1_to_swap.rating;
            newStrengths[team2Index] += player1_to_swap.rating - player2_to_swap.rating;
            const newBalance = Math.max(...newStrengths) - Math.min(...newStrengths);
            if (newBalance < currentBalance) {
                teams[team1Index][team1.indexOf(player1_to_swap)] = player2_to_swap;
                teams[team2Index][team2.indexOf(player2_to_swap)] = player1_to_swap;
            }
        }
        
        const usedPlayerNames = new Set(teams.flat().map(p => p.name));
        const unassignedPlayers = players.filter(p => !usedPlayerNames.has(p.name));
        teams.sort((a,b) => b.reduce((s, p) => s + p.rating, 0) - a.reduce((s, p) => s + p.rating, 0));
        const finalStrengths = teams.map(t => t.reduce((sum, p) => sum + p.rating, 0));
        const finalBalance = teamCount > 1 ? Math.max(...finalStrengths) - Math.min(...finalStrengths) : 0;
        displayTeams(teams);
        setTimeout(() => {
            let message = `✅ Teams created with composition ${playersPerTeam}v${playersPerTeam}!\nStrength difference: ${Math.round(finalBalance)} ELO.\n\n`;
            if (unassignedPlayers.length > 0) message += `The following players were not included:\n- ${unassignedPlayers.map(p => p.name).join('\n- ')}`;
            alert(message);
        }, 150);
    }, 50);
}

// FUNCTION: Switch tabs
function showTab(tabName, targetElement) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    targetElement.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    if (tabName === 'rankings') updateRankings();
}

// FUNCTION: Update player list and stats
function updatePlayersList() {
    const container = document.getElementById('playersList');
    const totalPlayersSpan = document.getElementById('totalPlayers');
    const statsContainer = document.getElementById('playersStats');
    if (!container || !totalPlayersSpan || !statsContainer) return;

    totalPlayersSpan.textContent = players.length;
    
    const positionCounts = Object.fromEntries(Object.keys(positions).map(key => [key, 0]));
    players.forEach(player => { if (positionCounts[player.position] !== undefined) positionCounts[player.position]++; });
    
    let statsHtml = '';
    for (const pos in positionCounts) {
        const count = positionCounts[pos];
        statsHtml += `<div style="text-align: center;"><div style="font-weight: 600; font-size: 1.2rem;">${count}</div><div style="font-size: 0.9rem; color:var(--text-secondary);">${positions[pos]}s</div></div>`;
    }
    statsContainer.innerHTML = statsHtml;

    if (players.length === 0) {
        container.innerHTML = '<div class="no-comparison" style="grid-column: 1 / -1;">No players yet. Add players above.</div>';
        return;
    }

    let html = '';
    players.sort((a,b) => a.name.localeCompare(b.name)).forEach((player, i) => {
        // Find the original index before sorting, as our functions rely on it.
        const originalIndex = players.findIndex(p => p.name === player.name);
        html += `
        <div class="player-item">
            <div class="player-content-wrapper">
                <div class="player-info-item">
                    <strong>${player.name}</strong>
                    <span style="color:var(--text-secondary); font-size:0.9rem;">${positions[player.position]}</span>
                    <span style="color:var(--text-secondary); font-size:0.9rem;">ELO: ${Math.round(player.rating)} | Compares: ${player.comparisons}</span>
                </div>
                <div class="player-actions">
                    <button class="btn btn-warning" data-reset-player-index="${originalIndex}">Reset</button>
                    <button class="btn btn-danger" data-player-index="${originalIndex}">Remove</button>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;

    container.querySelectorAll('.btn-danger[data-player-index]').forEach(btn => 
        btn.addEventListener('click', e => deletePlayer(parseInt(e.currentTarget.dataset.playerIndex)))
    );
    container.querySelectorAll('.btn-warning[data-reset-player-index]').forEach(btn => 
        btn.addEventListener('click', e => resetSinglePlayer(parseInt(e.currentTarget.dataset.resetPlayerIndex)))
    );
}

// FUNCTION: Update rankings
function updateRankings() {
    const container = document.getElementById('rankingsContainer');
    container.innerHTML = '';
    Object.keys(positions).forEach(pos => {
        const posPlayers = players.filter(p => p.position === pos);
        if (posPlayers.length === 0) return;
        posPlayers.sort((a, b) => b.rating - a.rating);
        const rankingDiv = document.createElement('div');
        rankingDiv.className = 'position-ranking';
        let html = `<h3 class="position-title">${positions[pos]}s</h3>`;
        posPlayers.forEach((player, j) => {
            let rankClass = j === 0 ? 'gold' : (j === 1 ? 'silver' : (j === 2 ? 'bronze' : ''));
            html += `<div class="ranking-item"><div class="rank-number ${rankClass}">${j + 1}</div><div class="player-info"><div>${player.name}</div><div class="player-rating-display" style="color:var(--text-secondary); font-size: 0.9rem;">${Math.round(player.rating)} ELO</div></div></div>`;
        });
        rankingDiv.innerHTML = html;
        container.appendChild(rankingDiv);
    });
}

// FUNCTION: Update players per team display
function updatePlayersPerTeam() {
    const playersPerTeamEl = document.getElementById('playersPerTeam');
    if (!playersPerTeamEl) return;
    let total = 0;
    document.querySelectorAll('.composition-input').forEach(input => total += parseInt(input.value) || 0);
    playersPerTeamEl.textContent = total;
}

// FUNCTION: Update comparison interface
function updateComparison() {
    const positionEl = document.getElementById('positionFilter');
    const container = document.getElementById('comparisonContainer');
    currentPair = null;
    const position = positionEl.value;
    if (!position) {
        container.innerHTML = '<div class="no-comparison">Select a position to start comparing players</div>';
        return;
    }
    const positionPlayers = players.filter(p => p.position === position);
    if (positionPlayers.length < 2) {
        container.innerHTML = '<div class="no-comparison">Not enough players in this position to compare</div>';
        return;
    }
    let minComparisons = Math.min(...positionPlayers.map(p => p.comparisons));
    let comparisonPool = positionPlayers.filter(p => p.comparisons === minComparisons);
    let foundPair = null;
    
    // Fisher-Yates shuffle for randomness
    for (let i = comparisonPool.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1));
        [comparisonPool[i], comparisonPool[j]] = [comparisonPool[j], comparisonPool[i]];
    }
    
    // Try to find a pair from the pool of players with minimum comparisons
    if (comparisonPool.length >= 2) {
        for (let i = 0; i < comparisonPool.length; i++) {
            for (let j = i + 1; j < comparisonPool.length; j++) {
                if (!comparisonPool[i].comparedWith.includes(comparisonPool[j].name)) {
                    foundPair = [comparisonPool[i], comparisonPool[j]]; break;
                }
            }
            if (foundPair) break;
        }
    }
    // If no pair is found, search all players in the position (fallback)
    if (!foundPair) {
        const allPositionPlayers = [...positionPlayers].sort((a,b) => a.comparisons - b.comparisons);
        for (let i = 0; i < allPositionPlayers.length; i++) {
            for (let j = i + 1; j < allPositionPlayers.length; j++) {
                if (!allPositionPlayers[i].comparedWith.includes(allPositionPlayers[j].name)) {
                    foundPair = [allPositionPlayers[i], allPositionPlayers[j]]; break;
                }
            }
            if (foundPair) break;
        }
    }

    if (foundPair) {
        currentPair = foundPair;
        container.innerHTML = `<div class="comparison-area"><div class="player-card" data-winner-index="0"><div class="player-avatar" style="background:linear-gradient(135deg, #2563eb, #3b82f6);">${currentPair[0].name.charAt(0)}</div><div class="player-name">${currentPair[0].name}</div><div class="player-position">${positions[currentPair[0].position]}</div><div class="player-rating">${Math.round(currentPair[0].rating)} ELO</div><div style="font-size: 0.9em; color:var(--text-secondary); margin-top: 5px;">Compares: ${currentPair[0].comparisons}</div></div><div class="vs-divider">VS</div><div class="player-card" data-winner-index="1"><div class="player-avatar" style="background:linear-gradient(135deg, #a855f7, #ec4899);">${currentPair[1].name.charAt(0)}</div><div class="player-name">${currentPair[1].name}</div><div class="player-position">${positions[currentPair[1].position]}</div><div class="player-rating">${Math.round(currentPair[1].rating)} ELO</div><div style="font-size: 0.9em; color:var(--text-secondary); margin-top: 5px;">Compares: ${currentPair[1].comparisons}</div></div></div>`;
        container.querySelectorAll('.player-card').forEach(card => card.addEventListener('click', e => selectWinner(parseInt(e.currentTarget.dataset.winnerIndex))));
    } else {
        container.innerHTML = '<div class="no-comparison">🎉 All possible unique pairs in this category have been compared!</div>';
    }
    updateComparisonStats();
}

// FUNCTION: Select a winner and update ratings
function selectWinner(winnerIndex) {
    if (!currentPair) return;
    const [winner, loser] = winnerIndex === 0 ? [currentPair[0], currentPair[1]] : [currentPair[1], currentPair[0]];
    const expectedWin = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    const kFactor = 30;
    winner.rating += kFactor * (1 - expectedWin);
    loser.rating += kFactor * (0 - (1 - expectedWin));
    winner.comparisons++;
    loser.comparisons++;
    comparisons++;
    if (!winner.comparedWith.includes(loser.name)) winner.comparedWith.push(loser.name);
    if (!loser.comparedWith.includes(winner.name)) loser.comparedWith.push(winner.name);
    saveData();
    setTimeout(() => {
        updateDisplay();
        updateComparison();
    }, 300);
}

// FUNCTION: Update comparison statistics display
function updateComparisonStats() {
    const stats = document.getElementById('comparisonStats');
    const position = document.getElementById('positionFilter').value;
    if (position) {
        const posCount = players.filter(p => p.position === position).length;
        stats.innerHTML = `Players in category "${positions[position]}s": ${posCount}<br>Total comparisons made: ${comparisons}`;
    } else {
        stats.innerHTML = `Total comparisons made: ${comparisons}`;
    }
}

// FUNCTION: Update the entire UI
function updateDisplay() {
    updatePlayersList();
    updateRankings();
    updateComparisonStats();
    updatePlayersPerTeam();
}

// FUNCTION: Save data to localStorage
function saveData() {
    localStorage.setItem('volleyRankData', JSON.stringify({ players, comparisons }));
}

// FUNCTION: Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('volleyRankData');
    if (saved) {
        const data = JSON.parse(saved);
        players = data.players || [];
        // Ensure new fields exist for old data
        players.forEach(p => {
            p.comparisons = p.comparisons || 0;
            p.comparedWith = p.comparedWith || [];
        });
        comparisons = data.comparisons || 0;
    } else {
        // Demo data for first-time use
        players = [
            { name: "Andrei Popov", position: "OH", rating: 1500, comparisons: 0, comparedWith: [] },
        ];
        comparisons = 0;
    }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDisplay();
    
    document.getElementById('addPlayerBtn').addEventListener('click', addPlayer);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
    document.getElementById('resetAllRatingsBtn').addEventListener('click', resetAllRatings);
    document.getElementById('optimizeTeamsBtn').addEventListener('click', optimizeTeams);
    
    document.getElementById('playerName').addEventListener('keypress', e => {
        if (e.key === 'Enter') { e.preventDefault(); addPlayer(); }
    });
    
    document.getElementById('positionFilter').addEventListener('change', updateComparison);
    document.getElementById('teamCount').addEventListener('input', updatePlayersPerTeam);
    document.querySelectorAll('.composition-input').forEach(input => {
        input.addEventListener('input', updatePlayersPerTeam);
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', e => {
            let tabName = '';
            const text = e.target.textContent;
            if (text.includes('Compare')) tabName = 'compare';
            else if (text.includes('Rankings')) tabName = 'rankings';
            else if (text.includes('Teams')) tabName = 'teams';
            else if (text.includes('Settings')) tabName = 'setup';
            
            if (tabName) showTab(tabName, e.target);
        });
    });
});
