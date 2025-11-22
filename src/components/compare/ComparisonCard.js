import BaseComponent from '../BaseComponent.js';
import { getIcon } from '../base/Icons.js';

class ComparisonCard extends BaseComponent {
    constructor(container, props = {}) {
        super(container);
        this.player = props.player;
        this.opponentId = props.opponentId;
        this.positionName = props.positionName;
        this.positionKey = props.positionKey;
        this.side = props.side; // 'left' or 'right'
        this.keyboardHint = props.keyboardHint;
        this.onSelect = props.onSelect; // Callback for selection
    }

    render() {
        const { player, opponentId, positionName, positionKey, side, keyboardHint } = this;

        if (!player) return '';

        // Get player initials for avatar
        const initials = player.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

        const rating = Math.round(player.ratings[positionKey]);
        const comparisons = player.comparisons[positionKey];

        return `
            <button
                class="player-card clickable comparison-player-card"
                id="${side}PlayerCard"
                data-winner-id="${player.id}"
                data-loser-id="${opponentId}"
                aria-label="Select ${this.escape(player.name)} as better player (keyboard: ${keyboardHint})"
                role="button">
                <div class="keyboard-hint" aria-hidden="true">${keyboardHint}</div>

                <div class="player-avatar comparison-avatar">${initials}</div>

                <div class="player-info-section">
                    <h4 class="player-name">${this.escape(player.name)}</h4>
                    <p class="player-position">${positionName}</p>
                </div>

                <div class="player-stats-section">
                    <div class="player-rating">
                        <span class="rating-value">${rating}</span>
                        <span class="rating-label">ELO</span>
                    </div>
                    <p class="player-comparisons">${comparisons} comparison${comparisons !== 1 ? 's' : ''}</p>
                </div>
            </button>
        `;
    }

    onMount() {
        const card = this.container.querySelector('.player-card');
        if (card) {
            card.addEventListener('click', () => {
                if (this.onSelect) {
                    this.onSelect(this.player.id, this.opponentId);
                }
            });
        }
    }

    animate() {
        const card = this.container.querySelector('.player-card');
        if (card) {
            card.classList.add('key-pressed');
            setTimeout(() => {
                card.classList.remove('key-pressed');
            }, 400);
        }
    }
}

export default ComparisonCard;
