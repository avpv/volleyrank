import BaseComponent from '../BaseComponent.js';
import storage from '../../core/StorageAdapter.js';
import stateManager from '../../core/StateManager.js';
import toast from '../base/Toast.js';
import { activities } from '../../config/activities/index.js';
import uiConfig from '../../config/ui.js';
import { STORAGE_KEYS } from '../../utils/constants.js';
import { getIcon } from '../base/Icons.js';

const { ELEMENT_IDS, ANIMATION, TOAST } = uiConfig;

class ActivitySelector extends BaseComponent {
    constructor(container, props = {}) {
        super(container);
        this.sessionService = props.sessionService;
        this.onActivityChange = props.onActivityChange; // Callback for when activity changes
    }

    render() {
        const currentActivity = storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);
        const recentActivities = this.getRecentActivities();

        // Separate recent and other activities
        const allActivitiesEntries = Object.entries(activities);
        const recentActivitySet = new Set(recentActivities);

        const recentOptions = recentActivities
            .map(key => [key, activities[key]])
            .filter(([key, config]) => config); // Filter out any invalid activities

        const otherOptions = allActivitiesEntries
            .filter(([key]) => !recentActivitySet.has(key))
            .sort((a, b) => a[1].name.localeCompare(b[1].name));

        return `
            <div class="activity-selector-section" role="region" aria-label="Activity selection">
                <div class="player-form">
                    <div class="form-group">
                        <label for="${ELEMENT_IDS.ACTIVITY_SELECT}">Activity Type</label>
                        <div class="activity-selector-row form-row">
                            <select
                                id="${ELEMENT_IDS.ACTIVITY_SELECT}"
                                class="activity-select"
                                aria-label="Select activity type"
                                aria-describedby="activity-help-text">
                                <option value="" ${!currentActivity ? 'selected' : ''} disabled>Select a sport or activity...</option>
                                ${recentOptions.length > 0 ? `
                                    <optgroup label="Recent Activities">
                                        ${recentOptions.map(([key, config]) => `
                                            <option value="${key}" ${key === currentActivity ? 'selected' : ''}>
                                                ${config.name}
                                            </option>
                                        `).join('')}
                                    </optgroup>
                                ` : ''}
                                ${otherOptions.length > 0 ? `
                                    <optgroup label="All Activities">
                                        ${otherOptions.map(([key, config]) => `
                                            <option value="${key}" ${key === currentActivity ? 'selected' : ''}>
                                                ${config.name}
                                            </option>
                                        `).join('')}
                                    </optgroup>
                                ` : ''}
                            </select>
                            <button
                                type="button"
                                class="btn btn--secondary"
                                id="createSessionBtn"
                                title="Create a new team session"
                                aria-label="Create new team session">
                                ${getIcon('plus', { size: 16, className: 'btn-icon' })}
                                New Session
                            </button>
                        </div>
                        <p class="form-help-text" id="activity-help-text">
                            Choose your sport or activity, then click "New Session" to start building teams.
                            Your previous sessions are saved in the sidebar.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    onMount() {
        const activitySelect = this.container.querySelector(`#${ELEMENT_IDS.ACTIVITY_SELECT}`);
        if (activitySelect) {
            activitySelect.addEventListener('change', (e) => {
                this.handleActivityChange(e.target.value);
            });
        }

        const createSessionBtn = this.container.querySelector('#createSessionBtn');
        if (createSessionBtn) {
            createSessionBtn.addEventListener('click', () => {
                this.handleCreateSession();
            });
        }
    }

    getRecentActivities() {
        // Get all sessions from state
        const allSessions = stateManager.get('sessions') || {};

        // Collect all sessions with their activity keys and sort by creation date
        const sessionsList = [];
        Object.entries(allSessions).forEach(([activityKey, sessions]) => {
            Object.values(sessions).forEach(session => {
                sessionsList.push({
                    activityKey,
                    createdAt: session.createdAt
                });
            });
        });

        // Sort by creation date (newest first)
        sessionsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Get unique activity keys (up to 5)
        const uniqueActivities = [];
        const seen = new Set();

        for (const session of sessionsList) {
            if (!seen.has(session.activityKey)) {
                seen.add(session.activityKey);
                uniqueActivities.push(session.activityKey);

                if (uniqueActivities.length >= 5) {
                    break;
                }
            }
        }

        return uniqueActivities;
    }

    handleActivityChange(activityKey) {
        const currentActivity = storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);

        // If empty selection, just clear pending activity
        if (!activityKey) {
            storage.remove(STORAGE_KEYS.PENDING_ACTIVITY);
            return;
        }

        const selectedActivity = activities[activityKey];
        if (!selectedActivity) {
            toast.error('Invalid activity selected');
            return;
        }

        // Store pending activity selection
        storage.set(STORAGE_KEYS.PENDING_ACTIVITY, activityKey);

        // Show info toast
        if (currentActivity !== activityKey) {
            toast.info(`${selectedActivity.name} will be applied when you create a new session`);
        }
    }

    handleCreateSession() {
        // Check if there's a pending activity change
        const pendingActivity = storage.get(STORAGE_KEYS.PENDING_ACTIVITY, null);
        const currentActivity = storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);

        // Determine which activity to use (prefer pending if it exists)
        const targetActivity = pendingActivity || currentActivity;

        if (!targetActivity) {
            toast.error('Please select an activity first');
            // Notify parent to scroll to activity selector (though we are already here)
            if (this.onActivityChange) this.onActivityChange('select-activity');

            // Focus the select
            const select = this.container.querySelector(`#${ELEMENT_IDS.ACTIVITY_SELECT}`);
            if (select) select.focus();

            return;
        }

        try {
            // If activity is changing, apply it and reload
            if (pendingActivity && targetActivity !== currentActivity) {
                storage.set(STORAGE_KEYS.SELECTED_ACTIVITY, targetActivity);
                storage.remove(STORAGE_KEYS.PENDING_ACTIVITY);

                const selectedActivity = activities[targetActivity];
                toast.success(`Switching to ${selectedActivity.name}. Reloading...`, TOAST.QUICK_DURATION);

                setTimeout(() => {
                    window.location.reload();
                }, ANIMATION.RELOAD_DELAY);
                return;
            }

            // Same activity, just create a new session
            const newSession = this.sessionService.createSession(currentActivity);
            storage.remove(STORAGE_KEYS.PENDING_ACTIVITY);
            toast.success('New session created');
            // Page will auto-update via event bus
        } catch (error) {
            toast.error(error.message);
        }
    }
}

export default ActivitySelector;
