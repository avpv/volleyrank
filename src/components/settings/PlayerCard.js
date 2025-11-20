import BaseComponent from '../BaseComponent.js';
import { getIcon } from '../base/Icons.js';
import uiConfig from '../../config/ui.js';

const { DATA_ATTRIBUTES } = uiConfig;

class PlayerCard extends BaseComponent {
    constructor(container, props = {}) {
        super(container);
        this.player = props.player;
        this.positionNames = props.positionNames || {};
        this.onAction = props.onAction; // Callback for actions (edit, reset, remove)
    }

    render() {
        const { player, positionNames } = this;

        const positions = player.positions.map((pos, index) => {
            const rating = Math.round(player.ratings[pos]);
            const comparisons = player.comparisons[pos];
            const name = positionNames[pos] || pos;

            // Determine comparison status
            const hasComparisons = comparisons > 0;

            return `
                <div class="position-badge first:mt-0 last:mb-0">
                    <div class="badge-position font-medium">
                        ${name}
                    </div>
                    <div class="badge-stats d-flex gap-2 text-xs">
                        <span class="badge-rating">${rating} ELO</span>
                        <span class="badge-comparisons text-tertiary">${comparisons} comp.</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="settings-player-card" data-player-id="${player.id}">
                <div class="player-header d-flex justify-between items-center mb-3">
                    <h4 class="player-name font-semibold m-0">${this.escape(player.name)}</h4>
                    ${player.positions.length > 1 ?
                '<span class="multi-badge text-xs">Multi-pos</span>' : ''
            }
                </div>

                <div class="player-positions space-y-2 mb-4">
                    ${positions}
                </div>

                <div class="player-actions d-flex gap-2">
                    <button class="btn btn-sm btn-secondary" ${DATA_ATTRIBUTES.ACTION}="edit" ${DATA_ATTRIBUTES.PLAYER_ID}="${player.id}">
                        ${getIcon('edit', { size: 14, className: 'btn-icon' })}
                        Edit
                    </button>
                    <button class="btn btn-sm btn-secondary" ${DATA_ATTRIBUTES.ACTION}="reset" ${DATA_ATTRIBUTES.PLAYER_ID}="${player.id}">
                        ${getIcon('refresh', { size: 14, className: 'btn-icon' })}
                        Reset
                    </button>
                    <button class="btn btn-sm btn-secondary" ${DATA_ATTRIBUTES.ACTION}="remove" ${DATA_ATTRIBUTES.PLAYER_ID}="${player.id}">
                        ${getIcon('trash', { size: 14, className: 'btn-icon' })}
                        Remove
                    </button>
                </div>
            </div>
        `;
    }

    onMount() {
        // Attach event listeners to buttons
        this.container.querySelectorAll(`[${DATA_ATTRIBUTES.ACTION}]`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute(DATA_ATTRIBUTES.ACTION);
                const playerId = btn.getAttribute(DATA_ATTRIBUTES.PLAYER_ID);
                if (this.onAction) {
                    this.onAction(action, playerId);
                }
            });
        });
    }
}

export default PlayerCard;
