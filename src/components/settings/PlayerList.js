import BaseComponent from '../BaseComponent.js';
import PlayerCard from './PlayerCard.js';
import { getIcon } from '../base/Icons.js';

class PlayerList extends BaseComponent {
    constructor(container, props = {}) {
        super(container);
        this.players = props.players || [];
        this.positionOrder = props.positionOrder || [];
        this.positionNames = props.positionNames || {};
        this.onPlayerAction = props.onPlayerAction;

        this.playerCards = [];
    }

    render() {
        if (this.players.length === 0) {
            const emptyIcon = getIcon('users-x', { size: 64, color: 'var(--color-text-secondary)' });
            return `
                <div class="empty-state animate-fade-in">
                    <div class="empty-state__icon">${emptyIcon}</div>
                    <h3 class="empty-state__title">No Players Yet</h3>
                    <p class="empty-state__message">Add your first player using the form above to get started.</p>
                </div>
            `;
        }

        return `
            <div class="players-section">
                <h3 class="text-xl font-semibold mb-4">Current Players (${this.players.length})</h3>
                <div class="players-grid d-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" id="playersGrid">
                    <!-- Player cards will be mounted here -->
                </div>
            </div>
        `;
    }

    onMount() {
        if (this.players.length === 0) return;

        const grid = this.container.querySelector('#playersGrid');
        if (!grid) return;

        // Sort players
        const sorted = [...this.players].sort((a, b) => {
            const aPos = a.positions[0];
            const bPos = b.positions[0];
            const diff = this.positionOrder.indexOf(aPos) - this.positionOrder.indexOf(bPos);
            return diff !== 0 ? diff : a.name.localeCompare(b.name);
        });

        // Create and mount player cards
        this.playerCards = sorted.map(player => {
            const cardContainer = document.createElement('div');
            grid.appendChild(cardContainer);

            const card = new PlayerCard(cardContainer, {
                player,
                positionNames: this.positionNames,
                onAction: this.onPlayerAction
            });

            card.mount();
            return card;
        });
    }

    onDestroy() {
        this.playerCards.forEach(card => card.destroy());
        this.playerCards = [];
    }
}

export default PlayerList;
