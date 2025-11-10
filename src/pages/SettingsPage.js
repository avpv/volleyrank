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

class SettingsPage extends BasePage {
    constructor(container, props = {}) {
        super(container, props);
        this.setTitle('Settings');

        // Get services from props
        this.activityConfig = props.activityConfig;
        this.playerService = props.services?.resolve('playerService');

        this.selectedPositions = [];
        this.importModal = null;
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
    }

    onMount() {
        this.attachEventListeners();
    }

    onUpdate() {
        this.attachEventListeners();
    }

    onDestroy() {
        if (this.importModal) {
            this.importModal.destroy();
            this.importModal = null;
        }
    }

    render() {
        const players = this.playerService.getAll();
        const stats = this.playerService.getPositionStats();
        const currentActivity = storage.get('selectedActivity', null);

        return this.renderPage(`
            <div class="page-header">
                <h2>Player Management</h2>
            </div>

            ${players.length === 0 ? this.renderWelcomeGuide() : ''}

            ${this.renderActivitySelector()}
            ${this.renderAddPlayerForm()}
            ${currentActivity ? this.renderPositionStats(stats) : ''}
            ${this.renderPlayersList(players)}
        `);
    }

    renderWelcomeGuide() {
        return `
            <div class="welcome-guide">
                <h3>Welcome to TeamBalance!</h3>
                <p>Get started in 4 easy steps:</p>
                <ol>
                    <li><a href="#" class="guide-link" data-action="select-activity"><strong>Select Activity Type</strong></a> from the dropdown below</li>
                    <li><strong>Add players</strong> with their positions</li>
                    <li><strong>Compare players</strong> to build accurate skill ratings</li>
                    <li><strong>Create balanced teams</strong> automatically</li>
                </ol>
            </div>
        `;
    }

    renderActivitySelector() {
        const currentActivity = storage.get('selectedActivity', null);

        return `
            <div class="activity-selector-section">
                <div class="form-group">
                    <label for="activitySelect">Activity Type</label>
                    <select id="activitySelect" class="activity-select">
                        <option value="" ${!currentActivity ? 'selected' : ''}>Select an activity...</option>
                        ${Object.entries(activities)
                            .sort((a, b) => a[1].name.localeCompare(b[1].name))
                            .map(([key, config]) => `
                                <option value="${key}" ${key === currentActivity ? 'selected' : ''}>
                                    ${config.name}
                                </option>
                            `).join('')}
                    </select>
                    <p class="form-help-text">
                        Changing the activity will reload the page to apply new positions and team configuration.
                    </p>
                </div>
            </div>
        `;
    }

    renderAddPlayerForm() {
        const currentActivity = storage.get('selectedActivity', null);
        const isOpen = !!currentActivity;

        return `
            <div class="accordion add-player-section">
                <button type="button" class="accordion-header${!currentActivity ? ' disabled' : ''}" id="addPlayerAccordionHeader">
                    <span>Add Players</span>
                    ${getIcon('chevron-down', { size: 16, className: `accordion-icon${isOpen ? ' open' : ''}` })}
                </button>
                <div class="accordion-content${isOpen ? ' open' : ''}" id="addPlayerAccordionContent">
                    <form class="player-form" id="playerForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Player Name</label>
                                <input
                                    type="text"
                                    id="playerNameInput"
                                    placeholder="Enter player name"
                                    required
                                    ${!currentActivity ? 'disabled' : ''}
                                >
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Positions (select all applicable)</label>
                            <div class="positions-grid" id="positionsGrid">
                                ${this.renderPositionCheckboxes()}
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary" ${!currentActivity ? 'disabled' : ''}>
                                ${getIcon('plus', { size: 16, className: 'btn-icon' })}
                                Add Player
                            </button>
                            <button type="button" class="btn btn-secondary" id="importBtn" ${!currentActivity ? 'disabled' : ''}>
                                ${getIcon('arrow-down', { size: 16, className: 'btn-icon' })}
                                Import Players
                            </button>
                        </div>

                        <div class="form-section danger-zone">
                            <label class="form-section-title">Reset & Delete</label>
                            <div class="form-section-actions">
                                <button type="button" class="btn btn-warning" id="resetAllBtn">
                                    ${getIcon('refresh', { size: 16, className: 'btn-icon' })}
                                    Reset All Ratings
                                </button>
                                <button type="button" class="btn btn-danger" id="clearAllBtn">
                                    ${getIcon('trash', { size: 16, className: 'btn-icon' })}
                                    Remove All Players
                                </button>
                            </div>
                        </div>
                    </form>
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
            <div class="position-stats">
                ${Object.entries(stats).map(([pos, data]) => `
                    <div class="stat-card">
                        <div class="stat-number">${data.count}</div>
                        <div class="stat-label">${data.name}s</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderPlayersList(players) {
        if (players.length === 0) {
            return this.renderEmpty('No players yet. Add your first player above!');
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
                <h3>Current Players (${players.length})</h3>
                <div class="players-grid">
                    ${sorted.map(player => this.renderPlayerCard(player)).join('')}
                </div>
            </div>
        `;
    }

    renderPlayerCard(player) {
        const positions = player.positions.map(pos => {
            const rating = Math.round(player.ratings[pos]);
            const comparisons = player.comparisons[pos];
            const name = this.playerService.positions[pos];
            
            return `
                <div class="position-badge">
                    <div class="badge-position">${name}</div>
                    <div class="badge-stats">
                        <span class="badge-rating">${rating} ELO</span>
                        <span class="badge-comparisons">${comparisons} comp.</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="settings-player-card" data-player-id="${player.id}">
                <div class="player-header">
                    <h4 class="player-name">${this.escape(player.name)}</h4>
                    ${player.positions.length > 1 ?
                        '<span class="multi-badge">Multi-pos</span>' : ''
                    }
                </div>

                <div class="player-positions">
                    ${positions}
                </div>

                <div class="player-actions">
                    <button class="btn btn-sm btn-secondary" data-action="edit" data-player-id="${player.id}">
                        ${getIcon('edit', { size: 14, className: 'btn-icon' })}
                        Edit
                    </button>
                    <button class="btn btn-sm btn-warning" data-action="reset" data-player-id="${player.id}">
                        ${getIcon('refresh', { size: 14, className: 'btn-icon' })}
                        Reset
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="remove" data-player-id="${player.id}">
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
                const action = link.getAttribute('data-action');
                if (action) {
                    e.preventDefault();
                    this.handleGuideAction(action);
                }
            });
        });

        // Activity selector
        const activitySelect = this.$('#activitySelect');
        if (activitySelect) {
            activitySelect.addEventListener('change', (e) => {
                this.handleActivityChange(e.target.value);
            });
        }

        // Accordion toggle
        const accordionHeader = this.$('#addPlayerAccordionHeader');
        if (accordionHeader) {
            accordionHeader.addEventListener('click', () => {
                this.toggleAccordion();
            });
        }

        // Form submission
        const form = this.$('#playerForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddPlayer();
            });
        }

        // Import button
        const importBtn = this.$('#importBtn');

        if (importBtn) {
            importBtn.addEventListener('click', () => this.showImportModal());
        }

        // Reset/Clear buttons
        const resetAllBtn = this.$('#resetAllBtn');
        const clearAllBtn = this.$('#clearAllBtn');

        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => this.showResetAllModal());
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.handleClearAll());
        }

        // Player actions
        this.$$('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.getAttribute('data-action');
                const playerId = btn.getAttribute('data-player-id');
                this.handlePlayerAction(action, playerId);
            });
        });
    }

    handleAddPlayer() {
        const nameInput = this.$('#playerNameInput');
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
        const currentActivity = storage.get('selectedActivity', null);

        // Prevent opening if no activity selected
        if (!currentActivity) {
            toast.error('Please select an activity type first');
            return;
        }

        const content = this.$('#addPlayerAccordionContent');
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
                const activitySelect = this.$('#activitySelect');
                if (activitySelect) {
                    activitySelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Focus the select to draw attention
                    setTimeout(() => activitySelect.focus(), 300);
                }
                break;
        }
    }

    handleActivityChange(activityKey) {
        // If empty selection, clear the activity
        if (!activityKey) {
            storage.remove('selectedActivity');
            toast.success('Activity cleared. Reloading...', 2000);
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            return;
        }

        const selectedActivity = activities[activityKey];
        if (!selectedActivity) {
            toast.error('Invalid activity selected');
            return;
        }

        // Save selected activity to localStorage
        storage.set('selectedActivity', activityKey);

        // Show confirmation toast
        toast.success(`Switching to ${selectedActivity.name}. Reloading...`, 2000);

        // Reload the page to apply new activity configuration
        setTimeout(() => {
            window.location.reload();
        }, 2000);
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
                                        checked
                                    >
                                    <span class="position-label">
                                        ${this.playerService.positions[pos]}
                                        <span class="position-stats-inline">(${rating} ELO, ${comparisons} comp.)</span>
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
                                            checked
                                        >
                                        <span class="position-label">
                                            ${name}
                                            <span class="position-stats-inline">
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
        }, 100);
    }

    renderImportModalContent() {
        const currentActivity = storage.get('selectedActivity', null);
        const activityName = currentActivity ? activities[currentActivity]?.name : 'Unknown';
        const positions = this.playerService.positions;
        const positionsList = Object.entries(positions)
            .map(([key, name]) => `${name} (${key})`)
            .join(', ');

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
                    <pre class="code-block">name,positions
"John Smith","OH,MB"
"Alice Johnson","S"
"Bob Williams","L"</pre>
                </div>

                <div class="format-example">
                    <strong>JSON Format:</strong>
                    <pre class="code-block">[
  {"name": "John Smith", "positions": ["OH", "MB"]},
  {"name": "Alice Johnson", "positions": ["S"]}
]</pre>
                </div>

                <div class="form-group">
                    <label>Upload File (CSV or JSON)</label>
                    <input 
                        type="file" 
                        id="importFileInput" 
                        accept=".csv,.json"
                        class="file-input"
                    >
                </div>

                <div class="form-group">
                    <label>Or Paste Data</label>
                    <textarea 
                        id="importDataInput" 
                        rows="8"
                        placeholder="Paste CSV or JSON data here..."
                        class="import-textarea"
                    ></textarea>
                </div>

                <div id="importPreview"></div>
            </div>
        `;
    }

    attachImportModalListeners() {
        const fileInput = document.getElementById('importFileInput');
        const dataInput = document.getElementById('importDataInput');

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
            const dataInput = document.getElementById('importDataInput');
            if (dataInput) {
                dataInput.value = text;
                this.previewImportData(text);
            }
        } catch (error) {
            toast.error('Failed to read file: ' + error.message);
        }
    }

    previewImportData(data) {
        const preview = document.getElementById('importPreview');
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
        const dataInput = document.getElementById('importDataInput');
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
        if (!confirm('Remove all players? This cannot be undone!')) return;

        try {
            stateManager.reset({ clearStorage: true });
            toast.success('All players removed');
            // Force update UI after deleting all players
            this.update();
        } catch (error) {
            toast.error('Failed to remove players');
            console.error('Clear all error:', error);
        }
    }

}

export default SettingsPage;
