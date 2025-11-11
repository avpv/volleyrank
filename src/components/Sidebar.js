// src/components/Sidebar.js

/**
 * Sidebar Component - Session list and management
 *
 * Features:
 * - Display list of sessions for current activity
 * - Create new session
 * - Switch between sessions
 * - Delete sessions
 */

import Component from './base/Component.js';
import { getIcon } from './base/Icons.js';

class Sidebar extends Component {
    constructor(container, props = {}) {
        super(container, props);

        this.sessionService = props.sessionService;
        this.eventBus = props.eventBus;
        this.activityKey = props.activityKey;
        this.activityName = props.activityName;
    }

    onCreate() {
        // Subscribe to session events
        this.eventUnsubscribers.push(
            this.eventBus.on('session:created', () => this.update()),
            this.eventBus.on('session:deleted', () => this.update()),
            this.eventBus.on('session:activated', () => this.update())
        );
    }

    onMount() {
        this.attachEventListeners();
    }

    render() {
        const sessions = this.sessionService.getAllSessions(this.activityKey);
        const activeSessionId = this.sessionService.getActiveSessionId(this.activityKey);

        return `
            <div class="sidebar">
                <div class="sidebar__header">
                    <button class="btn btn-primary btn-block" id="create-session-btn">
                        ${getIcon('plus')} Новый сеанс
                    </button>
                </div>

                <div class="sidebar__list">
                    ${sessions.length === 0 ? this.renderEmptyState() : ''}
                    ${sessions.map(session => this.renderSessionItem(session, activeSessionId)).join('')}
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="sidebar__empty">
                <p>Нет сеансов</p>
                <p class="text-muted">Создайте первый сеанс</p>
            </div>
        `;
    }

    renderSessionItem(session, activeSessionId) {
        const isActive = session.id === activeSessionId;
        const date = new Date(session.createdAt);
        const dateStr = this.formatDate(date);
        const timeStr = this.formatTime(date);
        const playerCount = session.players?.length || 0;

        return `
            <div class="session-item ${isActive ? 'session-item--active' : ''}"
                 data-session-id="${session.id}">
                <div class="session-item__indicator">
                    ${isActive ? '●' : ''}
                </div>
                <div class="session-item__content">
                    <div class="session-item__header">
                        <span class="session-item__icon">${this.getActivityIcon()}</span>
                        <span class="session-item__name">${this.activityName}</span>
                    </div>
                    <div class="session-item__meta">
                        <span class="session-item__date">${dateStr} ${timeStr}</span>
                        <span class="session-item__players">${playerCount} игроков</span>
                    </div>
                </div>
                <button class="session-item__delete"
                        data-session-id="${session.id}"
                        title="Удалить сеанс">
                    ${getIcon('trash')}
                </button>
            </div>
        `;
    }

    getActivityIcon() {
        const iconMap = {
            volleyball: '🏐',
            basketball: '🏀',
            soccer: '⚽',
            baseball: '⚾',
            football: '🏈',
            rugby: '🏉',
            cricket: '🏏',
            hockey: '🏒',
            'ice-hockey': '🏒',
            'field-hockey': '🏑',
            lacrosse: '🥍',
            'water-polo': '🤽',
            'beach-volleyball': '🏐',
            futsal: '⚽',
            softball: '⚾',
            netball: '🏀',
            handball: '🤾',
            'ultimate-frisbee': '🥏',
            'work-project': '💼',
            general: '🎯'
        };

        return iconMap[this.activityKey] || '🎯';
    }

    formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
    }

    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    attachEventListeners() {
        // Create session button
        const createBtn = this.container.querySelector('#create-session-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.handleCreateSession());
        }

        // Session item clicks (switch session)
        const sessionItems = this.container.querySelectorAll('.session-item__content');
        sessionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const sessionItem = e.target.closest('.session-item');
                const sessionId = sessionItem?.dataset.sessionId;
                if (sessionId) {
                    this.handleSwitchSession(sessionId);
                }
            });
        });

        // Delete buttons
        const deleteButtons = this.container.querySelectorAll('.session-item__delete');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent session switch
                const sessionId = btn.dataset.sessionId;
                if (sessionId) {
                    this.handleDeleteSession(sessionId);
                }
            });
        });
    }

    handleCreateSession() {
        const result = this.sessionService.createSession(this.activityKey);
        if (result.success) {
            console.log('Session created:', result.session.id);
            // UI will update automatically via event listener
        }
    }

    handleSwitchSession(sessionId) {
        const result = this.sessionService.switchSession(this.activityKey, sessionId);
        if (result.success) {
            console.log('Switched to session:', sessionId);
            // UI will update automatically via event listener
            // Also trigger app-wide refresh
            this.eventBus.emit('state:changed');
        }
    }

    handleDeleteSession(sessionId) {
        const session = this.sessionService.getSession(this.activityKey, sessionId);
        const playerCount = session?.players?.length || 0;

        let confirmMessage = 'Удалить этот сеанс?';
        if (playerCount > 0) {
            confirmMessage = `Удалить сеанс с ${playerCount} игроками?`;
        }

        if (confirm(confirmMessage)) {
            const result = this.sessionService.deleteSession(this.activityKey, sessionId);
            if (result.success) {
                console.log('Session deleted:', sessionId);
                // UI will update automatically via event listener
                // Also trigger app-wide refresh
                this.eventBus.emit('state:changed');
            }
        }
    }

    destroy() {
        // Unsubscribe from events
        this.eventUnsubscribers.forEach(unsub => unsub());
        super.destroy();
    }
}

export default Sidebar;
