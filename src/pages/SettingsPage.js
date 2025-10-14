/**
 * SettingsPage - Player management page
 */
import BasePage from './BasePage.js';
import playerService from '../services/PlayerService.js';
import stateManager from '../core/StateManager.js';
import toast from '../components/base/Toast.js';
import Modal from '../components/base/Modal.js';

class SettingsPage extends BasePage {
    constructor(container) {
        super(container);
        this.setTitle('Settings');
        this.selectedPositions = [];
        this.importModal = null;
    }

    onCreate() {
        // Subscribe to state changes
        this.on('player:added', () => this.update());
        this.on('player:removed', () => this.update());
        this.on('player:updated', () => this.update());
        this.on('player:reset', () => this.update());
        this.on('state:changed', () => this.update());
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
        const players = playerService.getAll();
        const stats = playerService.getPositionStats();

        return this.renderPage(`
            <div class="page-header">
                <h2>Player Management</h2>
            </div>

            ${players.length === 0 ? this.renderWelcomeGuide() : ''}

            ${this.renderAddPlayerForm()}
            ${this.renderPositionStats(stats)}
            ${this.renderPlayersList(players)}
        `);
    }

    renderWelcomeGuide() {
        return `
            <div class="welcome-guide">
                <h3>👋 Welcome to VolleyRank!</h3>
                <p>Get started in 3 easy steps:</p>
                <ol>
                    <li><strong>Add players</strong> with their positions below</li>
                    <li><strong>Compare players</strong> to build accurate skill ratings</li>
                    <li><strong>Create balanced teams</strong> automatically</li>
                </ol>
            </div>
        `;
    }

    renderAddPlayerForm() {
        return `
            <div class="add-player-section">
                <form class="player-form" id="playerForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Player Name</label>
                            <input 
                                type="text" 
                                id="playerNameInput" 
                                placeholder="Enter player name"
                                required
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
                        <button type="submit" class="btn btn-primary">
                            Add Player
                        </button>
                        <button type="button" class="btn btn-secondary" id="importBtn">
                            Import Players
                        </button>
                        <button type="button" class="btn btn-secondary" id="exportBtn">
                            Export Players
                        </button>
                    </div>

                    <div class="form-actions-secondary">
                        <button type="button" class="btn btn-warning" id="resetAllBtn">
                            Reset All Ratings
                        </button>
                        <button type="button" class="btn btn-danger" id="clearAllBtn">
                            Remove All Players
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    renderPositionCheckboxes() {
        const positions = playerService.positions;
        
        return Object.entries(positions).map(([key, name]) => `
            <label class="position-checkbox">
                <input 
                    type="checkbox" 
                    name="position" 
                    value="${key}"
                    class="position-input"
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
            return this.renderEmpty('No players yet. Add your first player above!', '👥');
        }

        // Sort players by positions
        const sorted = [...players].sort((a, b) => {
            const posOrder = ['S', 'OPP', 'OH', 'MB', 'L'];
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
            const name = playerService.positions[pos];
            
            return `
                <div class="position-badge">
                    <div class="badge-position">${name}</div>
                    <div class="badge-stats">
                        <span class="badge-rating">${rating}</span>
                        <span class="badge-comparisons">${comparisons} comp.</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="player-card" data-player-id="${player.id}">
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
                    <button class="btn btn-sm btn-warning" data-action="reset" data-player-id="${player.id}">
                        Reset
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="remove" data-player-id="${player.id}">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Form submission
        const form = this.$('#playerForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddPlayer();
            });
        }

        // Import/Export buttons
        const importBtn = this.$('#importBtn');
        const exportBtn = this.$('#exportBtn');
        
        if (importBtn) {
            importBtn.addEventListener('click', () => this.showImportModal());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        // Reset/Clear buttons
        const resetAllBtn = this.$('#resetAllBtn');
        const clearAllBtn = this.$('#clearAllBtn');
        
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => this.handleResetAll());
        }
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.handleClearAll());
        }

        // Player actions
        this.$$('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.getAttribute('data-action');
                const playerId = parseFloat(btn.getAttribute('data-player-id'));
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
            playerService.add(name, positions);
            
            // Reset form
            nameInput.value = '';
            checkedBoxes.forEach(cb => cb.checked = false);
            nameInput.focus();
        } catch (error) {
            toast.error(error.message);
        }
    }

    handlePlayerAction(action, playerId) {
        try {
            switch (action) {
                case 'reset':
                    if (confirm('Reset all ratings for this player?')) {
                        playerService.reset(playerId);
                    }
                    break;
                    
                case 'remove':
                    const player = playerService.getById(playerId);
                    if (confirm(`Remove ${player.name}?`)) {
                        playerService.remove(playerId);
                    }
                    break;
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

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

        // Attach modal event listeners
        setTimeout(() => {
            this.attachImportModalListeners();
        }, 100);
    }

    renderImportModalContent() {
        return `
            <div class="import-modal-content">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    Import players from CSV or JSON format. You can paste data or upload a file.
                </p>

                <div style="margin-bottom: 1rem;">
                    <strong>CSV Format:</strong>
                    <pre style="background: var(--surface-1); padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.85rem;">name,positions
"John Smith","OH,MB"
"Alice Johnson","S"
"Bob Williams","L"</pre>
                </div>

                <div style="margin-bottom: 1rem;">
                    <strong>JSON Format:</strong>
                    <pre style="background: var(--surface-1); padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.85rem;">[
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
                        style="width: 100%; padding: 0.5rem; background: var(--surface-2); border: 1px solid var(--border-color); border-radius: 8px;"
                    >
                </div>

                <div class="form-group">
                    <label>Or Paste Data</label>
                    <textarea 
                        id="importDataInput" 
                        rows="8"
                        placeholder="Paste CSV or JSON data here..."
                        style="width: 100%; background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; font-family: monospace; font-size: 0.9rem;"
                    ></textarea>
                </div>

                <div id="importPreview" style="margin-top: 1rem;"></div>
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
                <div style="background: var(--surface-2); border: 1px solid var(--accent-green); border-radius: 8px; padding: 1rem;">
                    <strong style="color: var(--accent-green);">✓ Found ${players.length} player(s)</strong>
                    <div style="margin-top: 0.5rem; max-height: 150px; overflow-y: auto;">
                        ${players.map(p => `
                            <div style="padding: 0.25rem 0; font-size: 0.85rem;">
                                • ${this.escape(p.name)} - ${p.positions.join(', ')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            preview.innerHTML = `
                <div style="background: rgba(231, 76, 60, 0.1); border: 1px solid var(--accent-red); border-radius: 8px; padding: 1rem; color: var(--accent-red);">
                    <strong>✗ Error:</strong> ${this.escape(error.message)}
                </div>
            `;
        }
    }

    parseImportData(data) {
        if (!data || !data.trim()) {
            return [];
        }

        data = data.trim();

        // Try JSON first
        if (data.startsWith('[') || data.startsWith('{')) {
            try {
                let parsed = JSON.parse(data);
                if (!Array.isArray(parsed)) {
                    parsed = [parsed];
                }
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
        if (lines.length < 2) {
            throw new Error('CSV must have at least header and one data row');
        }

        // Skip header
        const dataLines = lines.slice(1);
        const players = [];

        for (const line of dataLines) {
            const match = line.match(/^"?([^,"]+)"?\s*,\s*"?([^"]+)"?$/);
            if (!match) {
                throw new Error(`Invalid CSV line: ${line}`);
            }

            const name = match[1].trim();
            const positions = match[2].split(',').map(p => p.trim());

            players.push({ name, positions });
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
                toast.error('No players found in data');
                return false;
            }

            let imported = 0;
            let skipped = 0;

            players.forEach(playerData => {
                try {
                    playerService.add(playerData.name, playerData.positions);
                    imported++;
                } catch (error) {
                    skipped++;
                    console.warn(`Skipped ${playerData.name}:`, error.message);
                }
            });

            toast.success(`Imported ${imported} player(s)${skipped > 0 ? `, skipped ${skipped}` : ''}`);
            return true; // Close modal

        } catch (error) {
            toast.error('Import failed: ' + error.message);
            return false; // Keep modal open
        }
    }

    handleExport() {
        try {
            const data = stateManager.export();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `volleyrank-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('Data exported!');
        } catch (error) {
            toast.error('Export failed');
        }
    }

    handleResetAll() {
        if (!confirm('Reset all player ratings? This cannot be undone!')) {
            return;
        }

        const players = playerService.getAll();
        players.forEach(player => {
            playerService.reset(player.id);
        });

        toast.success('All ratings reset');
    }

    handleClearAll() {
        if (!confirm('Remove all players? This cannot be undone!')) {
            return;
        }

        stateManager.reset({ clearStorage: true });
        toast.success('All players removed');
    }
}

export default SettingsPage;
