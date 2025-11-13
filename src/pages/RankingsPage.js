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
            <div class="page-header mb-6">
                <h2 class="text-2xl md:text-3xl font-semibold">Player Rankings by Position</h2>
            </div>

            <div class="rankings-grid d-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
            <div class="group ranking-card transition-shadow hover:shadow-lg animate-fade-in">
                <h3 class="ranking-title mb-4 font-semibold text-lg group-hover:text-brand transition-colors">${positionName}s</h3>
                <div class="ranking-list divide-y divide-subtle">
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
            <div class="ranking-item d-flex items-center gap-3 py-2 transition-colors hover:bg-surface-raised first:pt-0 last:pb-0 first:border-t-0 last:border-b-0">
                <div class="rank-badge ${rankClass} d-flex items-center justify-center font-bold transition-transform hover:scale-110">${rank}</div>
                <div class="ranking-info flex-1">
                    <div class="ranking-name font-medium mb-1">${this.escape(player.name)}</div>
                    <div class="ranking-stats text-sm text-secondary">
                        ${rating} ELO • ${comparisons} comparisons
                    </div>
                </div>
            </div>
        `;
    }
}

export default RankingsPage;
