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
            <div class="page-header">
                <h2>Player Rankings</h2>
                <p class="page-subtitle">View and compare player skill ratings across all positions based on ELO rankings</p>
            </div>

            <div class="rankings-grid" role="region" aria-label="Player rankings by position">
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
                <article class="ranking-card" role="region" aria-label="${this.escape(positionName)} rankings">
                    <h3 class="ranking-title">${this.escape(positionName)}s</h3>
                    ${this.renderEmpty(
                        `No players assigned to the ${this.escape(positionName)} position yet. Add players on the Settings page.`,
                        icon,
                        'No Players Yet'
                    )}
                </article>
            `;
        }

        return `
            <article class="ranking-card" role="region" aria-label="${this.escape(positionName)} rankings">
                <h3 class="ranking-title">
                    ${this.escape(positionName)}s
                    <span class="text-xs text-secondary font-normal" style="margin-left: auto;">${players.length} player${players.length !== 1 ? 's' : ''}</span>
                </h3>
                <ol class="ranking-list" aria-label="${this.escape(positionName)} player rankings">
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

        // Get medal emoji for top 3
        const getRankLabel = () => {
            if (rank === 1) return '1st place';
            if (rank === 2) return '2nd place';
            if (rank === 3) return '3rd place';
            return `Rank ${rank}`;
        };

        return `
            <li class="ranking-item" role="listitem">
                <div class="rank-badge ${rankClass}"
                     aria-label="${getRankLabel()}"
                     title="${getRankLabel()}">
                    ${rank}
                </div>
                <div class="ranking-info">
                    <div class="ranking-name">${this.escape(player.name)}</div>
                    <div class="ranking-stats" aria-label="Player statistics">
                        <span aria-label="ELO rating">${rating} ELO</span>
                        <span aria-hidden="true"> • </span>
                        <span aria-label="Number of comparisons">${comparisons} comparison${comparisons !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </li>
        `;
    }
}

export default RankingsPage;
