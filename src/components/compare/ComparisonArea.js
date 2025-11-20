import BaseComponent from '../BaseComponent.js';
import ComparisonCard from './ComparisonCard.js';
import { getIcon } from '../base/Icons.js';
import uiConfig from '../../config/ui.js';

const { ICON_SIZES, COLORS, MESSAGES, ANIMATION } = uiConfig;

class ComparisonArea extends BaseComponent {
    constructor(container, props = {}) {
        super(container);
        this.selectedPosition = props.selectedPosition;
        this.positionName = props.positionName;
        this.status = props.status;
        this.progress = props.progress;
        this.currentPair = props.currentPair;
        this.nextPair = props.nextPair;
        this.onComparison = props.onComparison; // Callback for win
        this.onDraw = props.onDraw; // Callback for draw
        this.onSuggestionClick = props.onSuggestionClick; // Callback for suggestion click

        this.leftCard = null;
        this.rightCard = null;
    }

    render() {
        if (!this.selectedPosition) {
            return '';
        }

        const { status, positionName, progress, currentPair, nextPair } = this;
        const isComplete = progress.percentage === 100;

        if (!status.canCompare) {
            const icon = isComplete
                ? getIcon('check-circle', { size: ICON_SIZES.HUGE, color: COLORS.SUCCESS })
                : getIcon('info', { size: ICON_SIZES.HUGE, color: COLORS.TEXT_SECONDARY });

            return `
                <div class="comparison-area ${isComplete ? 'comparison-area--complete' : ''}">
                    ${isComplete ? `
                        <div class="comparison-complete">
                            <div class="comparison-complete__icon">${icon}</div>
                            <h3 class="comparison-complete__title">Position Complete!</h3>
                            <p class="comparison-complete__message">
                                All ${positionName} comparisons are finished (${progress.completed}/${progress.total}).
                                <span id="suggestionContainer"></span>
                            </p>
                        </div>
                    ` : this.renderEmpty(status.reason, icon)}
                </div>
            `;
        }

        const pair = currentPair || nextPair;

        // Validate pair exists and has both players
        if (!pair || !pair[0] || !pair[1]) {
            const icon = getIcon('alert-triangle', { size: ICON_SIZES.HUGE, color: COLORS.WARNING });
            return `
                <div class="comparison-area">
                    ${this.renderEmpty(MESSAGES.ERRORS.LOAD_FAILED, icon, MESSAGES.TITLES.STATUS)}
                </div>
            `;
        }

        const [player1, player2] = pair;

        // Validate player IDs exist
        if (player1.id === undefined || player2.id === undefined) {
            const icon = getIcon('alert-triangle', { size: ICON_SIZES.HUGE, color: COLORS.WARNING });
            return `
                <div class="comparison-area">
                    ${this.renderEmpty(MESSAGES.ERRORS.DATA_INCOMPLETE, icon, MESSAGES.TITLES.DATA_ERROR)}
                </div>
            `;
        }

        const progressPercent = Math.round(progress.percentage);

        return `
            <div class="comparison-area comparison-area--active" role="region" aria-label="Player comparison">
                <div class="comparison-header">
                    <div class="comparison-info">
                        <p class="comparison-question">Who is better at <strong>${positionName}</strong>?</p>
                        <div class="comparison-progress-indicator">
                            <div class="progress-mini">
                                <div class="progress-mini__fill" style="width: ${progressPercent}%"></div>
                            </div>
                            <span class="comparison-progress-text">${progress.completed}/${progress.total} comparisons · ${progressPercent}% complete</span>
                        </div>
                    </div>
                </div>

                <div class="comparison-cards" role="group" aria-label="Choose the better player">
                    <div id="leftCardContainer"></div>

                    <div class="vs-divider" aria-hidden="true">
                        <div class="vs-text">VS</div>
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

                    <div id="rightCardContainer"></div>
                </div>
            </div>
        `;
    }

    renderEmpty(message, icon, title = MESSAGES.TITLES.STATUS) {
        return `
            <div class="empty-state">
                <div class="empty-state__icon">${icon}</div>
                <h3 class="empty-state__title">${title}</h3>
                <p class="empty-state__message">${message}</p>
            </div>
        `;
    }

    onMount() {
        const { status, currentPair, nextPair, selectedPosition, positionName } = this;

        if (!status.canCompare) {
            // Render suggestion if complete
            if (this.progress.percentage === 100) {
                const suggestionContainer = this.container.querySelector('#suggestionContainer');
                if (suggestionContainer && this.props.suggestion) {
                    suggestionContainer.innerHTML = this.props.suggestion.html;
                    const suggestionLink = suggestionContainer.querySelector('.position-suggestion');
                    if (suggestionLink) {
                        suggestionLink.addEventListener('click', () => {
                            if (this.onSuggestionClick) {
                                this.onSuggestionClick(this.props.suggestion.positionKey);
                            }
                        });
                    }
                }
            }
            return;
        }

        const pair = currentPair || nextPair;
        if (!pair || !pair[0] || !pair[1]) return;

        const [player1, player2] = pair;

        // Mount Left Card
        const leftContainer = this.container.querySelector('#leftCardContainer');
        if (leftContainer) {
            this.leftCard = new ComparisonCard(leftContainer, {
                player: player1,
                opponentId: player2.id,
                positionName: positionName,
                positionKey: selectedPosition,
                side: 'left',
                keyboardHint: 'A',
                onSelect: (winnerId, loserId) => this.handleComparison(winnerId, loserId)
            });
            this.leftCard.mount();
        }

        // Mount Right Card
        const rightContainer = this.container.querySelector('#rightCardContainer');
        if (rightContainer) {
            this.rightCard = new ComparisonCard(rightContainer, {
                player: player2,
                opponentId: player1.id,
                positionName: positionName,
                positionKey: selectedPosition,
                side: 'right',
                keyboardHint: 'D',
                onSelect: (winnerId, loserId) => this.handleComparison(winnerId, loserId)
            });
            this.rightCard.mount();
        }

        // Draw button
        const drawButton = this.container.querySelector('#drawButton');
        if (drawButton) {
            drawButton.addEventListener('click', () => {
                this.animateKeyPress(drawButton);
                this.handleDraw(player1.id, player2.id);
            });
        }
    }

    handleComparison(winnerId, loserId) {
        // Animate card
        if (this.leftCard && this.leftCard.player.id === winnerId) {
            this.leftCard.animate();
        } else if (this.rightCard && this.rightCard.player.id === winnerId) {
            this.rightCard.animate();
        }

        if (this.onComparison) {
            this.onComparison(winnerId, loserId);
        }
    }

    handleDraw(player1Id, player2Id) {
        if (this.onDraw) {
            this.onDraw(player1Id, player2Id);
        }
    }

    animateKeyPress(element) {
        element.classList.add('key-pressed');
        setTimeout(() => {
            element.classList.remove('key-pressed');
        }, ANIMATION.KEY_PRESS);
    }

    // Public method to trigger animation from parent (keyboard shortcuts)
    triggerAnimation(key) {
        if (key === 'a' && this.leftCard) {
            this.leftCard.animate();
        } else if (key === 'd' && this.rightCard) {
            this.rightCard.animate();
        } else if (key === 'w') {
            const drawButton = this.container.querySelector('#drawButton');
            if (drawButton) {
                this.animateKeyPress(drawButton);
            }
        }
    }
}

export default ComparisonArea;
