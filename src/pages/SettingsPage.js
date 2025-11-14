// src/pages/SettingsPage.js

/**
 * SettingsPage - Player management
 */
import BasePage from './BasePage.js';
import stateManager from '../core/StateManager.js';
import storage from '../core/StorageAdapter.js';
import toast from '../components/base/Toast.js';
import Modal from '../components/base/Modal.js';
import { getIcon } from '../components/base/Icons.js';
import { activities } from '../config/activities/index.js';
import Sidebar from '../components/Sidebar.js';
import uiConfig from '../config/ui.js';
import { STORAGE_KEYS } from '../utils/constants.js';

const { ELEMENT_IDS, DATA_ATTRIBUTES, ANIMATION, TOAST } = uiConfig;

class SettingsPage extends BasePage {
    constructor(container, props = {}) {
        super(container, props);
        this.setTitle('Settings');

        // Get services from props
        this.activityConfig = props.activityConfig;
        this.activityKey = props.activityKey; // Key like 'volleyball', 'basketball', etc.
        this.playerService = props.services?.resolve('playerService');
        this.sessionService = props.services?.resolve('sessionService');
        this.eventBus = props.services?.resolve('eventBus');

        this.selectedPositions = [];
        this.importModal = null;
        this.sidebar = null;
    }

    onCreate() {
        // Subscribe to state changes
        this.on('player:added', () => this.update());
        this.on('player:removed', () => this.update());
        this.on('player:updated', () => this.update());
        this.on('player:reset', () => this.update());
        this.on('players:reset-all-positions', () => this.update());
        this.on('state:changed', () => this.update());
        this.on('state:reset', () => this.update());
        this.on('session:activated', () => this.update());
        // Handle scroll to activity selector request
        this.on('scroll-to-activity-selector', () => this.handleGuideAction('select-activity'));
    }

    onMount() {
        this.mountSidebar();
        this.attachEventListeners();
    }

    onUpdate() {
        // Re-mount sidebar if container was re-rendered
        this.mountSidebar();
        this.attachEventListeners();
    }

    onDestroy() {
        if (this.sidebar) {
            this.sidebar.destroy();
            this.sidebar = null;
        }
        if (this.importModal) {
            this.importModal.destroy();
            this.importModal = null;
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
        const players = this.playerService.getAll();
        const stats = this.playerService.getPositionStats();
        const currentActivity = storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);

        return this.renderPageWithSidebar(`
            <div class="page-header">
                <h2>Player Management</h2>
            </div>

            ${players.length === 0 ? this.renderWelcomeGuide() : ''}

            ${this.renderActivitySelector()}
            ${this.renderAddPlayerForm()}
            ${currentActivity ? this.renderPositionStats(stats) : ''}
            ${currentActivity ? this.renderPlayersList(players) : ''}
        `);
    }

    renderWelcomeGuide() {
        return `
            <div class="welcome-guide" role="complementary" aria-label="Getting started guide">
                <h3 class="mb-3 font-semibold">👋 Welcome to TeamBalance!</h3>
                <p class="mb-4 text-secondary">
                    Create perfectly balanced teams. Get started in 4 simple steps:
                </p>
                <ol class="space-y-2">
                    <li>
                        <a href="#" class="guide-link" ${DATA_ATTRIBUTES.ACTION}="select-activity">
                            <strong>Select your sport or activity</strong>
                        </a> from the dropdown below to begin
                    </li>
                    <li><strong>Add your players</strong> and assign their positions</li>
                    <li><strong>Compare players head-to-head</strong> to build accurate skill ratings</li>
                    <li><strong>Generate balanced teams automatically</strong> with one click</li>
                </ol>
            </div>
        `;
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

    renderActivitySelector() {
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
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;" aria-hidden="true">
                                    <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
                                </svg>
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

    renderAddPlayerForm() {
        const currentActivity = storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);
        const isOpen = !!currentActivity;

        return `
            <div class="accordion add-player-section" role="region" aria-label="Add players">
                <button
                    type="button"
                    class="accordion-header${!currentActivity ? ' disabled' : ''}"
                    id="${ELEMENT_IDS.ADD_PLAYER_ACCORDION_HEADER}"
                    aria-expanded="${isOpen}"
                    aria-controls="${ELEMENT_IDS.ADD_PLAYER_ACCORDION_CONTENT}"
                    ${!currentActivity ? 'aria-disabled="true"' : ''}>
                    <span>Add Players</span>
                    ${getIcon('chevron-down', { size: 16, className: `accordion-icon${isOpen ? ' open' : ''}` })}
                </button>
                <div
                    class="accordion-content${isOpen ? ' open' : ''}"
                    id="${ELEMENT_IDS.ADD_PLAYER_ACCORDION_CONTENT}"
                    role="region"
                    aria-hidden="${!isOpen}">
                    <!-- Import Players Section -->
                    <div class="player-section import-section">
                        <h4 class="section-title">Import Players from File</h4>
                        <div class="section-content">
                            <button
                                type="button"
                                class="btn btn-secondary"
                                id="${ELEMENT_IDS.IMPORT_BTN}"
                                ${!currentActivity ? 'disabled' : ''}
                                aria-label="Import players from CSV or JSON file">
                                ${getIcon('arrow-down', { size: 16, className: 'btn-icon' })}
                                Import from File
                            </button>
                            <p class="form-help-text mt-2">
                                Upload a CSV or JSON file with your players' names and positions
                            </p>
                        </div>
                    </div>

                    <!-- Manual Add Players Section -->
                    <div class="player-section manual-add-section">
                        <h4 class="section-title">Add Individual Players</h4>
                        <form class="player-form" id="${ELEMENT_IDS.PLAYER_FORM}" aria-label="Add new player form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="${ELEMENT_IDS.PLAYER_NAME_INPUT}">Player Name</label>
                                    <input
                                        type="text"
                                        id="${ELEMENT_IDS.PLAYER_NAME_INPUT}"
                                        class="form-control"
                                        placeholder="e.g., John Smith"
                                        required
                                        autocomplete="off"
                                        ${!currentActivity ? 'disabled' : ''}
                                        aria-required="true"
                                        aria-describedby="player-name-help"
                                    >
                                    <p class="form-help" id="player-name-help">Enter the full name of the player</p>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Positions
                                    <span class="text-tertiary">(select all that apply)</span>
                                </label>
                                <div class="positions-grid" id="positionsGrid" role="group" aria-label="Player positions">
                                    ${this.renderPositionCheckboxes()}
                                </div>
                                <p class="form-help">Select one or more positions this player can fill</p>
                            </div>

                            <div class="form-actions">
                                <button
                                    type="submit"
                                    class="btn btn-primary"
                                    ${!currentActivity ? 'disabled' : ''}
                                    aria-label="Add player to roster">
                                    ${getIcon('plus', { size: 16, className: 'btn-icon' })}
                                    Add Player
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Danger Zone Section -->
                    <div class="player-section danger-zone-section">
                        <h4 class="section-title">Bulk Actions</h4>
                        <div class="form-section danger-zone">
                            <div class="form-section-actions">
                                <button
                                    type="button"
                                    class="btn btn-secondary"
                                    id="${ELEMENT_IDS.RESET_ALL_BTN}"
                                    ${!currentActivity ? 'disabled' : ''}
                                    aria-label="Reset all player ratings to default">
                                    ${getIcon('refresh', { size: 16, className: 'btn-icon' })}
                                    Reset All Ratings
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-secondary"
                                    id="${ELEMENT_IDS.CLEAR_ALL_BTN}"
                                    ${!currentActivity ? 'disabled' : ''}
                                    aria-label="Remove all players from current session">
                                    ${getIcon('trash', { size: 16, className: 'btn-icon' })}
                                    Remove All Players
                                </button>
                            </div>
                            <p class="form-help-text mt-3 text-tertiary">
                                ⚠️ These actions cannot be undone. Use with caution.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPositionCheckboxes() {
        const positions = this.playerService.positions;
        const currentActivity = storage.get('selectedActivity', null);

        return Object.entries(positions).map(([key, name]) => `
            <label class="position-checkbox">
                <input
                    type="checkbox"
                    name="position"
                    value="${key}"
                    class="position-input"
                    ${!currentActivity ? 'disabled' : ''}
                >
                <span class="position-label">${name} (${key})</span>
            </label>
        `).join('');
    }

    renderPositionStats(stats) {
        return `
            <div class="position-stats d-grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                ${Object.entries(stats).map(([pos, data]) => `
                    <div class="stat-card text-center">
                        <div class="stat-number text-2xl md:text-3xl font-bold mb-2">${data.count}</div>
                        <div class="stat-label text-xs md:text-sm text-secondary">${data.name}s</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderPlayersList(players) {
        if (players.length === 0) {
            const emptyIcon = getIcon('users-x', { size: 64, color: 'var(--color-text-secondary)' });
            return this.renderEmpty('Add your first player using the form above to get started.', emptyIcon, 'No Players Yet');
        }

        const sorted = [...players].sort((a, b) => {
            const posOrder = this.activityConfig.positionOrder;
            const aPos = a.positions[0];
            const bPos = b.positions[0];
            const diff = posOrder.indexOf(aPos) - posOrder.indexOf(bPos);
            return diff !== 0 ? diff : a.name.localeCompare(b.name);
        });

        return `
            <div class="players-section">
                <h3 class="text-xl font-semibold mb-4">Current Players (${players.length})</h3>
                <div class="players-grid d-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    ${sorted.map(player => this.renderPlayerCard(player)).join('')}
                </div>
            </div>
        `;
    }

    renderPlayerCard(player) {
        const positions = player.positions.map((pos, index) => {
            const rating = Math.round(player.ratings[pos]);
            const comparisons = player.comparisons[pos];
            const name = this.playerService.positions[pos];

            return `
                <div class="position-badge first:mt-0 last:mb-0">
                    <div class="badge-position font-medium">${name}</div>
                    <div class="badge-stats d-flex gap-2 text-xs">
                        <span class="badge-rating">${rating} ELO</span>
                        <span class="badge-comparisons text-tertiary">${comparisons} comp.</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="settings-player-card" data-player-id="${player.id}">
                <div class="player-header d-flex justify-between items-center mb-3">
                    <h4 class="player-name font-semibold m-0">${this.escape(player.name)}</h4>
                    ${player.positions.length > 1 ?
                        '<span class="multi-badge text-xs">Multi-pos</span>' : ''
                    }
                </div>

                <div class="player-positions space-y-2 mb-4">
                    ${positions}
                </div>

                <div class="player-actions d-flex gap-2">
                    <button class="btn btn-sm btn-secondary" ${DATA_ATTRIBUTES.ACTION}="edit" ${DATA_ATTRIBUTES.PLAYER_ID}="${player.id}">
                        ${getIcon('edit', { size: 14, className: 'btn-icon' })}
                        Edit
                    </button>
                    <button class="btn btn-sm btn-secondary" ${DATA_ATTRIBUTES.ACTION}="reset" ${DATA_ATTRIBUTES.PLAYER_ID}="${player.id}">
                        ${getIcon('refresh', { size: 14, className: 'btn-icon' })}
                        Reset
                    </button>
                    <button class="btn btn-sm btn-secondary" ${DATA_ATTRIBUTES.ACTION}="remove" ${DATA_ATTRIBUTES.PLAYER_ID}="${player.id}">
                        ${getIcon('trash', { size: 14, className: 'btn-icon' })}
                        Remove
                    </button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Welcome guide links
        this.$$('.guide-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const action = link.getAttribute(DATA_ATTRIBUTES.ACTION);
                if (action) {
                    e.preventDefault();
                    this.handleGuideAction(action);
                }
            });
        });

        // Activity selector
        const activitySelect = this.$(`#${ELEMENT_IDS.ACTIVITY_SELECT}`);
        if (activitySelect) {
            activitySelect.addEventListener('change', (e) => {
                this.handleActivityChange(e.target.value);
            });
        }

        // Create session button
        const createSessionBtn = this.$('#createSessionBtn');
        if (createSessionBtn) {
            createSessionBtn.addEventListener('click', () => {
                this.handleCreateSession();
            });
        }

        // Accordion toggle
        const accordionHeader = this.$(`#${ELEMENT_IDS.ADD_PLAYER_ACCORDION_HEADER}`);
        if (accordionHeader) {
            accordionHeader.addEventListener('click', () => {
                this.toggleAccordion();
            });
        }

        // Form submission
        const form = this.$(`#${ELEMENT_IDS.PLAYER_FORM}`);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddPlayer();
            });
        }

        // Import button
        const importBtn = this.$(`#${ELEMENT_IDS.IMPORT_BTN}`);

        if (importBtn) {
            importBtn.addEventListener('click', () => this.showImportModal());
        }

        // Reset/Clear buttons
        const resetAllBtn = this.$(`#${ELEMENT_IDS.RESET_ALL_BTN}`);
        const clearAllBtn = this.$(`#${ELEMENT_IDS.CLEAR_ALL_BTN}`);

        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => this.showResetAllModal());
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.handleClearAll());
        }

        // Player actions
        this.$$(`[${DATA_ATTRIBUTES.ACTION}]`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.getAttribute(DATA_ATTRIBUTES.ACTION);
                const playerId = btn.getAttribute(DATA_ATTRIBUTES.PLAYER_ID);
                this.handlePlayerAction(action, playerId);
            });
        });
    }

    handleAddPlayer() {
        const nameInput = this.$(`#${ELEMENT_IDS.PLAYER_NAME_INPUT}`);
        const name = nameInput.value.trim();

        const checkedBoxes = this.$$('.position-input:checked');
        const positions = Array.from(checkedBoxes).map(cb => cb.value);

        if (positions.length === 0) {
            toast.error('Please select at least one position');
            return;
        }

        try {
            this.playerService.add(name, positions);

            // Reset form
            nameInput.value = '';
            checkedBoxes.forEach(cb => cb.checked = false);
            nameInput.focus();
        } catch (error) {
            toast.error(error.message);
        }
    }

    toggleAccordion() {
        const currentActivity = storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);

        // Prevent opening if no activity selected
        if (!currentActivity) {
            toast.error('Please select an activity type first');
            return;
        }

        const content = this.$(`#${ELEMENT_IDS.ADD_PLAYER_ACCORDION_CONTENT}`);
        const icon = this.$('.accordion-icon');

        if (content && icon) {
            content.classList.toggle('open');
            icon.classList.toggle('open');
        }
    }

    handleGuideAction(action) {
        switch (action) {
            case 'select-activity':
                // Scroll to activity selector
                const activitySelect = this.$(`#${ELEMENT_IDS.ACTIVITY_SELECT}`);
                if (activitySelect) {
                    activitySelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Focus the select to draw attention
                    setTimeout(() => activitySelect.focus(), ANIMATION.STANDARD);
                }
                break;
        }
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
            // Scroll to activity selector to help user
            this.handleGuideAction('select-activity');
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

    handlePlayerAction(action, playerId) {
        try {
            switch (action) {
                case 'edit':
                    this.showEditPositionsModal(playerId);
                    break;
                    
                case 'reset':
                    this.showResetPlayerModal(playerId);
                    break;
                    
                case 'remove':
                    const player = this.playerService.getById(playerId);
                    if (confirm(`Remove ${player.name}?`)) {
                        this.playerService.remove(playerId);
                    }
                    break;
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // ===== MODAL: Edit Positions =====
    showEditPositionsModal(playerId) {
        const player = this.playerService.getById(playerId);
        if (!player) {
            toast.error('Player not found');
            return;
        }

        const modal = new Modal({
            title: `Edit Positions - ${player.name}`,
            content: this.renderEditPositionsContent(player),
            showCancel: true,
            showConfirm: true,
            confirmText: 'Save',
            cancelText: 'Cancel',
            onConfirm: () => {
                const selected = this.getSelectedModalPositions('editPositions');
                if (selected.length === 0) {
                    toast.error('Please select at least one position');
                    return false;
                }
                try {
                    this.playerService.updatePositions(playerId, selected);
                    toast.success(`Positions updated for ${player.name}`);
                    return true;
                } catch (error) {
                    toast.error(error.message);
                    return false;
                }
            }
        });

        this.addComponent(modal);
        modal.mount();
        modal.open();
    }

    renderEditPositionsContent(player) {
        return `
            <div class="modal-content-inner">
                <div class="form-group">
                    <label>Positions (select all applicable):</label>
                    <div class="positions-grid">
                        ${Object.entries(this.playerService.positions).map(([key, name]) => `
                            <label class="position-checkbox">
                                <input
                                    type="checkbox"
                                    name="editPositions"
                                    value="${key}"
                                    class="position-input"
                                    ${player.positions.includes(key) ? 'checked' : ''}
                                >
                                <span class="position-label">${name} (${key})</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // ===== MODAL: Reset Player =====
    showResetPlayerModal(playerId) {
        const player = this.playerService.getById(playerId);
        if (!player) {
            toast.error('Player not found');
            return;
        }

        const modal = new Modal({
            title: `Reset Ratings - ${player.name}`,
            content: this.renderResetPlayerContent(player),
            showCancel: true,
            showConfirm: true,
            confirmText: 'Reset Selected',
            cancelText: 'Cancel',
            onConfirm: () => {
                const selected = this.getSelectedModalPositions('resetPositions');
                if (selected.length === 0) {
                    toast.error('Please select at least one position');
                    return false;
                }
                try {
                    this.playerService.resetPositions(playerId, selected);
                    const posNames = selected.map(p => this.playerService.positions[p]).join(', ');
                    toast.success(`Reset ${posNames} for ${player.name}`);
                    return true;
                } catch (error) {
                    toast.error(error.message);
                    return false;
                }
            }
        });

        this.addComponent(modal);
        modal.mount();
        modal.open();
    }

    renderResetPlayerContent(player) {
        return `
            <div class="modal-content-inner">
                <div class="form-group">
                    <label>Select positions to reset:</label>
                    <div class="positions-grid">
                        ${player.positions.map(pos => {
                            const rating = Math.round(player.ratings[pos]);
                            const comparisons = player.comparisons[pos];
                            return `
                                <label class="position-checkbox">
                                    <input
                                        type="checkbox"
                                        name="resetPositions"
                                        value="${pos}"
                                        class="position-input"
                                        checked
                                    >
                                    <span class="position-label">
                                        ${this.playerService.positions[pos]}
                                        <span>(${rating} ELO, ${comparisons} comp.)</span>
                                    </span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                    <div class="warning-box">
                        <div class="warning-title">Warning</div>
                        <div class="warning-text">
                            This will reset ratings to 1500 and clear all comparison history for selected positions.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== MODAL: Reset All =====
    showResetAllModal() {
        const players = this.playerService.getAll();
        if (players.length === 0) {
            toast.error('No players to reset');
            return;
        }

        const modal = new Modal({
            title: 'Reset All Ratings',
            content: this.renderResetAllContent(),
            showCancel: true,
            showConfirm: true,
            confirmText: 'Reset All',
            cancelText: 'Cancel',
            onConfirm: () => {
                const selected = this.getSelectedModalPositions('resetAllPositions');
                if (selected.length === 0) {
                    toast.error('Please select at least one position');
                    return false;
                }
                try {
                    this.playerService.resetAllPositions(selected);
                    const posNames = selected.map(p => this.playerService.positions[p]).join(', ');
                    toast.success(`Reset ${posNames} for all players`);
                    return true;
                } catch (error) {
                    toast.error(error.message);
                    return false;
                }
            }
        });

        this.addComponent(modal);
        modal.mount();
        modal.open();
    }

    renderResetAllContent() {
        const stats = this.playerService.getPositionStats();
        
        return `
            <div class="modal-content-inner">
                <div class="form-group">
                    <label>Select positions to reset for ALL players:</label>
                    <div class="positions-grid">
                        ${Object.entries(this.playerService.positions)
                            .filter(([pos]) => stats[pos].count > 0)
                            .map(([pos, name]) => {
                                const posStats = stats[pos];
                                const totalComps = posStats.players.reduce((sum, p) => 
                                    sum + (p.comparisons[pos] || 0), 0);
                                return `
                                    <label class="position-checkbox">
                                        <input
                                            type="checkbox"
                                            name="resetAllPositions"
                                            value="${pos}"
                                            class="position-input"
                                            checked
                                        >
                                        <span class="position-label">
                                            ${name}
                                            <span>
                                                (${posStats.count} players, ${Math.floor(totalComps / 2)} comp.)
                                            </span>
                                        </span>
                                    </label>
                                `;
                            }).join('')}
                    </div>
                    <div class="warning-box warning-box-danger">
                        <div class="warning-title">Warning</div>
                        <div class="warning-text">
                            This will reset ALL players' ratings to 1500 and clear ALL comparison history for selected positions. This action cannot be undone!
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== MODAL: Import =====
    showImportModal() {
        if (this.importModal) {
            this.importModal.destroy();
        }

        this.importModal = new Modal({
            title: 'Import Players',
            content: this.renderImportModalContent(),
            showCancel: true,
            showConfirm: true,
            confirmText: 'Import',
            cancelText: 'Cancel',
            size: 'large',
            onConfirm: () => this.handleImportConfirm(),
            onClose: () => {
                this.importModal = null;
            }
        });

        this.importModal.mount();
        this.importModal.open();

        setTimeout(() => {
            this.attachImportModalListeners();
        }, uiConfig.ANIMATION.SHORT);
    }

    renderImportModalContent() {
        const currentActivity = storage.get('selectedActivity', null);
        const activityName = currentActivity ? activities[currentActivity]?.name : 'Unknown';
        const positions = this.playerService.positions;
        const positionsList = Object.entries(positions)
            .map(([key, name]) => `${name} (${key})`)
            .join(', ');

        // Generate example positions from current activity
        const positionKeys = Object.keys(positions);

        // Create examples based on number of available positions
        let csvExample, jsonExample;

        if (positionKeys.length === 0) {
            // No positions defined - use placeholders
            csvExample = `name,positions
"John Smith","POS1"
"Alice Johnson","POS1"
"Bob Williams","POS2"`;
            jsonExample = `[
  {"name": "John Smith", "positions": ["POS1"]},
  {"name": "Alice Johnson", "positions": ["POS1"]}
]`;
        } else if (positionKeys.length === 1) {
            // Single position - all players have the same position (no duplicates per player)
            const pos = positionKeys[0];
            csvExample = `name,positions
"John Smith","${pos}"
"Alice Johnson","${pos}"
"Bob Williams","${pos}"`;
            jsonExample = `[
  {"name": "John Smith", "positions": ["${pos}"]},
  {"name": "Alice Johnson", "positions": ["${pos}"]}
]`;
        } else {
            // Multiple positions - show variety with unique positions per player
            const pos1 = positionKeys[0];
            const pos2 = positionKeys[1];
            const pos3 = positionKeys[2] || pos1;
            csvExample = `name,positions
"John Smith","${pos1},${pos2}"
"Alice Johnson","${pos2}"
"Bob Williams","${pos3}"`;
            jsonExample = `[
  {"name": "John Smith", "positions": ["${pos1}", "${pos2}"]},
  {"name": "Alice Johnson", "positions": ["${pos2}"]}
]`;
        }

        return `
            <div class="import-modal-content">
                <p class="modal-description">
                    Import players from CSV or JSON format. You can paste data or upload a file.
                </p>

                <div class="info-box">
                    <div class="info-title">Current Activity: ${this.escape(activityName)}</div>
                    <div class="info-text">
                        Players should have positions for this activity: <strong>${positionsList}</strong>
                    </div>
                </div>

                <div class="format-example">
                    <strong>CSV Format:</strong>
                    <pre class="code-block">${csvExample}</pre>
                </div>

                <div class="format-example">
                    <strong>JSON Format:</strong>
                    <pre class="code-block">${jsonExample}</pre>
                </div>

                <div class="form-group">
                    <label>Upload File (CSV or JSON)</label>
                    <input
                        type="file"
                        id="${ELEMENT_IDS.IMPORT_FILE_INPUT}"
                        accept=".csv,.json"
                        class="file-input"
                    >
                </div>

                <div class="form-group">
                    <label>Or Paste Data</label>
                    <textarea
                        id="${ELEMENT_IDS.IMPORT_DATA_INPUT}"
                        rows="8"
                        placeholder="Paste CSV or JSON data here..."
                        class="import-textarea"
                    ></textarea>
                </div>

                <div id="${ELEMENT_IDS.IMPORT_PREVIEW}"></div>
            </div>
        `;
    }

    attachImportModalListeners() {
        const fileInput = document.getElementById(ELEMENT_IDS.IMPORT_FILE_INPUT);
        const dataInput = document.getElementById(ELEMENT_IDS.IMPORT_DATA_INPUT);

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileUpload(file);
                }
            });
        }

        if (dataInput) {
            dataInput.addEventListener('input', (e) => {
                this.previewImportData(e.target.value);
            });
        }
    }

    async handleFileUpload(file) {
        try {
            const text = await file.text();
            const dataInput = document.getElementById(ELEMENT_IDS.IMPORT_DATA_INPUT);
            if (dataInput) {
                dataInput.value = text;
                this.previewImportData(text);
            }
        } catch (error) {
            toast.error('Failed to read file: ' + error.message);
        }
    }

    previewImportData(data) {
        const preview = document.getElementById(ELEMENT_IDS.IMPORT_PREVIEW);
        if (!preview) return;

        try {
            const players = this.parseImportData(data);
            
            if (players.length === 0) {
                preview.innerHTML = '';
                return;
            }

            preview.innerHTML = `
                <div class="preview-success">
                    <strong>Found ${players.length} player(s)</strong>
                    <div class="preview-list">
                        ${players.map(p => `
                            <div class="preview-item">• ${this.escape(p.name)} - ${p.positions.join(', ')}</div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            preview.innerHTML = `
                <div class="preview-error">
                    <strong>Error:</strong> ${this.escape(error.message)}
                </div>
            `;
        }
    }

    parseImportData(data) {
        if (!data || !data.trim()) return [];
        data = data.trim();

        // Try JSON
        if (data.startsWith('[') || data.startsWith('{')) {
            try {
                let parsed = JSON.parse(data);
                if (!Array.isArray(parsed)) parsed = [parsed];
                return parsed.map(item => ({
                    name: item.name,
                    positions: Array.isArray(item.positions) ? item.positions : [item.positions]
                }));
            } catch (e) {
                throw new Error('Invalid JSON format');
            }
        }

        // Try CSV
        const lines = data.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) throw new Error('CSV must have header and data rows');

        const dataLines = lines.slice(1);
        const players = [];

        for (const line of dataLines) {
            const match = line.match(/^"?([^,"]+)"?\s*,\s*"?([^"]+)"?$/);
            if (!match) throw new Error(`Invalid CSV line: ${line}`);
            
            players.push({
                name: match[1].trim(),
                positions: match[2].split(',').map(p => p.trim())
            });
        }

        return players;
    }

    handleImportConfirm() {
        const dataInput = document.getElementById(ELEMENT_IDS.IMPORT_DATA_INPUT);
        if (!dataInput || !dataInput.value.trim()) {
            toast.error('Please provide data to import');
            return false;
        }

        try {
            const players = this.parseImportData(dataInput.value);
            if (players.length === 0) {
                toast.error('No players found');
                return false;
            }

            let imported = 0, skipped = 0;
            players.forEach(playerData => {
                try {
                    this.playerService.add(playerData.name, playerData.positions);
                    imported++;
                } catch (error) {
                    skipped++;
                    console.warn(`Skipped ${playerData.name}:`, error.message);
                }
            });

            toast.success(`Imported ${imported} player(s)${skipped > 0 ? `, skipped ${skipped}` : ''}`);
            return true;
        } catch (error) {
            toast.error('Import failed: ' + error.message);
            return false;
        }
    }

    // ===== HELPERS =====
    getSelectedModalPositions(inputName) {
        const checkboxes = document.querySelectorAll(`input[name="${inputName}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    handleClearAll() {
        if (!confirm('Remove all players from the current session? This cannot be undone!')) return;

        try {
            const players = this.playerService.getAll();

            // Remove each player from the current session
            players.forEach(player => {
                this.playerService.remove(player.id);
            });

            toast.success('All players removed from current session');
        } catch (error) {
            toast.error('Failed to remove players');
            console.error('Clear all error:', error);
        }
    }

}

export default SettingsPage;
