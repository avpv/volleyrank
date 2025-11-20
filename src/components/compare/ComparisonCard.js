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

        return `
            <button
                class="player-card clickable"
                id="${side}PlayerCard"
                data-winner-id="${player.id}"
                data-loser-id="${opponentId}"
                aria-label="Select ${this.escape(player.name)} as better player (keyboard: ${keyboardHint})"
                role="button">
                <div class="keyboard-hint" aria-hidden="true">${keyboardHint}</div>
                <div class="player-header">
                    <h4 class="player-name">${this.escape(player.name)}</h4>
                </div>
                <div class="player-positions">
                    <div class="position-badge">
                        <div class="badge-position">${positionName}</div>
                        <div class="badge-stats">
                            <span class="badge-rating">${Math.round(player.ratings[positionKey])} ELO</span>
                            <span class="badge-comparisons">${player.comparisons[positionKey]} comp.</span>
                        </div>
                    </div>
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
