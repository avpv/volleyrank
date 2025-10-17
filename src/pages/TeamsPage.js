/**
 * TeamsPage - Team builder page
 */
import BasePage from './BasePage.js';
import playerService from '../services/PlayerService.js';
import teamOptimizerService from '../services/TeamOptimizerService.js';
import eloService from '../services/EloService.js';
import toast from '../components/base/Toast.js';

class TeamsPage extends BasePage {
    constructor(container) {
        super(container);
        this.setTitle('Teams');
        this.state = {
            teams: null,
            isOptimizing: false,
            showEloRatings: true
        };
    }

    onCreate() {
        this.on('player:added', () => this.update());
        this.on('player:removed', () => {
            this.setState({ teams: null });
        });
    }

    onMount() {
        this.attachEventListeners();
    }

    onUpdate() {
        this.attachEventListeners();
    }

    render() {
        return this.renderPage(`
            <div class="page-header">
                <h2>Create Balanced Teams</h2>
            </div>

            ${this.renderTeamBuilder()}
            ${this.state.teams ? this.renderTeamsDisplay() : ''}
        `);
    }

    renderTeamBuilder() {
        const players = playerService.getAll();

        return `
            <div class="team-builder">
                <div class="builder-settings">
                    <div class="form-group">
                        <label class="section-label">Number of Teams</label>
                        <input 
                            type="number" 
                            id="teamCount" 
                            value="2" 
                            min="1" 
                            max="10"
                            class="team-count-input"
                        >
                    </div>

                    <h3>Team Composition</h3>
                    <div class="composition-grid">
                        ${this.renderCompositionInputs()}
                    </div>

                    <div class="builder-info">
                        Players per team: <span id="playersPerTeam">6</span>
                    </div>

                    <button 
                        class="btn btn-primary btn-large" 
                        id="optimizeBtn"
                        ${players.length < 2 ? 'disabled' : ''}
                    >
                        ${this.state.isOptimizing ? 'Optimizing...' : 'Create Teams'}
                    </button>
                </div>
            </div>
        `;
    }

    renderCompositionInputs() {
        const positions = {
            'S': 'Setter',
            'OPP': 'Opposite',
            'OH': 'Outside Hitter',
            'MB': 'Middle Blocker',
            'L': 'Libero'
        };

        const defaults = { S: 1, OPP: 1, OH: 2, MB: 2, L: 0 };

        return Object.entries(positions).map(([key, name]) => `
            <div class="composition-item">
                <label>${name}</label>
                <input 
                    type="number" 
                    id="comp_${key}" 
                    value="${defaults[key]}" 
                    min="0" 
                    max="6"
                    class="composition-input"
                >
            </div>
        `).join('');
    }

    renderTeamsDisplay() {
        if (!this.state.teams) return '';

        const { teams, balance, algorithm } = this.state.teams;

        return `
            <div class="teams-result">
                <div class="result-header">
                    <h3>Generated Teams</h3>
                    <div class="result-controls">
                        <label class="toggle-label">
                            <input 
                                type="checkbox" 
                                id="showEloToggle" 
                                ${this.state.showEloRatings ? 'checked' : ''}
                            >
                            Show ELO Ratings
                        </label>
                        <button class="btn btn-secondary" id="exportTeamsBtn">
                            Export Teams
                        </button>
                    </div>
                </div>

                <div class="result-info">
                    <div class="info-badge ${balance.isBalanced ? 'success' : 'warning'}">
                        Balance: ${balance.maxDifference} ELO difference
                    </div>
                    <div class="info-badge">
                        Algorithm: ${algorithm}
                    </div>
                </div>

                <div class="teams-grid">
                    ${teams.map((team, index) => this.renderTeam(team, index)).join('')}
                </div>
            </div>
        `;
    }

    renderTeam(team, index) {
        const strength = eloService.calculateTeamStrength(team);
        const showElo = this.state.showEloRatings;

        return `
            <div class="team-card">
                <div class="team-header">
                    <h4>Team ${index + 1}</h4>
                    ${showElo ? `
                        <div class="team-rating">
                            ${strength.totalRating} ELO (avg ${strength.averageRating})
                        </div>
                    ` : ''}
                </div>

                <div class="team-players">
                    ${team.map(player => this.renderTeamPlayer(player, showElo)).join('')}
                </div>
            </div>
        `;
    }

    renderTeamPlayer(player, showElo) {
        const position = player.assignedPosition;
        const rating = Math.round(player.positionRating);
        const posName = playerService.positions[position];

        return `
            <div class="team-player">
                <div class="player-info">
                    <div class="player-name">${this.escape(player.name)}</div>
                    <div class="player-position">${posName}</div>
                </div>
                ${showElo ? `
                    <div class="player-rating">${rating}</div>
                ` : ''}
            </div>
        `;
    }

    attachEventListeners() {
        // Update players per team
        const updatePlayersPerTeam = () => {
            const teamCount = parseInt(this.$('#teamCount')?.value) || 2;
            const composition = this.getComposition();
            const total = Object.values(composition).reduce((sum, val) => sum + val, 0);
            const perTeam = this.$('#playersPerTeam');
            if (perTeam) perTeam.textContent = total;
        };

        // Team count change
        const teamCountInput = this.$('#teamCount');
        if (teamCountInput) {
            teamCountInput.addEventListener('input', updatePlayersPerTeam);
        }

        // Composition inputs
        this.$$('.composition-input').forEach(input => {
            input.addEventListener('input', updatePlayersPerTeam);
        });

        // Initial update
        updatePlayersPerTeam();

        // Optimize button
        const optimizeBtn = this.$('#optimizeBtn');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => this.handleOptimize());
        }

        // Show ELO toggle
        const showEloToggle = this.$('#showEloToggle');
        if (showEloToggle) {
            showEloToggle.addEventListener('change', (e) => {
                this.setState({ showEloRatings: e.target.checked });
            });
        }

        // Export button
        const exportBtn = this.$('#exportTeamsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }
    }

    getComposition() {
        const positions = ['S', 'OPP', 'OH', 'MB', 'L'];
        const composition = {};

        positions.forEach(pos => {
            const input = this.$(`#comp_${pos}`);
            composition[pos] = parseInt(input?.value) || 0;
        });

        return composition;
    }

    async handleOptimize() {
        if (this.state.isOptimizing) return;

        try {
            this.setState({ isOptimizing: true });

            const teamCount = parseInt(this.$('#teamCount')?.value) || 2;
            const composition = this.getComposition();
            const players = playerService.getAll();

            // Validate
            if (Object.values(composition).every(v => v === 0)) {
                toast.error('Please select at least one player per team');
                return;
            }

            // Show optimizing message
            toast.info('Optimizing teams... This may take a moment', 10000);

            // Optimize (async)
            const result = await teamOptimizerService.optimize(
                composition,
                teamCount,
                players
            );

            this.setState({ 
                teams: result,
                isOptimizing: false 
            });

            toast.success(`Teams created! Balance: ${result.balance.maxDifference} ELO difference`);

        } catch (error) {
            this.setState({ isOptimizing: false });
            toast.error(error.message);
        }
    }

    handleExport() {
        if (!this.state.teams) return;

        try {
            const { teams } = this.state.teams;
            const showElo = this.state.showEloRatings;
            
            const lines = [];
            const header = showElo ? 
                ['Team', 'Player', 'Position', 'ELO Rating'] : 
                ['Team', 'Player', 'Position'];
            
            lines.push(header.join(','));

            teams.forEach((team, teamIndex) => {
                team.forEach(player => {
                    const position = player.assignedPosition;
                    const posName = playerService.positions[position];
                    const rating = Math.round(player.positionRating);
                    
                    const row = [
                        `Team ${teamIndex + 1}`,
                        `"${player.name.replace(/"/g, '""')}"`,
                        posName
                    ];
                    
                    if (showElo) {
                        row.push(rating);
                    }
                    
                    lines.push(row.join(','));
                });
            });

            const csv = lines.join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `volleyrank-teams-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('Teams exported!');
        } catch (error) {
            toast.error('Export failed');
        }
    }
}

export default TeamsPage;
