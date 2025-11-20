/**
 * SettingsPage - Player management
 */
import BasePage from './BasePage.js';
import stateManager from '../core/StateManager.js';
import storage from '../core/StorageAdapter.js';
import toast from '../components/base/Toast.js';
import Modal from '../components/base/Modal.js';
import Sidebar from '../components/Sidebar.js';
import uiConfig from '../config/ui.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { getIcon } from '../components/base/Icons.js';

// Components
import ActivitySelector from '../components/settings/ActivitySelector.js';
import AddPlayerForm from '../components/settings/AddPlayerForm.js';
import PositionStats from '../components/settings/PositionStats.js';
import PlayerList from '../components/settings/PlayerList.js';

const { ELEMENT_IDS, DATA_ATTRIBUTES } = uiConfig;

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

        this.sidebar = null;
        this.activitySelector = null;
        this.addPlayerForm = null;
        this.positionStats = null;
        this.playerList = null;
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
        this.mountComponents();
        this.attachEventListeners();
    }

    onUpdate() {
        // Re-mount sidebar if container was re-rendered
        this.mountSidebar();
        this.mountComponents();
        this.attachEventListeners();
    }

    onDestroy() {
        if (this.sidebar) {
            this.sidebar.destroy();
            this.sidebar = null;
        }
        this.destroyComponents();
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
        const activityConfig = activityKey ? this.props.activityConfig : null;

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

    mountComponents() {
        this.destroyComponents();

        // 1. Activity Selector
        const activitySelectorContainer = this.$('.activity-selector-container');
        if (activitySelectorContainer) {
            this.activitySelector = new ActivitySelector(activitySelectorContainer, {
                sessionService: this.sessionService,
                onActivityChange: (action) => this.handleGuideAction(action)
            });
            this.activitySelector.mount();
            this.addComponent(this.activitySelector);
        }

        // 2. Add Player Form
        const addPlayerFormContainer = this.$('.add-player-form-container');
        if (addPlayerFormContainer) {
            this.addPlayerForm = new AddPlayerForm(addPlayerFormContainer, {
                playerService: this.playerService,
                onImportClick: () => this.showImportModal(),
                onResetAllClick: () => this.showResetAllModal(),
                onClearAllClick: () => this.showClearAllModal()
            });
            this.addPlayerForm.mount();
            this.addComponent(this.addPlayerForm);
        }

        // 3. Position Stats
        const positionStatsContainer = this.$('.position-stats-container');
        if (positionStatsContainer && this.playerService) {
            const stats = this.playerService.getPositionStats();
            this.positionStats = new PositionStats(positionStatsContainer, {
                stats
            });
            this.positionStats.mount();
            this.addComponent(this.positionStats);
        }

        // 4. Player List
        const playerListContainer = this.$('.player-list-container');
        if (playerListContainer && this.playerService && this.activityConfig) {
            const players = this.playerService.getAll();
            this.playerList = new PlayerList(playerListContainer, {
                players,
                positionOrder: this.activityConfig.positionOrder,
                positionNames: this.activityConfig.positions,
                onPlayerAction: (action, playerId) => this.handlePlayerAction(action, playerId)
            });
            this.playerList.mount();
            this.addComponent(this.playerList);
        }
    }

    destroyComponents() {
        if (this.activitySelector) {
            this.activitySelector.destroy();
            this.activitySelector = null;
        }
        if (this.addPlayerForm) {
            this.addPlayerForm.destroy();
            this.addPlayerForm = null;
        }
        if (this.positionStats) {
            this.positionStats.destroy();
            this.positionStats = null;
        }
        if (this.playerList) {
            this.playerList.destroy();
            this.playerList = null;
        }
    }

    render() {
        const players = this.playerService.getAll();
        const currentActivity = storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);

        return this.renderPageWithSidebar(`
            <div class="page-header">
                <h2>Player Management</h2>
            </div>

            ${players.length === 0 ? this.renderWelcomeGuide() : ''}

            <div class="activity-selector-container"></div>
            <div class="add-player-form-container"></div>
            
            ${currentActivity ? '<div class="position-stats-container"></div>' : ''}
            ${currentActivity ? '<div class="player-list-container"></div>' : ''}
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
            title: `Reset Player - ${player.name}`,
            content: this.renderResetPlayerContent(player),
            showCancel: true,
            showConfirm: true,
            confirmText: 'Reset',
            cancelText: 'Cancel',
            onConfirm: () => {
                const selected = this.getSelectedModalPositions('resetPositions');
                if (selected.length === 0) {
                    toast.error('Please select at least one position');
                    return false;
                }
                try {
                    this.playerService.reset(playerId, selected);
                    // Toast is handled by event bus
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
            const name = this.playerService.positions[pos];
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
                                    <span class="position-label">${name} (${rating} ELO, ${comparisons} comps)</span>
                                </label>
                            `;
        }).join('')}
                    </div>
                    <div class="warning-box mt-3">
                        <div class="warning-title">Warning</div>
                        <div class="warning-text">
                            This will reset the player's rating to 1500 and clear comparison history for the selected positions.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== MODAL: Reset All =====
    showResetAllModal() {
        const modal = new Modal({
            title: 'Reset All Player Ratings',
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
                    this.playerService.resetAll(selected);
                    // Toast is handled by event bus
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
        return `
            <div class="modal-content-inner">
                <div class="form-group">
                    <label>Select positions to reset for ALL players:</label>
                    <div class="positions-grid">
                        ${Object.entries(this.playerService.positions).map(([key, name]) => `
                            <label class="position-checkbox">
                                <input
                                    type="checkbox"
                                    name="resetAllPositions"
                                    value="${key}"
                                    class="position-input"
                                    checked
                                >
                                <span class="position-label">${name} (${key})</span>
                            </label>
                        `).join('')}
                    </div>
                    <div class="warning-box warning-box-danger mt-3">
                        <div class="warning-title">Warning</div>
                        <div class="warning-text">
                            This will reset ALL players to 1500 ELO and clear ALL comparison history for the selected positions. This action cannot be undone!
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== MODAL: Clear All =====
    showClearAllModal() {
        const modal = new Modal({
            title: 'Remove All Players',
            content: `
                <div class="modal-content-inner">
                    <div class="warning-box warning-box-danger">
                        <div class="warning-title">Danger Zone</div>
                        <div class="warning-text">
                            Are you sure you want to remove ALL players from this session? This will delete all player data, ratings, and history. This action cannot be undone!
                        </div>
                    </div>
                </div>
            `,
            showCancel: true,
            showConfirm: true,
            confirmText: 'Remove All',
            cancelText: 'Cancel',
            onConfirm: () => {
                try {
                    this.playerService.clearAll();
                    toast.success('All players removed');
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

    // ===== MODAL: Import =====
    showImportModal() {
        const modal = new Modal({
            title: 'Import Players',
            content: this.renderImportContent(),
            showCancel: true,
            showConfirm: true,
            confirmText: 'Import',
            cancelText: 'Cancel',
            onConfirm: () => this.handleImport()
        });

        this.addComponent(modal);
        modal.mount();
        modal.open();

        // Attach file input listener
        const fileInput = modal.container.querySelector(`#${ELEMENT_IDS.IMPORT_FILE_INPUT}`);
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    renderImportContent() {
        return `
            <div class="modal-content-inner">
                <div class="form-group">
                    <label for="${ELEMENT_IDS.IMPORT_FILE_INPUT}">Upload File (JSON or CSV)</label>
                    <input 
                        type="file" 
                        id="${ELEMENT_IDS.IMPORT_FILE_INPUT}" 
                        class="form-control" 
                        accept=".json,.csv"
                    >
                    <p class="form-help">
                        Supported formats:
                        <br>• JSON: Array of objects with "name" and "positions" properties
                        <br>• CSV: "name,positions" (positions separated by semicolon)
                    </p>
                </div>
                
                <div class="form-group">
                    <label for="${ELEMENT_IDS.IMPORT_DATA_INPUT}">Or Paste Data</label>
                    <textarea 
                        id="${ELEMENT_IDS.IMPORT_DATA_INPUT}" 
                        class="form-control" 
                        rows="10" 
                        placeholder='[{"name": "John Doe", "positions": ["setter", "hitter"]}]'
                    ></textarea>
                </div>
            </div>
        `;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const textarea = document.getElementById(ELEMENT_IDS.IMPORT_DATA_INPUT);
            if (textarea) {
                textarea.value = content;
            }
        };
        reader.readAsText(file);
    }

    handleImport() {
        const textarea = document.getElementById(ELEMENT_IDS.IMPORT_DATA_INPUT);
        const content = textarea ? textarea.value.trim() : '';

        if (!content) {
            toast.error('Please provide data to import');
            return false;
        }

        try {
            let players = [];
            
            // Try parsing as JSON first
            if (content.startsWith('[') || content.startsWith('{')) {
                try {
                    const json = JSON.parse(content);
                    players = Array.isArray(json) ? json : [json];
                } catch (e) {
                    throw new Error('Invalid JSON format');
                }
            } else {
                // Assume CSV
                players = this.parseCSV(content);
            }

            if (players.length === 0) {
                throw new Error('No players found in data');
            }

            // Import players
            let successCount = 0;
            let errorCount = 0;

            players.forEach(p => {
                try {
                    // Normalize positions
                    let positions = p.positions;
                    if (typeof positions === 'string') {
                        positions = positions.split(/[;,|]/).map(pos => pos.trim());
                    }
                    
                    if (!positions || !Array.isArray(positions)) {
                        throw new Error(`Invalid positions for ${p.name}`);
                    }

                    this.playerService.add(p.name, positions);
                    successCount++;
                } catch (err) {
                    console.warn(`Failed to import ${p.name}:`, err);
                    errorCount++;
                }
            });

            if (successCount > 0) {
                toast.success(`Imported ${successCount} players${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
                return true;
            } else {
                toast.error('Failed to import any players. Check format.');
                return false;
            }

        } catch (error) {
            toast.error(error.message);
            return false;
        }
    }

    parseCSV(content) {
        const lines = content.split(/\r?\n/);
        const players = [];
        
        // Check for header
        let startIndex = 0;
        if (lines[0].toLowerCase().includes('name') && lines[0].toLowerCase().includes('position')) {
            startIndex = 1;
        }

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Simple CSV parse: name, positions
            // Handle quoted values? For now simple split
            const parts = line.split(',');
            if (parts.length >= 2) {
                const name = parts[0].trim();
                // Remaining parts are positions, or second part is positions string
                let positions = parts.slice(1).join(',');
                
                // Remove quotes if present
                if (name.startsWith('"') && name.endsWith('"')) {
                    // name = name.slice(1, -1); // Already handled by simple split? No.
                }
                
                players.push({ name, positions });
            }
        }
        
        return players;
    }

    getSelectedModalPositions(inputName) {
        const checkboxes = document.querySelectorAll(`input[name="${inputName}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }
}

export default SettingsPage;
