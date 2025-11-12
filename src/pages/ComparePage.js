// src/pages/ComparePage.js

/**
 * ComparePage - Player comparison page
 */
import BasePage from './BasePage.js';
import toast from '../components/base/Toast.js';
import { getIcon } from '../components/base/Icons.js';
import Sidebar from '../components/Sidebar.js';
import storage from '../core/StorageAdapter.js';
import { activities } from '../config/activities/index.js';

class ComparePage extends BasePage {
    constructor(container, props = {}) {
        super(container, props);
        this.setTitle('Compare');

        // Get services from props
        this.activityConfig = props.activityConfig;
        this.playerService = props.services?.resolve('playerService');
        this.comparisonService = props.services?.resolve('comparisonService');
        this.sessionService = props.services?.resolve('sessionService');
        this.eventBus = props.services?.resolve('eventBus');

        this.selectedPosition = '';
        this.currentPair = null;
        this.sidebar = null;
    }

    onCreate() {
        this.on('comparison:completed', () => {
            // Load next pair
            if (this.selectedPosition) {
                this.loadNextPair();
            }
            this.update();
        });

        this.on('player:added', () => this.update());
        this.on('player:removed', () => this.update());
        this.on('state:changed', () => this.update());
        this.on('session:activated', () => {
            // Reset comparison state when session changes
            this.selectedPosition = '';
            this.currentPair = null;
            this.update();
        });
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
        const sidebarContainer = document.getElementById('pageSidebar');
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

        const selectedActivity = storage.get('selectedActivity', 'volleyball');
        const activityConfig = activities[selectedActivity];

        this.sidebar = new Sidebar(sidebarContainer, {
            sessionService: this.sessionService,
            eventBus: this.eventBus,
            activityKey: selectedActivity,
            activityName: activityConfig?.name || 'Unknown'
        });

        this.sidebar.mount();
        this.addComponent(this.sidebar);
        this.setupMobileSidebarToggle();
    }

    render() {
        return this.renderPageWithSidebar(`
            <div class="page-header">
                <h2>Compare Players</h2>
            </div>

            ${this.renderPositionSelector()}
            ${this.renderProgressBars()}
            ${this.renderComparisonArea()}
            ${this.renderStats()}
        `);
    }

    renderPositionSelector() {
        const positions = this.playerService.positions;
        
        return `
            <div class="position-selector">
                <label>Select Position to Compare:</label>
                <select id="positionSelect" class="position-select">
                    <option value="">Choose a position...</option>
                    ${Object.entries(positions).map(([key, name]) => `
                        <option value="${key}" ${this.selectedPosition === key ? 'selected' : ''}>
                            ${name} (${key})
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    renderProgressBars() {
        const progress = this.comparisonService.getAllProgress();
        const positions = this.playerService.positions;

        return `
            <div class="progress-section">
                <label>Comparison Progress</label>
                <div class="progress-bars">
                    ${Object.entries(positions).map(([key, name]) => {
                        const prog = progress[key];
                        const players = this.playerService.getByPosition(key);
                        
                        if (players.length < 2) {
                            return `
                                <div class="progress-item disabled">
                                    <div class="progress-header">
                                        <span>${name} (${key})</span>
                                        <span class="progress-status">${players.length} player${players.length !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            `;
                        }
                        
                        const isComplete = prog.percentage === 100;
                        const hasComparisons = prog.completed > 0;
                        
                        return `
                            <div class="progress-item ${this.selectedPosition === key ? 'current-position' : ''}">
                                <div class="progress-header">
                                    <span>${name} (${key})</span>
                                    <div class="progress-stats">
                                        <span class="progress-count">${prog.completed}/${prog.total}</span>
                                        <span class="progress-percentage ${isComplete ? 'complete' : ''}">${Math.round(prog.percentage)}%</span>
                                    </div>
                                </div>
                                ${hasComparisons ? `
                                    <div class="progress-bar">
                                        <div class="progress-fill ${isComplete ? 'complete' : ''}" style="width: ${prog.percentage}%"></div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderComparisonArea() {
        if (!this.selectedPosition) {
            return this.renderEmpty('Select a position to start comparing players');
        }

        const status = this.comparisonService.checkStatus(this.selectedPosition);
        
        if (!status.canCompare) {
            return `
                <div class="comparison-area">
                    ${this.renderEmpty(status.reason)}
                </div>
            `;
        }

        const pair = this.currentPair || status.nextPair;
        
        // Validate pair exists and has both players
        if (!pair || !pair[0] || !pair[1]) {
            console.error('Invalid pair:', pair);
            return `
                <div class="comparison-area">
                    ${this.renderEmpty('Error loading comparison pair')}
                </div>
            `;
        }
        
        const [player1, player2] = pair;
        
        // Validate player IDs exist
        if (player1.id === undefined || player2.id === undefined) {
            console.error('Player missing ID:', { player1, player2 });
            return `
                <div class="comparison-area">
                    ${this.renderEmpty('Error: Player missing ID')}
                </div>
            `;
        }
        
        const posName = this.playerService.positions[this.selectedPosition];

        return `
            <div class="comparison-area">
                <div class="comparison-info">
                    Comparing at: <strong>${posName}</strong>
                </div>

                <div class="comparison-cards">
                    <div class="player-card clickable" data-winner-id="${player1.id}" data-loser-id="${player2.id}">
                        <div class="player-avatar blue">
                            ${player1.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="player-name">${this.escape(player1.name)}</div>
                        <div class="player-position">${posName}</div>
                        <div class="player-rating">${Math.round(player1.ratings[this.selectedPosition])} ELO</div>
                        <div class="player-comparisons">${player1.comparisons[this.selectedPosition]} comparisons</div>
                    </div>

                    <div class="vs-divider">
                        <div class="vs-text">VS</div>
                        <button class="draw-button" id="drawButton" data-player1-id="${player1.id}" data-player2-id="${player2.id}">
                            Win-Win
                        </button>
                    </div>

                    <div class="player-card clickable" data-winner-id="${player2.id}" data-loser-id="${player1.id}">
                        <div class="player-avatar purple">
                            ${player2.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="player-name">${this.escape(player2.name)}</div>
                        <div class="player-position">${posName}</div>
                        <div class="player-rating">${Math.round(player2.ratings[this.selectedPosition])} ELO</div>
                        <div class="player-comparisons">${player2.comparisons[this.selectedPosition]} comparisons</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStats() {
        if (!this.selectedPosition) {
            return '';
        }

        const progress = this.comparisonService.getProgress(this.selectedPosition);
        const posName = this.playerService.positions[this.selectedPosition];
        const isComplete = progress.percentage === 100;

        return `
            <div class="stats-section">
                <div class="stat-card">
                    <div class="stat-label">${posName} Progress</div>
                    <div class="stat-value">${progress.completed} / ${progress.total}</div>
                    <div class="stat-detail">${progress.remaining} remaining · <span class="stat-percentage ${isComplete ? 'complete' : ''}">${Math.round(progress.percentage)}%</span></div>
                    <div class="progress-bar">
                        <div class="progress-fill ${isComplete ? 'complete' : ''}" style="width: ${progress.percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Position selector
        const positionSelect = this.$('#positionSelect');
        if (positionSelect) {
            positionSelect.addEventListener('change', (e) => {
                this.selectedPosition = e.target.value;
                this.loadNextPair();
                this.update();
            });
        }

        // Comparison cards
        const cards = this.$$('.player-card.clickable');
        if (cards && cards.length > 0) {
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const winnerId = card.getAttribute('data-winner-id');
                    const loserId = card.getAttribute('data-loser-id');

                    // Validate attributes exist and are not 'undefined' string
                    if (!winnerId || winnerId === 'undefined' ||
                        !loserId || loserId === 'undefined') {
                        console.error('Invalid player IDs in card:', { winnerId, loserId });
                        toast.error('Error: Invalid player data');
                        return;
                    }

                    this.handleComparison(winnerId, loserId);
                });
            });
        }

        // Draw button
        const drawButton = this.$('#drawButton');
        if (drawButton) {
            drawButton.addEventListener('click', () => {
                const player1Id = drawButton.getAttribute('data-player1-id');
                const player2Id = drawButton.getAttribute('data-player2-id');

                // Validate attributes exist and are not 'undefined' string
                if (!player1Id || player1Id === 'undefined' ||
                    !player2Id || player2Id === 'undefined') {
                    console.error('Invalid player IDs in draw button:', { player1Id, player2Id });
                    toast.error('Error: Invalid player data');
                    return;
                }

                this.handleDraw(player1Id, player2Id);
            });
        }
    }

    loadNextPair() {
        if (!this.selectedPosition) {
            this.currentPair = null;
            return;
        }

        const status = this.comparisonService.checkStatus(this.selectedPosition);
        this.currentPair = status.canCompare ? status.nextPair : null;
    }

    handleComparison(winnerId, loserId) {
        try {
            this.comparisonService.processComparison(winnerId, loserId, this.selectedPosition);
        } catch (error) {
            toast.error(error.message);
        }
    }

    handleDraw(player1Id, player2Id) {
        try {
            this.comparisonService.processDraw(player1Id, player2Id, this.selectedPosition);
            toast.success('Win-Win recorded', 2000);
        } catch (error) {
            toast.error(error.message);
        }
    }
}

export default ComparePage;
