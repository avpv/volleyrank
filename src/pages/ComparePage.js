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

    getNextPositionSuggestion() {
        const progress = this.comparisonService.getAllProgress();
        const positions = this.activityConfig.positions;

        // Find next incomplete position
        for (const [key, name] of Object.entries(positions)) {
            if (key === this.selectedPosition) continue;

            const players = this.playerService.getByPosition(key);
            if (players.length >= 2) {
                const prog = progress[key];
                if (prog.percentage < 100) {
                    return `Try comparing <strong>${name}</strong> players next!`;
                }
            }
        }

        return 'All positions are complete!';
    }

    render() {
        return this.renderPageWithSidebar(`
            <div class="page-header">
                <h2>Compare Players</h2>
                <p class="page-subtitle">Build accurate player ratings through head-to-head comparisons</p>
            </div>

            ${this.renderOverallProgress()}
            ${this.renderPositionSelector()}
            ${this.renderComparisonArea()}
        `);
    }

    renderOverallProgress() {
        const progress = this.comparisonService.getAllProgress();
        const positions = this.activityConfig.positions;

        // Calculate overall statistics
        let totalCompleted = 0;
        let totalComparisons = 0;
        let completedPositions = 0;
        let availablePositions = 0;

        Object.keys(positions).forEach(key => {
            const players = this.playerService.getByPosition(key);
            if (players.length >= 2) {
                availablePositions++;
                const prog = progress[key];
                totalCompleted += prog.completed;
                totalComparisons += prog.total;
                if (prog.percentage === 100) {
                    completedPositions++;
                }
            }
        });

        const overallPercentage = totalComparisons > 0
            ? Math.round((totalCompleted / totalComparisons) * 100)
            : 0;

        const isFullyComplete = availablePositions > 0 && completedPositions === availablePositions;

        // Don't show if no positions are available
        if (availablePositions === 0) {
            return '';
        }

        return `
            <div class="overall-progress ${isFullyComplete ? 'overall-progress--complete' : ''}" role="status" aria-live="polite">
                <div class="overall-progress__content">
                    <div class="overall-progress__header">
                        <div class="overall-progress__title">
                            ${isFullyComplete ? `
                                <span class="overall-progress__icon">🎉</span>
                                <h3>All Comparisons Complete!</h3>
                            ` : `
                                <span class="overall-progress__icon">📊</span>
                                <h3>Overall Progress</h3>
                            `}
                        </div>
                        <div class="overall-progress__stats">
                            <div class="overall-stat">
                                <span class="overall-stat__value">${completedPositions}/${availablePositions}</span>
                                <span class="overall-stat__label">positions complete</span>
                            </div>
                            <div class="overall-stat">
                                <span class="overall-stat__value">${totalCompleted}/${totalComparisons}</span>
                                <span class="overall-stat__label">total comparisons</span>
                            </div>
                        </div>
                    </div>

                    ${!isFullyComplete ? `
                        <div class="overall-progress__bar">
                            <div class="overall-progress__fill"
                                 style="width: ${overallPercentage}%"
                                 role="progressbar"
                                 aria-valuenow="${overallPercentage}"
                                 aria-valuemin="0"
                                 aria-valuemax="100"></div>
                        </div>
                        <p class="overall-progress__message">
                            ${overallPercentage === 0
                                ? 'Select a position below to start comparing players'
                                : overallPercentage < 50
                                    ? 'Great start! Keep going to improve team balance accuracy'
                                    : overallPercentage < 100
                                        ? 'You\'re more than halfway there! Almost done'
                                        : 'Amazing work! All comparisons completed'}
                        </p>
                    ` : `
                        <div class="overall-progress__celebration">
                            <p class="overall-progress__message">
                                Excellent work! All player comparisons are complete. Your team balance algorithm now has maximum accuracy.
                            </p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderPositionSelector() {
        const positions = this.activityConfig.positions;
        const progress = this.comparisonService.getAllProgress();

        return `
            <div class="position-selector" role="region" aria-label="Position selection">
                <div class="position-selector__header">
                    <h3>Select Position to Compare</h3>
                    <p class="position-selector__description">
                        Choose a position to begin head-to-head player comparisons. Use keyboard shortcuts: <kbd>A</kbd> (left), <kbd>D</kbd> (right), <kbd>W</kbd> (draw)
                    </p>
                </div>

                <div class="position-grid" role="radiogroup" aria-label="Available positions">
                    ${Object.entries(positions).map(([key, name]) => {
                        const prog = progress[key];
                        const players = this.playerService.getByPosition(key);
                        const isSelected = this.selectedPosition === key;
                        const isDisabled = players.length < 2;
                        const isComplete = prog.percentage === 100;
                        const hasProgress = prog.completed > 0;

                        // Determine card state
                        let cardState = 'disabled';
                        let statusText = 'Not enough players';
                        let statusIcon = '⚠️';

                        if (!isDisabled) {
                            if (isComplete) {
                                cardState = 'complete';
                                statusText = 'Complete';
                                statusIcon = '✓';
                            } else if (hasProgress) {
                                cardState = 'in-progress';
                                statusText = 'In progress';
                                statusIcon = '▶';
                            } else {
                                cardState = 'ready';
                                statusText = 'Ready to start';
                                statusIcon = '→';
                            }
                        }

                        return `
                            <button
                                type="button"
                                class="position-card position-card--${cardState} ${isSelected ? 'position-card--selected' : ''}"
                                data-position="${key}"
                                role="radio"
                                aria-checked="${isSelected}"
                                aria-label="${name} - ${statusText}, ${players.length} players, ${Math.round(prog.percentage)}% complete"
                                ${isDisabled ? 'disabled aria-disabled="true"' : ''}
                                tabindex="${isSelected ? '0' : '-1'}">

                                <div class="position-card__header">
                                    <div class="position-card__title">
                                        <span class="position-card__name">${name}</span>
                                        <span class="position-card__key">${key}</span>
                                    </div>
                                    ${isSelected ? '<div class="position-card__selected-indicator" aria-hidden="true">●</div>' : ''}
                                </div>

                                <div class="position-card__stats">
                                    <div class="position-stat">
                                        <span class="position-stat__icon" aria-hidden="true">👥</span>
                                        <span class="position-stat__value">${players.length}</span>
                                        <span class="position-stat__label">player${players.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    ${!isDisabled ? `
                                        <div class="position-stat">
                                            <span class="position-stat__icon" aria-hidden="true">📊</span>
                                            <span class="position-stat__value">${prog.completed}/${prog.total}</span>
                                            <span class="position-stat__label">comparisons</span>
                                        </div>
                                    ` : ''}
                                </div>

                                ${!isDisabled ? `
                                    <div class="position-card__progress">
                                        <div class="position-progress-bar">
                                            <div class="position-progress-fill position-progress-fill--${cardState}"
                                                 style="width: ${prog.percentage}%"
                                                 role="progressbar"
                                                 aria-valuenow="${Math.round(prog.percentage)}"
                                                 aria-valuemin="0"
                                                 aria-valuemax="100"></div>
                                        </div>
                                        <span class="position-card__percentage">${Math.round(prog.percentage)}%</span>
                                    </div>
                                ` : ''}

                                <div class="position-card__status position-card__status--${cardState}">
                                    <span class="position-status__icon" aria-hidden="true">${statusIcon}</span>
                                    <span class="position-status__text">${statusText}</span>
                                    ${isDisabled ? `<span class="position-status__hint">Need ${2 - players.length} more</span>` : ''}
                                </div>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }


    renderComparisonArea() {
        if (!this.selectedPosition) {
            const icon = getIcon('target', { size: 48, color: 'var(--color-text-secondary)' });
            return this.renderEmpty(
                'Choose a position from the cards above to begin head-to-head player comparisons. The more comparisons you complete, the more accurate your team balance will be.',
                icon,
                'Ready to Compare Players'
            );
        }

        const status = this.comparisonService.checkStatus(this.selectedPosition);
        const posName = this.activityConfig.positions[this.selectedPosition];
        const progress = this.comparisonService.getProgress(this.selectedPosition);
        const isComplete = progress.percentage === 100;

        if (!status.canCompare) {
            const icon = isComplete
                ? getIcon('check-circle', { size: 48, color: 'var(--color-success)' })
                : getIcon('info', { size: 48, color: 'var(--color-text-secondary)' });

            return `
                <div class="comparison-area ${isComplete ? 'comparison-area--complete' : ''}">
                    ${isComplete ? `
                        <div class="comparison-complete">
                            <div class="comparison-complete__icon">${icon}</div>
                            <h3 class="comparison-complete__title">Position Complete!</h3>
                            <p class="comparison-complete__message">
                                All ${posName} comparisons are finished (${progress.completed}/${progress.total}).
                                ${this.getNextPositionSuggestion()}
                            </p>
                        </div>
                    ` : this.renderEmpty(status.reason, icon)}
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

        const currentProgress = this.comparisonService.getProgress(this.selectedPosition);
        const progressPercent = Math.round(currentProgress.percentage);

        return `
            <div class="comparison-area comparison-area--active" role="region" aria-label="Player comparison">
                <div class="comparison-header">
                    <div class="comparison-info">
                        <p class="comparison-question">Who is better at <strong>${posName}</strong>?</p>
                        <div class="comparison-progress-indicator">
                            <div class="progress-mini">
                                <div class="progress-mini__fill" style="width: ${progressPercent}%"></div>
                            </div>
                            <span class="comparison-progress-text">${currentProgress.completed}/${currentProgress.total} comparisons · ${progressPercent}% complete</span>
                        </div>
                    </div>
                </div>

                <div class="comparison-cards d-grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-center" role="group" aria-label="Choose the better player">
                    <button
                        class="player-card clickable cursor-pointer"
                        id="leftPlayerCard"
                        data-winner-id="${player1.id}"
                        data-loser-id="${player2.id}"
                        aria-label="Select ${this.escape(player1.name)} as better player (keyboard: A)"
                        role="button">
                        <div class="keyboard-hint" aria-hidden="true">A</div>
                        <div class="player-avatar blue d-flex items-center justify-center mb-3">
                            ${player1.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="player-name text-center font-semibold mb-2">${this.escape(player1.name)}</div>
                        <div class="player-position text-center text-sm text-secondary mb-2">${posName}</div>
                        <div class="player-rating text-center font-medium mb-1" aria-label="Current rating">
                            ${Math.round(player1.ratings[this.selectedPosition])} <span class="text-tertiary text-xs">ELO</span>
                        </div>
                        <div class="player-comparisons text-center text-xs text-tertiary" aria-label="Number of comparisons">
                            ${player1.comparisons[this.selectedPosition]} comparison${player1.comparisons[this.selectedPosition] !== 1 ? 's' : ''}
                        </div>
                    </button>

                    <div class="vs-divider d-flex flex-column items-center gap-4 my-4 md:my-0" aria-hidden="true">
                        <div class="vs-text font-bold text-2xl md:text-3xl">VS</div>
                        <button
                            class="draw-button"
                            id="drawButton"
                            data-player1-id="${player1.id}"
                            data-player2-id="${player2.id}"
                            aria-label="Mark as equal skill level (keyboard: W)"
                            title="Both players have equal skill">
                            <span class="keyboard-hint-button" aria-hidden="true">W</span>
                            Equal Skill
                        </button>
                    </div>

                    <button
                        class="player-card clickable cursor-pointer"
                        id="rightPlayerCard"
                        data-winner-id="${player2.id}"
                        data-loser-id="${player1.id}"
                        aria-label="Select ${this.escape(player2.name)} as better player (keyboard: D)"
                        role="button">
                        <div class="keyboard-hint" aria-hidden="true">D</div>
                        <div class="player-avatar purple d-flex items-center justify-center mb-3">
                            ${player2.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="player-name text-center font-semibold mb-2">${this.escape(player2.name)}</div>
                        <div class="player-position text-center text-sm text-secondary mb-2">${posName}</div>
                        <div class="player-rating text-center font-medium mb-1" aria-label="Current rating">
                            ${Math.round(player2.ratings[this.selectedPosition])} <span class="text-tertiary text-xs">ELO</span>
                        </div>
                        <div class="player-comparisons text-center text-xs text-tertiary" aria-label="Number of comparisons">
                            ${player2.comparisons[this.selectedPosition]} comparison${player2.comparisons[this.selectedPosition] !== 1 ? 's' : ''}
                        </div>
                    </button>
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

        // Position cards
        const positionCards = this.$$('.position-card');
        if (positionCards && positionCards.length > 0) {
            positionCards.forEach(card => {
                card.addEventListener('click', (e) => {
                    const positionKey = card.getAttribute('data-position');
                    if (!positionKey || card.disabled) return;

                    this.selectedPosition = positionKey;
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

                // Keyboard navigation for position cards
                card.addEventListener('keydown', (e) => {
                    const allCards = Array.from(this.$$('.position-card:not([disabled])'));
                    const currentIndex = allCards.indexOf(card);

                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % allCards.length;
                        allCards[nextIndex].focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prevIndex = (currentIndex - 1 + allCards.length) % allCards.length;
                        allCards[prevIndex].focus();
                    } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        card.click();
                    }
                });
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
