/**
 * RankingsPage - Player rankings by position
 */
import BasePage from './BasePage.js';
import playerService from '../services/PlayerService.js';

class RankingsPage extends BasePage {
    constructor(container) {
        super(container);
        this.setTitle('Rankings');
    }

    onCreate() {
        this.on('comparison:completed', () => this.update());
        this.on('player:added', () => this.update());
        this.on('player:removed', () => this.update());
        this.on('player:reset', () => this.update());
    }

    render() {
        const rankings = playerService.getRankings();
        const positions = playerService.positions;

        return this.renderPage(`
            <div class="page-header">
                <h2>Player Rankings by Position</h2>
            </div>

            <div class="rankings-grid">
                ${Object.entries(positions).map(([key, name]) => 
                    this.renderPositionRankings(key, name, rankings[key])
                ).join('')}
            </div>
        `);
    }

    renderPositionRankings(position, positionName, players) {
        if (!players || players.length === 0) {
            return `
                <div class="ranking-card">
                    <h3 class="ranking-title">${positionName}s</h3>
                    ${this.renderEmpty('No players at this position', '📊')}
                </div>
            `;
        }

        return `
            <div class="ranking-card">
                <h3 class="ranking-title">${positionName}s</h3>
                <div class="ranking-list">
                    ${players.map((player, index) => 
                        this.renderRankingItem(player, index, position)
                    ).join('')}
                </div>
            </div>
        `;
    }

    renderRankingItem(player, index, position) {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const rating = Math.round(player.positionRating);
        const comparisons = player.positionComparisons;

        return `
            <div class="ranking-item">
                <div class="rank-badge ${rankClass}">${rank}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${this.escape(player.name)}</div>
                    <div class="ranking-stats">
                        ${rating} ELO • ${comparisons} comparisons
                    </div>
                </div>
            </div>
        `;
    }
}

export default RankingsPage;
