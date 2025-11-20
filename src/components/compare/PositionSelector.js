import BaseComponent from '../BaseComponent.js';
import { getIcon } from '../base/Icons.js';
import uiConfig from '../../config/ui.js';

const { ELEMENT_IDS } = uiConfig;

class PositionSelector extends BaseComponent {
    constructor(container, props = {}) {
        super(container);
        this.positions = props.positions || {};
        this.progress = props.progress || {};
        this.selectedPosition = props.selectedPosition || '';
        this.playerService = props.playerService;
        this.onSelect = props.onSelect; // Callback for position selection
        this.onReset = props.onReset; // Callback for resetting position
        this.onResetAll = props.onResetAll; // Callback for resetting all
    }

    render() {
        // Check if any position has comparisons
        const hasAnyComparisons = Object.values(this.progress).some(p => p.completed > 0);

        return `
            <div class="position-selector" role="region" aria-label="Position selection">
                <div class="position-selector__header">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                        <div style="flex: 1;">
                            <h3>Select Position to Compare</h3>
                            <p class="position-selector__description">
                                Choose a position to begin head-to-head player comparisons. Use keyboard shortcuts: <kbd>A</kbd> (left), <kbd>D</kbd> (right), <kbd>W</kbd> (draw)
                            </p>
                        </div>
                        <button
                            type="button"
                            class="btn btn-secondary"
                            id="${ELEMENT_IDS.RESET_ALL_BTN}"
                            title="${hasAnyComparisons ? 'Reset all comparisons for all positions' : 'No comparisons to reset'}"
                            aria-label="Reset all comparisons"
                            ${!hasAnyComparisons ? 'disabled' : ''}>
                            ${getIcon('refresh', { size: 16, className: 'btn-icon' })}
                            Reset All
                        </button>
                    </div>
                </div>

                <div class="position-grid" role="radiogroup" aria-label="Available positions">
                    ${Object.entries(this.positions).map(([key, name]) => this.renderPositionCard(key, name)).join('')}
                </div>
            </div>
        `;
    }

    renderPositionCard(key, name) {
        const prog = this.progress[key];
        const players = this.playerService.getByPosition(key);
        const isSelected = this.selectedPosition === key;
        const isDisabled = players.length < 2;
        const isComplete = prog.percentage === 100;
        const hasProgress = prog.completed > 0;

        // Determine card state
        let cardState = 'disabled';
        let statusText = 'Not enough players';

        if (!isDisabled) {
            if (isComplete) {
                cardState = 'complete';
                statusText = 'Complete';
            } else if (hasProgress) {
                cardState = 'in-progress';
                statusText = 'In progress';
            } else {
                cardState = 'ready';
                statusText = 'Ready to start';
            }
        }

        return `
            <div
                class="position-card position-card--${cardState} ${isSelected ? 'position-card--selected' : ''}"
                data-position="${key}"
                role="radio"
                aria-checked="${isSelected}"
                aria-label="${name} - ${statusText}, ${players.length} players, ${Math.round(prog.percentage)}% complete"
                ${isDisabled ? 'aria-disabled="true"' : ''}
                tabindex="${isSelected ? '0' : '-1'}">

                <div class="position-card__header">
                    <div class="position-card__title">
                        <span class="position-card__name">${name}</span>
                    </div>
                    ${!isDisabled ? `
                        <div class="position-card__badges">
                            <span class="status-badge status-badge--${isComplete ? 'success' : hasProgress ? 'in-progress' : 'ready'}">
                                ${isComplete ? 'Complete' : hasProgress ? 'In Progress' : 'Ready'}
                            </span>
                        </div>
                    ` : ''}
                </div>

                ${isDisabled ? `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: var(--spacing-4); text-align: center; color: var(--color-text-secondary);">
                        <div style="margin-bottom: var(--spacing-2); opacity: 0.7;">
                            ${getIcon('users-x', { size: 32 })}
                        </div>
                        <div style="font-size: var(--font-size-sm); line-height: 1.4;">
                            No players assigned to the ${name} position yet. Add players on the Settings page.
                        </div>
                    </div>
                ` : `
                    <div class="position-card__info">
                        <div class="position-card__stats">
                            <div class="position-stat">
                                <span class="position-stat__value">${players.length}</span>
                                <span class="position-stat__label">player${players.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="position-stat">
                                <span class="position-stat__value">${prog.completed}/${prog.total}</span>
                                <span class="position-stat__label">comparisons</span>
                            </div>
                        </div>

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
                    </div>

                    <div class="position-card__actions">
                        <button
                            type="button"
                            class="btn btn-sm btn-secondary position-card__reset-btn"
                            data-position-reset="${key}"
                            aria-label="Reset ${name} comparisons"
                            title="${hasProgress ? 'Reset comparisons for this position' : 'No comparisons to reset'}"
                            onclick="event.stopPropagation();"
                            ${!hasProgress ? 'disabled' : ''}>
                            ${getIcon('refresh', { size: 14, className: 'btn-icon' })}
                            Reset
                        </button>
                    </div>
                `}
            </div>
        `;
    }

    onMount() {
        // Reset All button
        const resetAllBtn = this.container.querySelector(`#${ELEMENT_IDS.RESET_ALL_BTN}`);
        if (resetAllBtn && this.onResetAll) {
            resetAllBtn.addEventListener('click', () => this.onResetAll());
        }

        // Position cards
        const positionCards = this.container.querySelectorAll('.position-card');
        positionCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const positionKey = card.getAttribute('data-position');
                if (!positionKey || card.hasAttribute('aria-disabled')) return;

                if (this.onSelect) {
                    this.onSelect(positionKey);
                }
            });

            // Keyboard navigation
            card.addEventListener('keydown', (e) => {
                const allCards = Array.from(this.container.querySelectorAll('.position-card:not([aria-disabled="true"])'));
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

        // Position card reset buttons
        const resetButtons = this.container.querySelectorAll('.position-card__reset-btn');
        resetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (btn.disabled) return;

                const positionKey = btn.getAttribute('data-position-reset');
                if (positionKey && this.onReset) {
                    this.onReset(positionKey);
                }
            });
        });
    }
}

export default PositionSelector;
