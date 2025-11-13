// src/pages/RankingsPage.js

/**
 * RankingsPage - Player rankings by position
 */
import BasePage from './BasePage.js';
import Sidebar from '../components/Sidebar.js';
import storage from '../core/StorageAdapter.js';
import { activities } from '../config/activities/index.js';

class RankingsPage extends BasePage {
    constructor(container, props = {}) {
        super(container, props);
        this.setTitle('Rankings');

        // Get services from props
        this.activityConfig = props.activityConfig;
        this.playerService = props.services?.resolve('playerService');
        this.sessionService = props.services?.resolve('sessionService');
        this.eventBus = props.services?.resolve('eventBus');
        this.sidebar = null;
    }

    onCreate() {
        this.on('comparison:completed', () => this.update());
        this.on('player:added', () => this.update());
        this.on('player:removed', () => this.update());
        this.on('player:reset', () => this.update());
        this.on('state:changed', () => this.update());
        this.on('session:activated', () => this.update());
    }

    onMount() {
        this.mountSidebar();
    }

    onUpdate() {
        // Re-mount sidebar if container was re-rendered
        this.mountSidebar();
    }

    onDestroy() {
        if (this.sidebar) {
            this.sidebar.destroy();
            this.sidebar = null;
        }
    }

    mountSidebar() {
        const sidebarContainer = document.getElementById('pageSidebar');
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

        const selectedActivity = storage.get('selectedActivity', 'volleyball');
        const activityConfig = activities[selectedActivity];

        this.sidebar = new Sidebar(sidebarContainer, {
            sessionService: this.sessionService,
            eventBus: this.eventBus,
            activityKey: selectedActivity,
            activityName: activityConfig?.name || 'Unknown'
        });

        this.sidebar.mount();
        this.addComponent(this.sidebar);
        this.setupMobileSidebarToggle();
    }

    render() {
        const rankings = this.playerService.getRankings();
        const positions = this.activityConfig.positions;

        return this.renderPageWithSidebar(`
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
                    ${this.renderEmpty('No players at this position')}
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
