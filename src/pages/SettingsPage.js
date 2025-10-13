/**
 * SettingsPage - Player management page
 */
import BasePage from './BasePage.js';
import playerService from '../services/PlayerService.js';
import stateManager from '../core/StateManager.js';
import toast from '../components/base/Toast.js';

class SettingsPage extends BasePage {
    constructor(container) {
        super(container);
        this.setTitle('Settings');
        this.selectedPositions = [];
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
                    <button class="btn btn-sm btn-secondary" data-action="edit" data-player-id="${player.id}">
                        Edit
                    </button>
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
            importBtn.addEventListener('click', () => this.handleImport());
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
                case 'edit':
                    // TODO: Show edit modal
                    toast.info('Edit modal coming soon!');
                    break;
                    
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

    handleImport() {
        toast.info('Import modal coming soon!');
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

        // TODO: Show position selector modal
        toast.info('Reset modal coming soon!');
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
