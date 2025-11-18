// src/pages/TeamsPage.js

/**
 * TeamsPage - Team builder page
 */
import BasePage from './BasePage.js';
import toast from '../components/base/Toast.js';
import { getIcon } from '../components/base/Icons.js';
import storage from '../core/StorageAdapter.js';
import Sidebar from '../components/Sidebar.js';
import { activities } from '../config/activities/index.js';
import ratingConfig from '../config/rating.js';
import uiConfig from '../config/ui.js';

const { ELEMENT_IDS } = uiConfig;

class TeamsPage extends BasePage {
    constructor(container, props = {}) {
        super(container, props);
        this.setTitle('Teams');

        // Get services and activity info from props
        this.activityConfig = props.activityConfig;
        this.activityKey = props.activityKey; // Key like 'volleyball', 'basketball', etc.
        this.playerService = props.services?.resolve('playerService');
        this.teamOptimizerService = props.services?.resolve('teamOptimizerService');
        this.eloService = props.services?.resolve('eloService');
        this.sessionService = props.services?.resolve('sessionService');
        this.sessionRepository = props.services?.resolve('sessionRepository');
        this.eventBus = props.services?.resolve('eventBus');
        this.sidebar = null;

        // Initialize position weights from config
        const initialWeights = {};
        Object.keys(this.activityConfig.positions).forEach(pos => {
            initialWeights[pos] = this.activityConfig.positionWeights[pos] || uiConfig.INPUT_CONSTRAINTS.WEIGHT.DEFAULT;
        });

        // Load saved settings and teams from active session
        const savedSettings = this.loadSettings();
        const savedTeams = this.loadTeams();

        this.state = {
            teams: savedTeams,
            isOptimizing: false,
            showEloRatings: savedSettings.showEloRatings ?? true,
            teamCount: savedSettings.teamCount ?? 2,
            composition: savedSettings.composition ?? this.activityConfig.defaultComposition,
            positionWeights: savedSettings.positionWeights ?? initialWeights
        };
    }

    onCreate() {
        this.on('player:added', () => this.update());
        this.on('player:removed', () => {
            this.setState({ teams: null });
            this.saveTeams(null);
        });
        this.on('session:activated', () => {
            // When session changes, reload settings and teams
            const savedSettings = this.loadSettings();
            const savedTeams = this.loadTeams();
            this.setState({
                teams: savedTeams,
                showEloRatings: savedSettings.showEloRatings ?? true,
                teamCount: savedSettings.teamCount ?? 2,
                composition: savedSettings.composition ?? this.activityConfig.defaultComposition,
                positionWeights: this.getInitialWeights()
            });
        });
        this.on('state:changed', () => {
            // When state changes (e.g., session switch within same activity), reload data
            const savedSettings = this.loadSettings();
            const savedTeams = this.loadTeams();
            this.setState({
                teams: savedTeams,
                showEloRatings: savedSettings.showEloRatings ?? true,
                teamCount: savedSettings.teamCount ?? 2,
                composition: savedSettings.composition ?? this.activityConfig.defaultComposition,
                positionWeights: this.getInitialWeights()
            });
        });
    }

    getInitialWeights() {
        const initialWeights = {};
        Object.keys(this.activityConfig.positions).forEach(pos => {
            initialWeights[pos] = this.activityConfig.positionWeights[pos] || uiConfig.INPUT_CONSTRAINTS.WEIGHT.DEFAULT;
        });
        return initialWeights;
    }

    onMount() {
        this.mountSidebar();
        this.attachEventListeners();
    }

    onUpdate() {
        // Re-mount sidebar if container was re-rendered
        this.mountSidebar();
        this.attachEventListeners();
    }

    onDestroy() {
        if (this.sidebar) {
            this.sidebar.destroy();
            this.sidebar = null;
        }
    }

    mountSidebar() {
        const sidebarContainer = document.getElementById(ELEMENT_IDS.SIDEBAR_CONTAINER);
        if (!sidebarContainer) return;

        // Check if sidebar already exists and is properly mounted
        if (this.sidebar && sidebarContainer.children.length > 0) {
            // Sidebar is already mounted, just update it
            this.sidebar.update();
            return;
        }

        // Destroy old sidebar if it exists but is not mounted
        if (this.sidebar) {
            this.sidebar.destroy();
        }

        // Use the activityKey passed as prop (can be null if no activity selected)
        const activityKey = this.activityKey;
        const activityConfig = activityKey ? activities[activityKey] : null;

        // Always create sidebar - it will show all sessions from all activities
        this.sidebar = new Sidebar(sidebarContainer, {
            sessionService: this.sessionService,
            eventBus: this.eventBus,
            activityKey: activityKey, // Can be null
            activityName: activityConfig?.name || null
        });

        this.sidebar.mount();
        this.addComponent(this.sidebar);
        this.setupMobileSidebarToggle();
    }

    /**
     * Load settings from active session
     */
    loadSettings() {
        try {
            const activeSessionId = this.sessionRepository.getActiveSessionId(this.activityKey);
            if (!activeSessionId) {
                return {};
            }

            const saved = this.sessionRepository.getTeamBuilderSettings(this.activityKey, activeSessionId);
            if (!saved) {
                return {};
            }

            return {
                showEloRatings: saved.showEloRatings,
                teamCount: saved.teamCount,
                composition: saved.composition,
                positionWeights: saved.positionWeights
            };
        } catch (error) {
            console.error('Error loading settings from session:', error);
            return {};
        }
    }

    /**
     * Save settings to active session
     */
    saveSettings() {
        try {
            const activeSessionId = this.sessionRepository.getActiveSessionId(this.activityKey);
            if (!activeSessionId) {
                console.warn('No active session to save settings to');
                return;
            }

            const settings = {
                showEloRatings: this.state.showEloRatings,
                teamCount: this.state.teamCount,
                composition: this.state.composition,
                positionWeights: this.state.positionWeights,
                savedAt: new Date().toISOString()
            };

            this.sessionRepository.updateTeamBuilderSettings(this.activityKey, activeSessionId, settings);
        } catch (error) {
            console.error('Error saving settings to session:', error);
        }
    }

    /**
     * Load generated teams from active session
     */
    loadTeams() {
        try {
            const activeSessionId = this.sessionRepository.getActiveSessionId(this.activityKey);
            if (!activeSessionId) {
                return null;
            }

            return this.sessionRepository.getGeneratedTeams(this.activityKey, activeSessionId);
        } catch (error) {
            console.error('Error loading teams from session:', error);
            return null;
        }
    }

    /**
     * Save generated teams to active session
     */
    saveTeams(teams) {
        try {
            const activeSessionId = this.sessionRepository.getActiveSessionId(this.activityKey);
            if (!activeSessionId) {
                console.warn('No active session to save teams to');
                return;
            }

            this.sessionRepository.updateGeneratedTeams(this.activityKey, activeSessionId, teams);
        } catch (error) {
            console.error('Error saving teams to session:', error);
        }
    }

    render() {
        return this.renderPageWithSidebar(`
            <div class="page-header">
                <h2>Create Balanced Teams</h2>
                <p class="text-secondary mt-2">Configure team composition and weights, then generate optimally balanced teams using mathematical algorithms</p>
            </div>

            ${this.renderTeamBuilder()}
            ${this.state.teams ? this.renderTeamsDisplay() : ''}
        `);
    }

    renderTeamBuilder() {
        const players = this.playerService.getAll();

        return `
            <div class="team-builder" role="region" aria-label="Team builder configuration">
                <div class="builder-settings">
                    <div class="form-group">
                        <label for="teamCount">Number of Teams</label>
                        <input
                            type="number"
                            id="teamCount"
                            value="${this.state.teamCount}"
                            min="${uiConfig.INPUT_CONSTRAINTS.TEAM_COUNT.MIN}"
                            max="${uiConfig.INPUT_CONSTRAINTS.TEAM_COUNT.MAX}"
                            class="team-count-input"
                            aria-label="Number of teams to create"
                            aria-describedby="team-count-help"
                        >
                        <p class="form-help-text" id="team-count-help">
                            Choose how many teams to create (${uiConfig.INPUT_CONSTRAINTS.TEAM_COUNT.MIN}-${uiConfig.INPUT_CONSTRAINTS.TEAM_COUNT.MAX})
                        </p>
                    </div>
                </div>

                <div class="form-group">
                    <label>Team Composition & Weights</label>
                    <p class="form-help-text mb-3">
                        Set how many players per position and their importance weight (higher weight = more important for balance)
                    </p>
                    <div class="composition-table" role="table" aria-label="Team composition configuration">
                        <div class="composition-table-header" role="row">
                            <div class="composition-header-cell position-cell" role="columnheader">Position</div>
                            <div class="composition-header-cell" role="columnheader">
                                <span class="tooltip-wrapper">
                                    Count
                                    <span class="tooltip-icon" role="tooltip">
                                        ${getIcon('info', { size: 14 })}
                                        <span class="tooltip-content">Players per team at this position</span>
                                    </span>
                                </span>
                            </div>
                            <div class="composition-header-cell" role="columnheader">
                                <span class="tooltip-wrapper">
                                    Weight
                                    <span class="tooltip-icon" role="tooltip">
                                        ${getIcon('info', { size: 14 })}
                                        <span class="tooltip-content">Balance priority (1.0-3.0, higher = more important)</span>
                                    </span>
                                </span>
                            </div>
                        </div>
                        ${this.renderCompositionWithWeights()}
                    </div>
                </div>

                <div class="builder-settings">
                    <button
                        class="btn btn-primary btn-large"
                        id="optimizeBtn"
                        ${players.length < 2 ? 'disabled' : ''}
                        aria-label="${this.state.isOptimizing ? 'Optimizing teams...' : 'Generate balanced teams'}"
                        ${this.state.isOptimizing ? 'aria-busy="true"' : ''}>
                        ${getIcon('users', { size: 18, className: 'btn-icon' })}
                        ${this.state.isOptimizing ? 'Generating Teams...' : 'Generate Balanced Teams'}
                    </button>
                    ${players.length < 2 ? `
                        <p class="form-help-text text-warning mt-3">
                            ⚠️ Add at least 2 players on the Settings page to create teams
                        </p>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderCompositionWithWeights() {
        // Render both composition count and weight inputs for each position
        return Object.entries(this.activityConfig.positions).map(([key, name]) => `
            <div class="composition-row" role="row">
                <div class="composition-cell position-name" role="cell">${name}</div>
                <div class="composition-cell" role="cell">
                    <input
                        type="number"
                        id="comp_${key}"
                        value="${this.state.composition[key]}"
                        min="${uiConfig.INPUT_CONSTRAINTS.COMPOSITION.MIN}"
                        max="${uiConfig.INPUT_CONSTRAINTS.COMPOSITION.MAX}"
                        class="composition-input"
                        aria-label="Number of ${name}s per team"
                        title="${name} count"
                    >
                </div>
                <div class="composition-cell" role="cell">
                    <input
                        type="number"
                        id="weight_${key}"
                        value="${this.state.positionWeights[key]}"
                        min="${uiConfig.INPUT_CONSTRAINTS.WEIGHT.MIN}"
                        max="${uiConfig.INPUT_CONSTRAINTS.WEIGHT.MAX}"
                        step="${uiConfig.INPUT_CONSTRAINTS.WEIGHT.STEP}"
                        class="weight-input"
                        aria-label="${name} position weight"
                        title="${name} importance weight"
                    >
                </div>
            </div>
        `).join('');
    }

    renderTeamsDisplay() {
        if (!this.state.teams) return '';

        const { teams, balance, algorithm } = this.state.teams;
        const weightedBalance = this.calculateWeightedBalance(teams);
        const quality = this.getBalanceQuality(weightedBalance);

        return `
            <div class="teams-result" role="region" aria-label="Generated teams results">
                <div class="result-header d-flex flex-column md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h3 class="text-xl md:text-2xl font-semibold m-0">Your Balanced Teams</h3>
                        <p class="text-secondary text-sm mt-1">${teams.length} teams generated</p>
                    </div>
                    <div class="result-controls d-flex items-center gap-4">
                        <label class="toggle-switch">
                            <input
                                type="checkbox"
                                id="showEloToggle"
                                ${this.state.showEloRatings ? 'checked' : ''}
                                aria-label="Toggle ELO ratings visibility"
                            >
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">Show ELO Ratings</span>
                        </label>
                        <div class="control-divider" style="width: 1px; height: 24px; background: var(--color-border-default);" aria-hidden="true"></div>
                        <button
                            class="btn btn-primary btn-sm"
                            id="exportTeamsBtn"
                            aria-label="Export teams to file">
                            ${getIcon('arrow-up', { size: 16, className: 'btn-icon' })}
                            Export
                        </button>
                    </div>
                </div>

                <div class="balance-indicator balance-indicator--${quality.class}" role="status" aria-live="polite">
                    <div class="balance-icon" aria-hidden="true">
                        ${getIcon(quality.icon, { size: 40, className: 'balance-icon-svg' })}
                    </div>
                    <div class="balance-content">
                        <span class="balance-label d-flex items-center gap-2">
                            Team Balance Quality:
                            <span class="status-badge status-badge--${weightedBalance < 50 ? 'success' : weightedBalance < 100 ? 'info' : 'warning'}">
                                ${quality.label}
                            </span>
                        </span>
                        <span class="balance-value">${weightedBalance} ELO average difference</span>
                    </div>
                    <div class="balance-explanation">
                        ${weightedBalance < 50 ? 'Excellent balance!' : weightedBalance < 100 ? 'Good balance' : 'Consider re-generating for better balance'}
                        Lower difference means more even teams.
                    </div>
                </div>

                <div class="teams-grid d-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

        return Math.round(maxRating - minRating);
    }

    getBalanceQuality(weightedBalance) {
        const thresholds = ratingConfig.BALANCE_THRESHOLDS.QUALITY;
        if (weightedBalance <= thresholds.EXCELLENT) return { label: 'Excellent', class: 'excellent', icon: 'target' };
        if (weightedBalance <= thresholds.GOOD) return { label: 'Very Good', class: 'good', icon: 'award' };
        if (weightedBalance <= thresholds.FAIR) return { label: 'Good', class: 'okay', icon: 'thumbs-up' };
        if (weightedBalance <= thresholds.POOR) return { label: 'Fair', class: 'fair', icon: 'scale' };
        return { label: 'Poor', class: 'poor', icon: 'alert-triangle' };
    }

    renderTeam(team, index) {
        const strength = this.eloService.calculateTeamStrength(team);
        const weightedRating = this.calculateWeightedTeamRating(team);
        const showElo = this.state.showEloRatings;

        return `
            <div class="team-card">
                <div class="team-header mb-4 d-flex justify-between items-center">
                    <h4 class="font-semibold text-lg md:text-xl m-0">Team ${index + 1}</h4>
                    ${showElo ? `<span class="status-badge status-badge--neutral">${weightedRating} ELO</span>` : ''}
                </div>

                <div class="team-players divide-y divide-subtle">
                    ${team.map((player, playerIndex) => this.renderTeamPlayer(player, showElo, playerIndex)).join('')}
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
                : ratingConfig.RATING_CONSTANTS.DEFAULT;

            const weight = this.state.positionWeights[position] || uiConfig.INPUT_CONSTRAINTS.WEIGHT.DEFAULT;
            weightedTotal += rating * weight;
        });

        return Math.round(weightedTotal);
    }

    renderTeamPlayer(player, showElo, playerIndex) {
        const position = player.assignedPosition;
        const rating = Math.round(player.positionRating);
        const posName = this.playerService.positions[position];
        const comparisons = player.positionComparisons || 0;

        // Determine rating status based on comparisons
        const hasComparisons = comparisons > 0;
        const statusClass = hasComparisons ? 'success' : 'neutral';

        return `
            <div class="team-player">
                <div class="player-info flex-1">
                    <div class="player-name font-medium mb-1">
                        ${this.escape(player.name)}
                    </div>
                    <div class="player-position text-sm text-secondary">${posName}</div>
                </div>
                ${showElo ? `
                    <div class="player-rating font-semibold text-brand">${rating}</div>
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

            // Save settings to localStorage
            this.saveSettings();
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
                    const value = parseInt(e.target.value) || uiConfig.INPUT_CONSTRAINTS.COMPOSITION_DEFAULT;
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
                    const value = parseFloat(e.target.value) || uiConfig.INPUT_CONSTRAINTS.WEIGHT.DEFAULT;
                    this.state.positionWeights[pos] = value;

                    // Save settings to localStorage
                    this.saveSettings();
                });
            });
        }

        // Don't call updatePlayersPerTeam() here - it causes infinite loop
        // by saving settings which triggers state:changed which triggers onUpdate()
        // which calls attachEventListeners() again. Settings are already loaded
        // from loadSettings() in the state:changed listener.

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

                // Save settings to localStorage
                this.saveSettings();
            });
        }

        // Export button
        const exportBtn = this.$('#exportTeamsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }
    }

    getComposition() {
        const positions = this.activityConfig.positionOrder;
        const composition = {};

        positions.forEach(pos => {
            const input = this.$(`#comp_${pos}`);
            composition[pos] = parseInt(input?.value) || uiConfig.INPUT_CONSTRAINTS.COMPOSITION_DEFAULT;
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
            toast.info('Optimizing teams... This may take a moment', uiConfig.TOAST.LONG_DURATION);

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

                // Save teams to active session
                this.saveTeams(result);

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
