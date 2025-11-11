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
        // Get all sessions across all activities
        const allSessions = [];
        const storage = this.sessionService.storage;
        const activities = storage.get('activities', {});

        for (const activityKey in activities) {
            const activitySessions = this.sessionService.getAllSessions(activityKey);
            activitySessions.forEach(session => {
                allSessions.push({
                    ...session,
                    activityKey: activityKey
                });
            });
        }

        // Sort by creation date (newest first)
        allSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const activeSessionId = this.activityKey ? this.sessionService.getActiveSessionId(this.activityKey) : null;

        return `
            <div class="sidebar">
                <div class="sidebar__header">
                    <h3 class="sidebar__title">Recent</h3>
                </div>

                <div class="sidebar__list">
                    ${allSessions.length === 0 ? this.renderEmptyState() : ''}
                    ${allSessions.map(session => this.renderSessionItem(session, activeSessionId)).join('')}
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

        // Get activity name from session's activityKey
        const activityKey = session.activityKey || this.activityKey;
        const activityName = this.getActivityName(activityKey);

        return `
            <div class="session-item ${isActive ? 'session-item--active' : ''}"
                 data-session-id="${session.id}"
                 data-activity-key="${activityKey}">
                <div class="session-item__indicator">
                    ${isActive ? '●' : ''}
                </div>
                <div class="session-item__content">
                    <div class="session-item__header">
                        <span class="session-item__name">${activityName}</span>
                    </div>
                    <div class="session-item__meta">
                        <span class="session-item__date">${dateStr} ${timeStr}</span>
                        <span class="session-item__players">${playerCount} игроков</span>
                    </div>
                </div>
                <button class="session-item__delete"
                        data-session-id="${session.id}"
                        data-activity-key="${activityKey}"
                        title="Удалить сеанс">
                    ${getIcon('trash')}
                </button>
            </div>
        `;
    }

    getActivityName(activityKey) {
        // Import activities config dynamically
        const activityNames = {
            volleyball: 'Volleyball',
            basketball: 'Basketball',
            soccer: 'Soccer',
            baseball: 'Baseball',
            football: 'Football',
            rugby: 'Rugby',
            cricket: 'Cricket',
            hockey: 'Hockey',
            'ice-hockey': 'Ice Hockey',
            'field-hockey': 'Field Hockey',
            lacrosse: 'Lacrosse',
            'water-polo': 'Water Polo',
            'beach-volleyball': 'Beach Volleyball',
            futsal: 'Futsal',
            softball: 'Softball',
            netball: 'Netball',
            handball: 'Handball',
            'ultimate-frisbee': 'Ultimate Frisbee',
            'work-project': 'Work Project',
            general: 'General'
        };

        return activityNames[activityKey] || 'Unknown Activity';
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
        // Session item clicks (switch session)
        const sessionItems = this.container.querySelectorAll('.session-item__content');
        sessionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const sessionItem = e.target.closest('.session-item');
                const sessionId = sessionItem?.dataset.sessionId;
                const activityKey = sessionItem?.dataset.activityKey;
                if (sessionId && activityKey) {
                    this.handleSwitchSession(sessionId, activityKey);
                }
            });
        });

        // Delete buttons
        const deleteButtons = this.container.querySelectorAll('.session-item__delete');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent session switch
                const sessionId = btn.dataset.sessionId;
                const activityKey = btn.dataset.activityKey;
                if (sessionId && activityKey) {
                    this.handleDeleteSession(sessionId, activityKey);
                }
            });
        });
    }

    handleSwitchSession(sessionId, activityKey) {
        const result = this.sessionService.switchSession(activityKey, sessionId);
        if (result.success) {
            console.log('Switched to session:', sessionId);
            // UI will update automatically via event listener
            // Also trigger app-wide refresh
            this.eventBus.emit('state:changed');
        }
    }

    handleDeleteSession(sessionId, activityKey) {
        const session = this.sessionService.getSession(activityKey, sessionId);
        const playerCount = session?.players?.length || 0;

        let confirmMessage = 'Удалить этот сеанс?';
        if (playerCount > 0) {
            confirmMessage = `Удалить сеанс с ${playerCount} игроками?`;
        }

        if (confirm(confirmMessage)) {
            const result = this.sessionService.deleteSession(activityKey, sessionId);
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
