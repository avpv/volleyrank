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
import uiConfig from '../config/ui.js';

const { ELEMENT_IDS } = uiConfig;

class ComparePage extends BasePage {
    constructor(container, props = {}) {
        super(container, props);
        this.setTitle('Compare');

        // Get services from props
        this.activityConfig = props.activityConfig;
        this.activityKey = props.activityKey; // Key like 'volleyball', 'basketball', etc.
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
        // Remove keyboard event listener
        if (this.handleKeyboard) {
            document.removeEventListener('keydown', this.handleKeyboard);
        }

        if (this.sidebar) {
            this.sidebar.destroy();
            this.sidebar = null;
        }
    }

    animateKeyPress(element) {
        // Add animation class
        element.classList.add('key-pressed');

        // Remove animation class after animation completes
        setTimeout(() => {
            element.classList.remove('key-pressed');
        }, 400);
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
        const positions = this.activityConfig.positions;
        
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
        const positions = this.activityConfig.positions;

        return `
            <div class="progress-section">
                <label class="mb-3">Comparison Progress</label>
                <div class="progress-bars space-y-3 divide-y divide-subtle">
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
                            <div class="progress-item ${this.selectedPosition === key ? 'current-position' : ''} transition-colors">
                                <div class="progress-header d-flex justify-between items-center mb-2">
                                    <span class="font-medium">${name} (${key})</span>
                                    <div class="progress-stats d-flex gap-3">
                                        <span class="progress-count text-sm">${prog.completed}/${prog.total}</span>
                                        <span class="progress-percentage ${isComplete ? 'complete' : ''} text-sm font-semibold">${Math.round(prog.percentage)}%</span>
                                    </div>
                                </div>
                                ${hasComparisons ? `
                                    <div class="progress-bar">
                                        <div class="progress-fill ${isComplete ? 'complete' : ''} transition-all duration-300" style="width: ${prog.percentage}%"></div>
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
            const icon = getIcon('target', { size: 48, color: 'var(--color-text-secondary)' });
            return this.renderEmpty('Choose a position from the dropdown above to begin rating players.', icon, 'Ready to Compare');
        }

        const status = this.comparisonService.checkStatus(this.selectedPosition);

        if (!status.canCompare) {
            const icon = getIcon('info', { size: 48, color: 'var(--color-text-secondary)' });
            return `
                <div class="comparison-area">
                    ${this.renderEmpty(status.reason, icon)}
                </div>
            `;
        }

        const pair = this.currentPair || status.nextPair;

        // Validate pair exists and has both players
        if (!pair || !pair[0] || !pair[1]) {
            console.error('Invalid pair:', pair);
            const icon = getIcon('alert-triangle', { size: 48, color: 'var(--color-warning)' });
            return `
                <div class="comparison-area">
                    ${this.renderEmpty('Unable to load the next comparison. Please try again.', icon, 'Loading Error')}
                </div>
            `;
        }

        const [player1, player2] = pair;

        // Validate player IDs exist
        if (player1.id === undefined || player2.id === undefined) {
            console.error('Player missing ID:', { player1, player2 });
            const icon = getIcon('alert-triangle', { size: 48, color: 'var(--color-warning)' });
            return `
                <div class="comparison-area">
                    ${this.renderEmpty('Player data is incomplete. Please check your player list.', icon, 'Data Error')}
                </div>
            `;
        }

        const posName = this.activityConfig.positions[this.selectedPosition];

        return `
            <div class="comparison-area">
                <div class="comparison-info text-center mb-6">
                    Comparing at: <strong class="text-brand">${posName}</strong>
                </div>

                <div class="comparison-cards d-grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-center">
                    <div class="player-card clickable cursor-pointer" id="leftPlayerCard" data-winner-id="${player1.id}" data-loser-id="${player2.id}">
                        <div class="keyboard-hint">A</div>
                        <div class="player-avatar blue d-flex items-center justify-center mb-3">
                            ${player1.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="player-name text-center font-semibold mb-2">${this.escape(player1.name)}</div>
                        <div class="player-position text-center text-sm text-secondary mb-2">${posName}</div>
                        <div class="player-rating text-center font-medium mb-1">${Math.round(player1.ratings[this.selectedPosition])} ELO</div>
                        <div class="player-comparisons text-center text-xs text-tertiary">${player1.comparisons[this.selectedPosition]} comparisons</div>
                    </div>

                    <div class="vs-divider d-flex flex-column items-center gap-4 my-4 md:my-0">
                        <div class="vs-text font-bold text-2xl md:text-3xl">VS</div>
                        <button class="draw-button" id="drawButton" data-player1-id="${player1.id}" data-player2-id="${player2.id}">
                            <span class="keyboard-hint-button">W</span>
                            Win-Win
                        </button>
                    </div>

                    <div class="player-card clickable cursor-pointer" id="rightPlayerCard" data-winner-id="${player2.id}" data-loser-id="${player1.id}">
                        <div class="keyboard-hint">D</div>
                        <div class="player-avatar purple d-flex items-center justify-center mb-3">
                            ${player2.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="player-name text-center font-semibold mb-2">${this.escape(player2.name)}</div>
                        <div class="player-position text-center text-sm text-secondary mb-2">${posName}</div>
                        <div class="player-rating text-center font-medium mb-1">${Math.round(player2.ratings[this.selectedPosition])} ELO</div>
                        <div class="player-comparisons text-center text-xs text-tertiary">${player2.comparisons[this.selectedPosition]} comparisons</div>
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
        const posName = this.activityConfig.positions[this.selectedPosition];
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
        // Remove old keyboard event listener before adding a new one
        // This prevents multiple listeners from being registered on page updates
        if (this.handleKeyboard) {
            document.removeEventListener('keydown', this.handleKeyboard);
        }

        // Keyboard shortcuts for comparison
        this.handleKeyboard = (e) => {
            // Only handle keyboard shortcuts if we have an active comparison
            if (!this.currentPair) return;

            // Don't handle shortcuts if user is typing in an input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            const key = e.key.toLowerCase();

            if (key === 'a') {
                e.preventDefault();
                const leftCard = this.$('#leftPlayerCard');
                if (leftCard) {
                    this.animateKeyPress(leftCard);
                    const winnerId = leftCard.getAttribute('data-winner-id');
                    const loserId = leftCard.getAttribute('data-loser-id');
                    if (winnerId && loserId) {
                        this.handleComparison(winnerId, loserId);
                    }
                }
            } else if (key === 'd') {
                e.preventDefault();
                const rightCard = this.$('#rightPlayerCard');
                if (rightCard) {
                    this.animateKeyPress(rightCard);
                    const winnerId = rightCard.getAttribute('data-winner-id');
                    const loserId = rightCard.getAttribute('data-loser-id');
                    if (winnerId && loserId) {
                        this.handleComparison(winnerId, loserId);
                    }
                }
            } else if (key === 'w') {
                e.preventDefault();
                const drawButton = this.$('#drawButton');
                if (drawButton) {
                    this.animateKeyPress(drawButton);
                    const player1Id = drawButton.getAttribute('data-player1-id');
                    const player2Id = drawButton.getAttribute('data-player2-id');
                    if (player1Id && player2Id) {
                        this.handleDraw(player1Id, player2Id);
                    }
                }
            }
        };

        // Add keyboard event listener
        document.addEventListener('keydown', this.handleKeyboard);

        // Position selector
        const positionSelect = this.$('#positionSelect');
        if (positionSelect) {
            positionSelect.addEventListener('change', (e) => {
                this.selectedPosition = e.target.value;
                this.loadNextPair();
                this.update();

                // Show notifications for position selection
                if (this.selectedPosition) {
                    const status = this.comparisonService.checkStatus(this.selectedPosition);
                    const positionName = this.activityConfig.positions[this.selectedPosition];

                    if (!status.canCompare) {
                        if (status.insufficientPlayers) {
                            toast.info(`${positionName}: Need at least 2 players for comparison. Currently ${status.playerCount} player${status.playerCount === 1 ? '' : 's'} at this position.`);
                        } else if (status.allPairsCompared) {
                            toast.success(`${positionName}: All comparisons have been completed for this position.`);
                        }
                    }
                }

                // Scroll to comparison area if there are pairs to compare
                if (this.currentPair) {
                    this.scrollToComparisonArea();
                }
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

                    // Animate the card on click
                    this.animateKeyPress(card);
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

                // Animate the button on click
                this.animateKeyPress(drawButton);
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

    scrollToComparisonArea() {
        // Wait for DOM to update after this.update()
        setTimeout(() => {
            const comparisonArea = this.$('.comparison-area');
            if (comparisonArea) {
                comparisonArea.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 0);
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
            toast.success('Win-Win recorded', uiConfig.TOAST.QUICK_DURATION);
        } catch (error) {
            toast.error(error.message);
        }
    }
}

export default ComparePage;
