import BaseComponent from '../BaseComponent.js';

class PositionStats extends BaseComponent {
    constructor(container, props = {}) {
        super(container);
        this.stats = props.stats || {};
    }

    render() {
        if (Object.keys(this.stats).length === 0) {
            return '';
        }

        return `
            <div class="position-stats d-grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                ${Object.entries(this.stats).map(([pos, data]) => `
                    <div class="stat-card text-center">
                        <div class="stat-number text-2xl md:text-3xl font-bold mb-2">${data.count}</div>
                        <div class="stat-label text-xs md:text-sm text-secondary">${data.name}s</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

export default PositionStats;
