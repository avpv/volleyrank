// src/pages/RankingsPage.js

/**
 * RankingsPage - Player rankings by position
 */
import BasePage from './BasePage.js';
import Sidebar from '../components/Sidebar.js';
import storage from '../core/StorageAdapter.js';
import { activities } from '../config/activities/index.js';
import { getIcon } from '../components/base/Icons.js';
import uiConfig from '../config/ui.js';

const { ELEMENT_IDS } = uiConfig;

class RankingsPage extends BasePage {
    constructor(container, props = {}) {
        super(container, props);
        this.setTitle('Rankings');

        // Get services from props
        this.activityConfig = props.activityConfig;
        this.activityKey = props.activityKey; // Key like 'volleyball', 'basketball', etc.
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
        const sidebarContainer = document.getElementById(ELEMENT_IDS.SIDEBAR_CONTAINER);
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

        // Use the activityKey passed as prop (can be null if no activity selected)
        const activityKey = this.activityKey;
        const activityConfig = activityKey ? activities[activityKey] : null;

        // Always create sidebar - it will show all sessions from all activities
        this.sidebar = new Sidebar(sidebarContainer, {
            sessionService: this.sessionService,
            eventBus: this.eventBus,
            activityKey: activityKey, // Can be null
            activityName: activityConfig?.name || null
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
                <h2 class="text-2xl md:text-3xl font-semibold">Player Rankings</h2>
                <p class="text-secondary mt-2">View and compare player skill ratings across all positions based on ELO rankings</p>
            </div>

            <div class="rankings-grid d-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" role="region" aria-label="Player rankings by position">
                ${Object.entries(positions).map(([key, name]) =>
                    this.renderPositionRankings(key, name, rankings[key])
                ).join('')}
            </div>
        `);
    }

    renderPositionRankings(position, positionName, players) {
        if (!players || players.length === 0) {
            const icon = getIcon('users-x', { size: 40, color: 'var(--color-text-secondary)' });
            return `
                <article class="ranking-card" role="region" aria-label="${positionName} rankings">
                    <h3 class="ranking-title">${positionName}s</h3>
                    ${this.renderEmpty(`No players assigned to the ${positionName} position yet. Add players on the Settings page.`, icon)}
                </article>
            `;
        }

        return `
            <article class="ranking-card" role="region" aria-label="${positionName} rankings">
                <header class="ranking-header mb-4">
                    <h3 class="ranking-title font-semibold text-lg">${positionName}s</h3>
                    <p class="text-xs text-tertiary">${players.length} player${players.length !== 1 ? 's' : ''} ranked</p>
                </header>
                <ol class="ranking-list divide-y divide-subtle" aria-label="${positionName} player rankings">
                    ${players.map((player, index) =>
                        this.renderRankingItem(player, index, position)
                    ).join('')}
                </ol>
            </article>
        `;
    }

    renderRankingItem(player, index, position) {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const rating = Math.round(player.positionRating);
        const comparisons = player.positionComparisons;
        const rankLabel = rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `#${rank}`;

        // Determine comparison status
        const hasComparisons = comparisons > 0;
        const statusClass = hasComparisons ? 'success' : 'neutral';

        return `
            <li class="ranking-item d-flex items-center gap-3 py-3" role="listitem">
                <div
                    class="rank-badge ${rankClass} d-flex items-center justify-center font-bold"
                    aria-label="Rank ${rank}"
                    title="${rankLabel} place">
                    ${rank}
                </div>
                <div class="ranking-info flex-1">
                    <div class="ranking-name font-medium mb-1">${this.escape(player.name)}</div>
                    <div class="ranking-stats text-sm text-secondary d-flex items-center gap-2" aria-label="Player statistics">
                        <span aria-label="ELO rating">${rating} ELO</span>
                        <span aria-hidden="true"> • </span>
                        <span aria-label="Number of comparisons">${comparisons} comp.</span>
                    </div>
                </div>
            </li>
        `;
    }
}

export default RankingsPage;
