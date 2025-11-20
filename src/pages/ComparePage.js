/**
 * ComparePage - Player comparison page
 */
import BasePage from './BasePage.js';
import toast from '../components/base/Toast.js';
import Modal from '../components/base/Modal.js';
import Sidebar from '../components/Sidebar.js';
import uiConfig from '../config/ui.js';

// Components
import PositionSelector from '../components/compare/PositionSelector.js';
import ComparisonArea from '../components/compare/ComparisonArea.js';

const { ELEMENT_IDS, KEYBOARD_KEYS, MESSAGES, TOAST } = uiConfig;

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

        this.positionSelector = null;
        this.comparisonArea = null;
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
        this.mountComponents();
        this.attachEventListeners();
    }

    onUpdate() {
        // Re-mount sidebar if container was re-rendered
        this.mountSidebar();
        this.mountComponents();
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

        this.destroyComponents();
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
        const activityConfig = activityKey ? this.props.activityConfig : null;

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

    mountComponents() {
        this.destroyComponents();

        // 1. Position Selector
        const positionSelectorContainer = this.$('.position-selector-container');
        if (positionSelectorContainer && this.activityConfig) {
            const progress = this.comparisonService.getAllProgress();
            this.positionSelector = new PositionSelector(positionSelectorContainer, {
                positions: this.activityConfig.positions,
                progress,
                selectedPosition: this.selectedPosition,
                playerService: this.playerService,
                onSelect: (key) => this.handlePositionSelect(key),
                onReset: (key) => this.handlePositionReset(key),
                onResetAll: () => this.showResetAllModal()
            });
            this.positionSelector.mount();
            this.addComponent(this.positionSelector);
        }

        // 2. Comparison Area
        const comparisonAreaContainer = this.$('.comparison-area-container');
        if (comparisonAreaContainer && this.selectedPosition) {
            const status = this.comparisonService.checkStatus(this.selectedPosition);
            const progress = this.comparisonService.getProgress(this.selectedPosition);
            const positionName = this.activityConfig.positions[this.selectedPosition];
            const suggestion = this.getNextPositionSuggestion();

            this.comparisonArea = new ComparisonArea(comparisonAreaContainer, {
                selectedPosition: this.selectedPosition,
                positionName,
                status,
                progress,
                currentPair: this.currentPair,
                nextPair: status.nextPair,
                suggestion,
                onComparison: (winnerId, loserId) => this.handleComparison(winnerId, loserId),
                onDraw: (p1, p2) => this.handleDraw(p1, p2),
                onSuggestionClick: (key) => this.handlePositionSelect(key)
            });
            this.comparisonArea.mount();
            this.addComponent(this.comparisonArea);
        }
    }

    destroyComponents() {
        if (this.positionSelector) {
            this.positionSelector.destroy();
            this.positionSelector = null;
        }
        if (this.comparisonArea) {
            this.comparisonArea.destroy();
            this.comparisonArea = null;
        }
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
                    return {
                        html: `Try comparing <strong class="position-suggestion" data-position="${key}">${name}</strong> players next!`,
                        positionKey: key
                    };
                }
            }
        }

        return { html: 'All positions are complete!', positionKey: null };
    }

    render() {
        return this.renderPageWithSidebar(`
            <div class="page-header">
                <h2>Compare Players</h2>
                <p class="page-subtitle">Build accurate player ratings through head-to-head comparisons</p>
            </div>

            <div class="position-selector-container"></div>
            <div class="comparison-area-container"></div>
        `);
    }

    attachEventListeners() {
        // Remove old keyboard event listener before adding a new one
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

            if ([KEYBOARD_KEYS.A, KEYBOARD_KEYS.D, KEYBOARD_KEYS.W].includes(key)) {
                e.preventDefault();

                // Delegate to ComparisonArea component
                if (this.comparisonArea) {
                    this.comparisonArea.triggerAnimation(key);

                    // Logic is still handled here via component callbacks, 
                    // but we need to trigger the actual action if the component doesn't handle it internally via key press
                    // Actually, the component just animates. We need to trigger the action.

                    // Wait for animation to start
                    setTimeout(() => {
                        if (key === KEYBOARD_KEYS.A) {
                            const leftCard = this.comparisonArea.leftCard;
                            if (leftCard) {
                                this.handleComparison(leftCard.player.id, leftCard.opponentId);
                            }
                        } else if (key === KEYBOARD_KEYS.D) {
                            const rightCard = this.comparisonArea.rightCard;
                            if (rightCard) {
                                this.handleComparison(rightCard.player.id, rightCard.opponentId);
                            }
                        } else if (key === KEYBOARD_KEYS.W) {
                            if (this.currentPair) {
                                this.handleDraw(this.currentPair[0].id, this.currentPair[1].id);
                            }
                        }
                    }, 50);
                }
            }
        };

        // Add keyboard event listener
        document.addEventListener('keydown', this.handleKeyboard);
    }

    handlePositionSelect(positionKey) {
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
    }

    handlePositionReset(positionKey) {
        const positionName = this.activityConfig.positions[positionKey];
        const confirmed = confirm(`Are you sure you want to reset all comparisons for ${positionName}? This cannot be undone.`);

        if (confirmed) {
            this.comparisonService.resetPosition(positionKey);
            toast.success(`${positionName} comparisons have been reset`);

            // If this was the selected position, clear it
            if (this.selectedPosition === positionKey) {
                this.selectedPosition = '';
                this.currentPair = null;
            }

            this.update();
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
            toast.success(MESSAGES.SUCCESS.WIN_WIN, TOAST.QUICK_DURATION);
        } catch (error) {
            toast.error(error.message);
        }
    }

    showResetAllModal() {
        const progress = this.comparisonService.getAllProgress();
        const totalComparisons = Object.values(progress).reduce((sum, p) => sum + p.completed, 0);

        if (totalComparisons === 0) {
            toast.info(MESSAGES.INFO.NO_COMPARISONS);
            return;
        }

        const modal = new Modal({
            title: 'Reset All Comparisons',
            content: this.renderResetAllContent(),
            showCancel: true,
            showConfirm: true,
            confirmText: 'Reset All',
            cancelText: 'Cancel',
            onConfirm: () => {
                const selected = this.getSelectedModalPositions('resetAllPositions');
                if (selected.length === 0) {
                    toast.error('Please select at least one position');
                    return false;
                }
                try {
                    this.comparisonService.resetAll(selected);
                    const posNames = selected.map(p => this.activityConfig.positions[p]).join(', ');
                    toast.success(`Reset comparisons for ${posNames}`);

                    // Clear selected position and current pair if it was reset
                    if (selected.includes(this.selectedPosition)) {
                        this.selectedPosition = '';
                        this.currentPair = null;
                    }

                    this.update();
                    return true;
                } catch (error) {
                    toast.error(error.message);
                    return false;
                }
            }
        });

        this.addComponent(modal);
        modal.mount();
        modal.open();
    }

    renderResetAllContent() {
        const progress = this.comparisonService.getAllProgress();

        return `
            <div class="modal-content-inner">
                <div class="form-group">
                    <label>Select positions to reset comparisons:</label>
                    <div class="positions-grid">
                        ${Object.entries(this.activityConfig.positions)
                .filter(([pos]) => progress[pos].completed > 0)
                .map(([pos, name]) => {
                    const prog = progress[pos];
                    return `
                                    <label class="position-checkbox">
                                        <input
                                            type="checkbox"
                                            name="resetAllPositions"
                                            value="${pos}"
                                            class="position-input"
                                            checked
                                        >
                                        <span class="position-label">${name} (${prog.completed}/${prog.total} comparisons)</span>
                                    </label>
                                `;
                }).join('')}
                    </div>
                    <div class="warning-box warning-box-danger">
                        <div class="warning-title">Warning</div>
                        <div class="warning-text">
                            This will reset all comparison history for selected positions. Player ratings will be recalculated to 1500. This action cannot be undone!
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSelectedModalPositions(inputName) {
        const checkboxes = document.querySelectorAll(`input[name="${inputName}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    handleResetAll() {
        // This method is kept for backward compatibility but now just calls showResetAllModal
        this.showResetAllModal();
    }
}

export default ComparePage;
