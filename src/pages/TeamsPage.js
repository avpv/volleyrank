// src/pages/TeamsPage.js

/**
 * TeamsPage - Team builder page
 */
import BasePage from './BasePage.js';
import toast from '../components/base/Toast.js';
import { getIcon } from '../components/base/Icons.js';

class TeamsPage extends BasePage {
    constructor(container, props = {}) {
        super(container, props);
        this.setTitle('Teams');

        // Get services from props
        this.activityConfig = props.activityConfig;
        this.playerService = props.services?.resolve('playerService');
        this.teamOptimizerService = props.services?.resolve('teamOptimizerService');
        this.eloService = props.services?.resolve('eloService');

        // Initialize position weights from config
        const initialWeights = {};
        Object.keys(this.activityConfig.positions).forEach(pos => {
            initialWeights[pos] = this.activityConfig.positionWeights[pos] || 1.0;
        });

        this.state = {
            teams: null,
            isOptimizing: false,
            showEloRatings: true,
            teamCount: 2,
            composition: this.activityConfig.defaultComposition,
            positionWeights: initialWeights,
            weightsAccordionOpen: false
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
        const players = this.playerService.getAll();

        return `
            <div class="team-builder">
                <div class="builder-settings">
                    <div class="form-group">
                        <label>Number of Teams</label>
                        <input
                            type="number"
                            id="teamCount"
                            value="${this.state.teamCount}"
                            min="1"
                            max="10"
                            class="team-count-input"
                        >
                    </div>
                </div>

                <div class="form-group">
                    <label>Team Composition</label>
                    <div class="composition-grid">
                        ${this.renderCompositionInputs()}
                    </div>
                </div>

                <div class="accordion">
                    <button class="accordion-header" id="weightsAccordionBtn" type="button">
                        <span>Position Weights</span>
                        <svg class="accordion-icon ${this.state.weightsAccordionOpen ? 'open' : ''}" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
                        </svg>
                    </button>
                    <div class="accordion-content ${this.state.weightsAccordionOpen ? 'open' : ''}">
                        <div class="composition-grid">
                            ${this.renderPositionWeightInputs()}
                        </div>
                    </div>
                </div>

                <div class="builder-settings">
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
        // Use positions from team-optimizer for consistency
        return Object.entries(this.activityConfig.positions).map(([key, name]) => `
            <div class="composition-item">
                <label>${name}</label>
                <input
                    type="number"
                    id="comp_${key}"
                    value="${this.state.composition[key]}"
                    min="0"
                    max="6"
                    class="composition-input"
                >
            </div>
        `).join('');
    }

    renderPositionWeightInputs() {
        // Render weight inputs for each position
        return Object.entries(this.activityConfig.positions).map(([key, name]) => `
            <div class="composition-item">
                <label>${name}</label>
                <input
                    type="number"
                    id="weight_${key}"
                    value="${this.state.positionWeights[key]}"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    class="weight-input"
                >
            </div>
        `).join('');
    }

    renderTeamsDisplay() {
        if (!this.state.teams) return '';

        const { teams, balance, algorithm } = this.state.teams;
        const weightedBalance = this.calculateWeightedBalance(teams);

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
                            ${getIcon('arrow-up', { size: 16, className: 'btn-icon' })}
                            Export Teams
                        </button>
                    </div>
                </div>

                <div class="result-info">
                    <div class="info-badge ${weightedBalance <= 50 ? 'success' : 'warning'}">
                        Balance: ${weightedBalance} weighted ELO difference
                    </div>
                </div>

                <div class="teams-grid">
                    ${teams.map((team, index) => this.renderTeam(team, index)).join('')}
                </div>
            </div>
        `;
    }

    calculateWeightedBalance(teams) {
        if (!teams || teams.length < 2) return 0;

        const weightedRatings = teams.map(team => this.calculateWeightedTeamRating(team));
        const maxRating = Math.max(...weightedRatings);
        const minRating = Math.min(...weightedRatings);

        return maxRating - minRating;
    }

    renderTeam(team, index) {
        const strength = this.eloService.calculateTeamStrength(team);
        const weightedRating = this.calculateWeightedTeamRating(team);
        const showElo = this.state.showEloRatings;

        return `
            <div class="team-card">
                <div class="team-header">
                    <h4>Team ${index + 1}</h4>
                </div>
                ${showElo ? `
                    <div class="team-rating">
                        ${weightedRating} weighted ELO (${strength.totalRating} raw, avg ${strength.averageRating})
                    </div>
                ` : ''}

                <div class="team-players">
                    ${team.map(player => this.renderTeamPlayer(player, showElo)).join('')}
                </div>
            </div>
        `;
    }

    calculateWeightedTeamRating(team) {
        if (!team || team.length === 0) return 0;

        let weightedTotal = 0;

        team.forEach(player => {
            const position = player.assignedPosition || player.positions?.[0];
            const rating = position && player.ratings?.[position]
                ? player.ratings[position]
                : 1500; // DEFAULT_RATING

            const weight = this.state.positionWeights[position] || 1.0;
            weightedTotal += rating * weight;
        });

        return Math.round(weightedTotal);
    }

    renderTeamPlayer(player, showElo) {
        const position = player.assignedPosition;
        const rating = Math.round(player.positionRating);
        const posName = this.playerService.positions[position];

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
            const teamCountInput = this.$('#teamCount');
            const teamCount = parseInt(teamCountInput?.value) || 2;
            
            // Update state directly without triggering re-render
            this.state.teamCount = teamCount;
            
            const composition = this.getComposition();
        };

        // Team count change
        const teamCountInput = this.$('#teamCount');
        if (teamCountInput) {
            // Remove old listener to prevent duplicates
            const newInput = teamCountInput.cloneNode(true);
            teamCountInput.parentNode.replaceChild(newInput, teamCountInput);
            newInput.addEventListener('input', updatePlayersPerTeam);
        }

        // Composition inputs - Use querySelectorAll directly on container
        const compositionInputs = this.container.querySelectorAll('.composition-input');
        if (compositionInputs && compositionInputs.length > 0) {
            compositionInputs.forEach(input => {
                // Clone to remove old event listeners
                const newInput = input.cloneNode(true);
                input.parentNode.replaceChild(newInput, input);

                newInput.addEventListener('input', (e) => {
                    const pos = newInput.id.replace('comp_', '');
                    const value = parseInt(e.target.value) || 0;
                    this.state.composition[pos] = value;
                    updatePlayersPerTeam();
                });
            });
        }

        // Position weight inputs
        const weightInputs = this.container.querySelectorAll('.weight-input');
        if (weightInputs && weightInputs.length > 0) {
            weightInputs.forEach(input => {
                // Clone to remove old event listeners
                const newInput = input.cloneNode(true);
                input.parentNode.replaceChild(newInput, input);

                newInput.addEventListener('input', (e) => {
                    const pos = newInput.id.replace('weight_', '');
                    const value = parseFloat(e.target.value) || 1.0;
                    this.state.positionWeights[pos] = value;
                });
            });
        }

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

        // Weights accordion toggle
        const weightsAccordionBtn = this.$('#weightsAccordionBtn');
        if (weightsAccordionBtn) {
            weightsAccordionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setState({ weightsAccordionOpen: !this.state.weightsAccordionOpen });
            });
        }
    }

    getComposition() {
        const positions = this.activityConfig.positionOrder;
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

            const teamCount = this.state.teamCount;
            const composition = this.getComposition();
            const players = this.playerService.getAll();

            // Validate
            if (Object.values(composition).every(v => v === 0)) {
                toast.error('Please select at least one player per team');
                this.setState({ isOptimizing: false });
                return;
            }

            // Show optimizing message
            toast.info('Optimizing teams... This may take a moment', 10000);

            // Apply custom position weights temporarily for optimization
            const originalWeights = { ...this.activityConfig.positionWeights };
            Object.assign(this.activityConfig.positionWeights, this.state.positionWeights);

            try {
                // Optimize (async)
                const result = await this.teamOptimizerService.optimize(
                    composition,
                    teamCount,
                    players
                );

                // Calculate weighted balance for display
                const weightedBalance = this.calculateWeightedBalance(result.teams);

                this.setState({
                    teams: result,
                    isOptimizing: false
                });

                toast.success(`Teams created! Balance: ${weightedBalance} weighted ELO difference`);
            } finally {
                // Restore original weights
                Object.assign(this.activityConfig.positionWeights, originalWeights);
            }

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
                    const posName = this.playerService.positions[position];
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
            link.download = `teams-${new Date().toISOString().split('T')[0]}.csv`;
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
