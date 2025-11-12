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
import router from '../core/Router.js';
import storage from '../core/StorageAdapter.js';
import toast from './base/Toast.js';
import { activities } from '../config/activities/index.js';

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

    onUpdate() {
        // Re-attach event listeners after update
        this.attachEventListeners();
    }

    render() {
        // Get all sessions across all activities
        const allSessions = [];

        // Get sessions from state (sessions are organized by activity key)
        const sessionsState = this.sessionService.sessionRepository.stateManager.get('sessions') || {};

        for (const activityKey in sessionsState) {
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
                    <h3 class="sidebar__title">Recents</h3>
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
                <p>No sessions</p>
                <p class="text-muted">Create your first teams</p>
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
                <div class="session-item__content">
                    <div class="session-item__header">
                        <span class="session-item__name">${activityName}</span>
                    </div>
                    <div class="session-item__meta">
                        <span class="session-item__date">${dateStr} ${timeStr}</span>
                        <span class="session-item__players">${playerCount} players</span>
                    </div>
                </div>
                <button class="session-item__delete"
                        data-session-id="${session.id}"
                        data-activity-key="${activityKey}"
                        title="Delete session">
                    ${getIcon('trash')}
                </button>
            </div>
        `;
    }

    getActivityName(activityKey) {
        // Get activity name from loaded activities config
        const activity = activities[activityKey];
        return activity?.name || 'Unknown Activity';
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
        const sessionItems = this.container.querySelectorAll('.session-item');
        sessionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on delete button
                if (e.target.closest('.session-item__delete')) {
                    return;
                }

                const sessionId = item.dataset.sessionId;
                const activityKey = item.dataset.activityKey;
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
        const currentActivity = storage.get('selectedActivity', null);

        const result = this.sessionService.switchSession(activityKey, sessionId);
        if (result.success) {
            console.log('Switched to session:', sessionId);

            // Check if switching to a different activity
            if (currentActivity !== activityKey) {
                console.log('Switching from', currentActivity, 'to', activityKey);
                // Update selected activity
                storage.set('selectedActivity', activityKey);

                // Navigate to settings page to reload with new activity
                router.navigate('/');
            } else {
                // Same activity, just emit state change
                this.eventBus.emit('state:changed');
            }

            // Close mobile sidebar and backdrop after session switch
            this.closeMobileSidebar();
        }
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('pageSidebar');
        const backdrop = document.getElementById('sidebarBackdrop');

        if (!sidebar || !backdrop) {
            return;
        }

        sidebar.classList.remove('open');
        backdrop.classList.remove('visible');
        document.body.style.overflow = '';

        // Wait for transition to complete before hiding
        setTimeout(() => {
            if (!backdrop.classList.contains('visible')) {
                backdrop.style.display = 'none';
            }
        }, 300);
    }

    handleDeleteSession(sessionId, activityKey) {
        const session = this.sessionService.getSession(activityKey, sessionId);
        const playerCount = session?.players?.length || 0;

        let confirmMessage = 'Delete this session?';
        if (playerCount > 0) {
            confirmMessage = `Delete session with ${playerCount} players?`;
        }

        if (confirm(confirmMessage)) {
            const result = this.sessionService.deleteSession(activityKey, sessionId);
            if (result.success) {
                console.log('Session deleted:', sessionId);

                // Close mobile sidebar and backdrop after session deletion
                this.closeMobileSidebar();

                // Check if there are any remaining sessions for the current activity
                const remainingSessions = this.sessionService.getAllSessions(activityKey);

                // Check if this was the last session across all activities
                const allActivities = this.sessionService.sessionRepository.stateManager.get('sessions') || {};
                const totalSessionCount = Object.values(allActivities).reduce((count, sessions) => {
                    return count + Object.keys(sessions || {}).length;
                }, 0);

                if (totalSessionCount === 0) {
                    // No sessions left at all - navigate to settings page
                    console.log('[Sidebar] All sessions deleted - navigating to settings');

                    // Clear selected activity since there are no sessions
                    storage.remove('selectedActivity');
                    storage.remove('pendingActivity');

                    // Show message
                    toast.info('All sessions deleted. Please select an activity to continue.');

                    // Navigate to settings if not already there
                    if (router.currentRoute !== '/') {
                        router.navigate('/');
                    } else {
                        // Already on settings page, just reload to reset state
                        window.location.reload();
                    }
                } else {
                    // Still have sessions, just update UI
                    this.eventBus.emit('state:changed');
                }
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
