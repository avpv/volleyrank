/**
 * User interface controller
 */
class UIController {
    constructor(stateManager, playerManager, eloCalculator, teamOptimizer) {
        this.stateManager = stateManager;
        this.playerManager = playerManager;
        this.eloCalculator = eloCalculator;
        this.teamOptimizer = teamOptimizer;
        
        this.currentTab = 'compare';
        this.isProcessing = false;
        
        this.initializeEventListeners();
        this.subscribeToStateChanges();
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleTabClick(e));
        });

        // Player management
        const addPlayerBtn = document.getElementById('addPlayerBtn');
        const playerNameInput = document.getElementById('playerName');
        
        if (addPlayerBtn) {
            addPlayerBtn.addEventListener('click', () => this.handleAddPlayer());
        }
        
        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleAddPlayer();
                }
            });
        }

        // Comparisons
        const positionFilter = document.getElementById('positionFilter');
        if (positionFilter) {
            positionFilter.addEventListener('change', () => this.handlePositionChange());
        }

        // Teams
        const optimizeTeamsBtn = document.getElementById('optimizeTeamsBtn');
        const teamCountInput = document.getElementById('teamCount');
        
        if (optimizeTeamsBtn) {
            optimizeTeamsBtn.addEventListener('click', () => this.handleOptimizeTeams());
        }
        
        if (teamCountInput) {
            teamCountInput.addEventListener('input', () => this.updatePlayersPerTeam());
        }

        // Team composition
        document.querySelectorAll('.composition-input').forEach(input => {
            input.addEventListener('input', () => this.updatePlayersPerTeam());
        });

        // Global actions
        const clearAllBtn = document.getElementById('clearAllBtn');
        const resetAllRatingsBtn = document.getElementById('resetAllRatingsBtn');
        const importPlayersBtn = document.getElementById('importPlayersBtn');
        const exportPlayersBtn = document.getElementById('exportPlayersBtn');
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.handleClearAll());
        }
        
        if (resetAllRatingsBtn) {
            resetAllRatingsBtn.addEventListener('click', () => this.handleResetAllRatings());
        }

        if (importPlayersBtn) {
            importPlayersBtn.addEventListener('click', () => {
                this.showImportModal();
            });
        }

        if (exportPlayersBtn) {
            exportPlayersBtn.addEventListener('click', () => this.handleExportPlayers());
        }

        // Initialize import modal handlers after DOM is ready
        setTimeout(() => this.initializeImportModalHandlers(), 100);
    }

    /**
     * Initialize import modal event handlers
     */
    initializeImportModalHandlers() {
        const modal = document.getElementById('importModal');
        const importMethodSelect = document.getElementById('importMethod');
        const executeImportBtn = document.getElementById('executeImportBtn');
        const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');

        if (importMethodSelect) {
            importMethodSelect.addEventListener('change', () => this.handleImportMethodChange());
        }

        if (executeImportBtn) {
            executeImportBtn.addEventListener('click', () => this.handleExecuteImport());
        }

        if (downloadTemplateBtn) {
            downloadTemplateBtn.addEventListener('click', () => this.handleDownloadTemplate());
        }

        // Modal close handlers
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideImportModal();
                }
            });

            modal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.hideImportModal());
            });
        }
    }

    /**
     * Subscribe to state changes
     */
    subscribeToStateChanges() {
        this.stateManager.subscribe('stateChanged', () => {
            this.updateAllDisplays();
        });

        this.stateManager.subscribe('playerAdded', (player) => {
            this.showNotification(`Player "${player.name}" added successfully!`, 'success');
        });

        this.stateManager.subscribe('playerRemoved', (player) => {
            this.showNotification(`Player "${player.name}" removed`, 'info');
        });

        this.stateManager.subscribe('comparisonCompleted', (data) => {
            this.showNotification(
                `${data.winner.name} defeats ${data.loser.name}! Ratings updated.`, 
                'success'
            );
        });

        this.stateManager.subscribe('playersImported', (result) => {
            this.showImportResult(result);
        });

        this.stateManager.subscribe('importError', (result) => {
            this.showImportResult(result);
        });
    }

    /**
     * Handle tab click
     * @param {Event} event - click event
     */
    handleTabClick(event) {
        const tabText = event.target.textContent.trim();
        let tabName = '';
        
        if (tabText.includes('Compare')) tabName = 'compare';
        else if (tabText.includes('Rankings')) tabName = 'rankings';
        else if (tabText.includes('Teams')) tabName = 'teams';
        else if (tabText.includes('Settings')) tabName = 'setup';
        
        if (tabName) {
            this.switchTab(tabName, event.target);
        }
    }

    /**
     * Switch tabs
     * @param {string} tabName - tab name
     * @param {HTMLElement} targetElement - tab element
     */
    switchTab(tabName, targetElement) {
        // Update active classes
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        targetElement.classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        this.currentTab = tabName;
        
        // Update content when switching
        if (tabName === 'rankings') {
            this.updateRankingsDisplay();
        } else if (tabName === 'compare') {
            this.updateComparisonDisplay();
        }
    }

    /**
     * Handle add player
     */
    handleAddPlayer() {
        if (this.isProcessing) return;

        const nameInput = document.getElementById('playerName');
        const positionSelect = document.getElementById('playerPosition');
        
        const name = nameInput?.value || '';
        const position = positionSelect?.value || 'OH';
        
        try {
            const validation = this.playerManager.validatePlayer(name, position);
            
            if (!validation.isValid) {
                this.showNotification(validation.errors.join(', '), 'error');
                return;
            }

            this.stateManager.addPlayer(validation.sanitizedName, position);
            nameInput.value = '';
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Handle position change
     */
    handlePositionChange() {
        this.updateComparisonDisplay();
    }

    /**
     * Handle team optimization
     */
    async handleOptimizeTeams() {
        if (this.isProcessing) return;

        try {
            this.isProcessing = true;
            this.showTeamOptimizationProgress('Analyzing players...');

            const teamCount = parseInt(document.getElementById('teamCount')?.value) || 2;
            const composition = this.getTeamComposition();
            const state = this.stateManager.getState();

            if (Object.values(composition).every(count => count === 0)) {
                this.showNotification('Please select at least one player per team', 'error');
                return;
            }

            this.showTeamOptimizationProgress('Creating optimal teams...');
            
            const result = await this.teamOptimizer.optimizeTeams(
                composition, 
                teamCount, 
                state.players
            );

            this.displayOptimizedTeams(result);
            this.showNotification(
                `Teams created! Balance difference: ${result.balance.maxDifference} ELO`, 
                'success'
            );

        } catch (error) {
            this.showNotification(`Failed to create teams: ${error.message}`, 'error');
            this.clearTeamsDisplay();
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get team composition from form
     * @returns {object} team composition
     */
    getTeamComposition() {
        const composition = {};
        const positions = ['S', 'OPP', 'OH', 'MB', 'L'];
        
        positions.forEach(pos => {
            const input = document.getElementById(`comp_${pos}`);
            composition[pos] = parseInt(input?.value) || 0;
        });
        
        return composition;
    }

    /**
     * Show team optimization progress
     * @param {string} message - progress message
     */
    showTeamOptimizationProgress(message) {
        const container = document.getElementById('teamsDisplay');
        if (container) {
            container.innerHTML = `
                <div class="no-comparison" style="color: var(--text-secondary);">
                    ⚡ ${message}
                </div>
            `;
        }
    }

    /**
     * Display optimized teams
     * @param {object} result - optimization result
     */
    displayOptimizedTeams(result) {
        const container = document.getElementById('teamsDisplay');
        if (!container) return;

        const teamLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
        let html = '';

        result.teams.forEach((team, index) => {
            const teamStats = this.eloCalculator.calculateTeamStrength(team);
            
            html += `
                <div class="team">
                    <h3>Team ${teamLabels[index]} 
                        <span style="font-weight: normal; color: var(--text-secondary);">
                            (${teamStats.totalRating} ELO, avg ${teamStats.averageRating})
                        </span>
                    </h3>
                    <div style="color: var(--text-secondary); margin-bottom: 1rem;">
                        Players: ${team.length}
                    </div>
            `;

            const sortedTeam = [...team].sort((a, b) => {
                const order = { 'S': 1, 'OPP': 2, 'OH': 3, 'MB': 4, 'L': 5 };
                return (order[a.position] || 6) - (order[b.position] || 6);
            });

            sortedTeam.forEach(player => {
                html += `
                    <div class="team-player">
                        <span>${this.escapeHtml(player.name)} 
                            <b>(${this.playerManager.positions[player.position]})</b>
                        </span>
                        <span>${Math.round(player.rating)}</span>
                    </div>
                `;
            });

            html += '</div>';
        });

        if (result.unusedPlayers.length > 0) {
            html += `
                <div class="team" style="border-color: var(--accent-orange);">
                    <h3>Unused Players</h3>
                    <div style="color: var(--text-secondary); margin-bottom: 1rem;">
                        ${result.unusedPlayers.length} player(s) not assigned to teams
                    </div>
            `;
            
            result.unusedPlayers.forEach(player => {
                html += `
                    <div class="team-player">
                        <span>${this.escapeHtml(player.name)} 
                            <b>(${this.playerManager.positions[player.position]})</b>
                        </span>
                        <span>${Math.round(player.rating)}</span>
                    </div>
                `;
            });
            
            html += '</div>';
        }

        container.innerHTML = html;
    }

    /**
     * Handle reset all ratings
     */
    handleResetAllRatings() {
        if (!confirm('Are you sure you want to reset the ELO rating and comparison count for ALL players? Their names and positions will be kept.')) {
            return;
        }

        try {
            const state = this.stateManager.getState();
            const resetPlayers = state.players.map(player => ({
                ...player,
                rating: 1500,
                comparisons: 0,
                comparedWith: []
            }));

            this.stateManager.updateState({ 
                players: resetPlayers, 
                comparisons: 0,
                currentPair: null
            });

            this.showNotification('All player ratings reset to default', 'success');
            this.updateComparisonDisplay();
            
        } catch (error) {
            this.showNotification(`Failed to reset ratings: ${error.message}`, 'error');
        }
    }

    /**
     * Handle clear all data
     */
    handleClearAll() {
        if (!confirm('Are you sure you want to delete all players and reset all stats? This action cannot be undone!')) {
            return;
        }

        try {
            this.stateManager.clearAllData();
            this.clearAllDisplays();
            this.showNotification('All data has been cleared', 'success');
        } catch (error) {
            this.showNotification(`Failed to clear data: ${error.message}`, 'error');
        }
    }

    /**
     * Update all displays
     */
    updateAllDisplays() {
        this.updatePlayersListDisplay();
        this.updateRankingsDisplay();
        this.updateComparisonDisplay();
        this.updatePlayersPerTeam();
        this.updatePositionStats();
    }

    /**
     * Update player list display
     */
    updatePlayersListDisplay() {
        const container = document.getElementById('playersList');
        const totalPlayersSpan = document.getElementById('totalPlayers');
        
        if (!container || !totalPlayersSpan) return;

        const state = this.stateManager.getState();
        totalPlayersSpan.textContent = state.players.length;

        if (state.players.length === 0) {
            container.innerHTML = `
                <div class="no-comparison" style="grid-column: 1 / -1;">
                    No players yet. Add players above.
                </div>
            `;
            return;
        }

        const sortedPlayers = [...state.players].sort((a, b) => a.name.localeCompare(b.name));
        
        let html = '';
        sortedPlayers.forEach(player => {
            const playerStats = this.playerManager.getPlayerStats(player.id);
            
            html += `
                <div class="player-item">
                    <div class="player-content-wrapper">
                        <div class="player-info-item">
                            <strong>${this.escapeHtml(player.name)}</strong>
                            <span style="color:var(--text-secondary); font-size:0.9rem;">
                                ${playerStats.positionName} (Rank #${playerStats.positionRank}/${playerStats.totalInPosition})
                            </span>
                            <span style="color:var(--text-secondary); font-size:0.9rem;">
                                ELO: ${Math.round(player.rating)} | Comparisons: ${player.comparisons}
                            </span>
                        </div>
                        <div class="player-actions">
                            <button class="btn btn-warning" onclick="uiController.handleResetPlayer(${player.id})">
                                Reset
                            </button>
                            <button class="btn btn-danger" onclick="uiController.handleRemovePlayer(${player.id})">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    /**
     * Handle reset single player
     * @param {number} playerId - player ID
     */
    handleResetPlayer(playerId) {
        try {
            const state = this.stateManager.getState();
            const player = state.players.find(p => p.id === playerId);
            
            if (!player) {
                this.showNotification('Player not found', 'error');
                return;
            }

            if (!confirm(`Are you sure you want to reset the rating and comparison count for "${player.name}"?`)) {
                return;
            }

            this.stateManager.resetPlayer(playerId);
            
        } catch (error) {
            this.showNotification(`Failed to reset player: ${error.message}`, 'error');
        }
    }

    /**
     * Handle remove player
     * @param {number} playerId - player ID
     */
    handleRemovePlayer(playerId) {
        try {
            const state = this.stateManager.getState();
            const player = state.players.find(p => p.id === playerId);
            
            if (!player) {
                this.showNotification('Player not found', 'error');
                return;
            }

            if (!confirm(`Are you sure you want to delete the player "${player.name}"?`)) {
                return;
            }

            this.stateManager.removePlayer(playerId);
            
        } catch (error) {
            this.showNotification(`Failed to remove player: ${error.message}`, 'error');
        }
    }

    /**
     * Update position statistics
     */
    updatePositionStats() {
        const container = document.getElementById('playersStats');
        if (!container) return;

        const stats = this.playerManager.getPositionStats();
        let html = '';

        Object.entries(this.playerManager.positions).forEach(([pos, name]) => {
            const count = stats[pos] || 0;
            html += `
                <div style="text-align: center;">
                    <div style="font-weight: 600; font-size: 1.2rem;">${count}</div>
                    <div style="font-size: 0.9rem; color:var(--text-secondary);">${name}s</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Update rankings display
     */
    updateRankingsDisplay() {
        const container = document.getElementById('rankingsContainer');
        if (!container) return;

        container.innerHTML = '';
        const rankings = this.playerManager.getRankingsByPosition();

        Object.entries(rankings).forEach(([position, players]) => {
            if (players.length === 0) return;

            const positionDiv = document.createElement('div');
            positionDiv.className = 'position-ranking';
            
            let html = `<h3 class="position-title">${this.playerManager.positions[position]}s</h3>`;
            
            players.forEach((player, index) => {
                const rankClass = index === 0 ? 'gold' : (index === 1 ? 'silver' : (index === 2 ? 'bronze' : ''));
                
                html += `
                    <div class="ranking-item">
                        <div class="rank-number ${rankClass}">${index + 1}</div>
                        <div class="player-info">
                            <div>${this.escapeHtml(player.name)}</div>
                            <div class="player-rating-display" style="color:var(--text-secondary); font-size: 0.9rem;">
                                ${Math.round(player.rating)} ELO (${player.comparisons} comparisons)
                            </div>
                        </div>
                    </div>
                `;
            });
            
            positionDiv.innerHTML = html;
            container.appendChild(positionDiv);
        });
    }

    /**
     * Update comparison display
     */
    updateComparisonDisplay() {
        const positionSelect = document.getElementById('positionFilter');
        const container = document.getElementById('comparisonContainer');
        
        if (!positionSelect || !container) return;

        const selectedPosition = positionSelect.value;
        
        if (!selectedPosition) {
            container.innerHTML = `
                <div class="no-comparison">
                    Select a position to start comparing players
                </div>
            `;
            this.updateComparisonStats('');
            return;
        }

        const status = this.playerManager.getPositionComparisonStatus(selectedPosition);
        
        if (!status.canCompare) {
            container.innerHTML = `
                <div class="no-comparison">
                    ${status.allPairsCompared ? 
                        '🎉 All possible unique pairs in this category have been compared!' : 
                        status.reason
                    }
                </div>
            `;
            this.updateComparisonStats(selectedPosition);
            return;
        }

        // Display pair for comparison
        const [player1, player2] = status.nextPair;
        this.stateManager.setCurrentPair(status.nextPair);

        container.innerHTML = `
            <div class="comparison-area">
                <div class="player-card" onclick="uiController.handlePlayerComparison(${player1.id}, ${player2.id})">
                    <div class="player-avatar" style="background:linear-gradient(135deg, #2563eb, #3b82f6);">
                        ${player1.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="player-name">${this.escapeHtml(player1.name)}</div>
                    <div class="player-position">${this.playerManager.positions[player1.position]}</div>
                    <div class="player-rating">${Math.round(player1.rating)} ELO</div>
                    <div style="font-size: 0.9em; color:var(--text-secondary); margin-top: 5px;">
                        Comparisons: ${player1.comparisons}
                    </div>
                </div>
                <div class="vs-divider">VS</div>
                <div class="player-card" onclick="uiController.handlePlayerComparison(${player2.id}, ${player1.id})">
                    <div class="player-avatar" style="background:linear-gradient(135deg, #a855f7, #ec4899);">
                        ${player2.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="player-name">${this.escapeHtml(player2.name)}</div>
                    <div class="player-position">${this.playerManager.positions[player2.position]}</div>
                    <div class="player-rating">${Math.round(player2.rating)} ELO</div>
                    <div style="font-size: 0.9em; color:var(--text-secondary); margin-top: 5px;">
                        Comparisons: ${player2.comparisons}
                    </div>
                </div>
            </div>
        `;

        this.updateComparisonStats(selectedPosition);
    }

    /**
     * Handle player comparison
     * @param {number} winnerId - winner ID
     * @param {number} loserId - loser ID
     */
    handlePlayerComparison(winnerId, loserId) {
        if (this.isProcessing) return;

        try {
            this.isProcessing = true;
            this.stateManager.updateRatingsAfterComparison(winnerId, loserId);
            
            setTimeout(() => {
                this.updateComparisonDisplay();
                this.isProcessing = false;
            }, 300);
            
        } catch (error) {
            this.showNotification(`Failed to process comparison: ${error.message}`, 'error');
            this.isProcessing = false;
        }
    }

    /**
     * Update comparison statistics
     * @param {string} position - position
     */
    updateComparisonStats(position) {
        const container = document.getElementById('comparisonStats');
        if (!container) return;

        const state = this.stateManager.getState();
        
        if (position) {
            const positionPlayers = this.playerManager.getPlayersByPosition(position);
            container.innerHTML = `
                Players in category "${this.playerManager.positions[position]}s": ${positionPlayers.length}<br>
                Total comparisons made: ${state.comparisons}
            `;
        } else {
            container.innerHTML = `Total comparisons made: ${state.comparisons}`;
        }
    }

    /**
     * Update players per team count
     */
    updatePlayersPerTeam() {
        const element = document.getElementById('playersPerTeam');
        if (!element) return;

        const composition = this.getTeamComposition();
        const total = Object.values(composition).reduce((sum, count) => sum + count, 0);
        
        element.textContent = total;
    }
    
    /**
     * Show import modal
     */
    showImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.style.display = 'flex';
            this.handleImportMethodChange();
        }
    }

    /**
     * Hide import modal
     */
    hideImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.style.display = 'none';
            const existingResult = modal.querySelector('.import-result');
            if (existingResult) {
                existingResult.remove();
            }
        }
    }

    /**
     * Handle import method change
     */
    handleImportMethodChange() {
        const method = document.getElementById('importMethod')?.value;
        const sections = {
            file: document.getElementById('fileUploadSection'),
            paste: document.getElementById('pasteDataSection'),
            template: document.getElementById('templateSection')
        };

        Object.values(sections).forEach(section => {
            if (section) section.style.display = 'none';
        });

        if (sections[method]) {
            sections[method].style.display = 'block';
        }

        const importBtn = document.getElementById('executeImportBtn');
        if (importBtn) {
            importBtn.style.display = method === 'template' ? 'none' : 'block';
        }
    }

    /**
     * Handle export players
     */
    handleExportPlayers() {
        try {
            const csv = this.stateManager.exportPlayersAsCSV();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `volleyrank-players-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showNotification('Players exported successfully!', 'success');
        } catch (error) {
            this.showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    /**
     * Handle download template
     */
    handleDownloadTemplate() {
        try {
            const template = this.stateManager.generateSampleCSV();
            const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'volleyrank-template.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showNotification('Template downloaded successfully!', 'success');
        } catch (error) {
            this.showNotification(`Template download failed: ${error.message}`, 'error');
        }
    }

    /**
     * Handle execute import
     */
    async handleExecuteImport() {
        const method = document.getElementById('importMethod')?.value;
        let data = '';
        let format = 'auto';

        try {
            if (method === 'file') {
                const fileInput = document.getElementById('importFileInput');
                const file = fileInput?.files[0];
                
                if (!file) {
                    this.showNotification('Please select a file to import', 'error');
                    return;
                }

                data = await this.readFileAsText(file);
                format = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
                
            } else if (method === 'paste') {
                const textarea = document.getElementById('importDataTextarea');
                data = textarea?.value?.trim() || '';
                
                if (!data) {
                    this.showNotification('Please paste some data to import', 'error');
                    return;
                }
            }

            const result = this.stateManager.importPlayers(data, format);
            
            if (result.success && result.imported > 0) {
                const fileInput = document.getElementById('importFileInput');
                const textarea = document.getElementById('importDataTextarea');
                if (fileInput) fileInput.value = '';
                if (textarea) textarea.value = '';
            }

        } catch (error) {
            this.showImportResult({
                success: false,
                imported: 0,
                skipped: 0,
                errors: 1,
                error: error.message
            });
        }
    }

    /**
     * Read file as text
     * @param {File} file - file to read
     * @returns {Promise<string>} file content
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Show import result in modal
     * @param {object} result - import result
     */
    showImportResult(result) {
        const modal = document.getElementById('importModal');
        if (!modal) return;

        const existingResult = modal.querySelector('.import-result');
        if (existingResult) {
            existingResult.remove();
        }

        const resultDiv = document.createElement('div');
        resultDiv.className = `import-result ${result.success ? 'success' : 'error'}`;

        let html = `<div class="import-summary">`;
        if (result.success) {
            html += `Import completed: ${result.imported} players added`;
            if (result.skipped > 0) html += `, ${result.skipped} skipped`;
            if (result.errors > 0) html += `, ${result.errors} errors`;
        } else {
            html += `Import failed: ${result.error || 'Unknown error'}`;
        }
        html += `</div>`;

        if (result.details) {
            const { skipped, errors } = result.details;
            if (skipped && skipped.length > 0) {
                html += `<div class="import-skipped">
                    <strong>Skipped players:</strong>
                    ${skipped.map(item => `<div class="import-skipped-item">Row ${item.row}: ${item.name} - ${item.reason}</div>`).join('')}
                </div>`;
            }
            if (errors && errors.length > 0) {
                html += `<div class="import-errors">
                    <strong>Errors:</strong>
                    ${errors.map(item => `<div class="import-error-item">Row ${item.row}: ${item.error}</div>`).join('')}
                </div>`;
            }
        }

        resultDiv.innerHTML = html;
        
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.appendChild(resultDiv);
        }

        if (result.success && result.imported > 0) {
            setTimeout(() => {
                this.hideImportModal();
            }, 3000);
        }
    }

    /**
     * Clear all displays
     */
    clearAllDisplays() {
        const containers = [
            'playersList',
            'rankingsContainer', 
            'comparisonContainer',
            'teamsDisplay'
        ];

        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<div class="no-comparison">No data available</div>';
            }
        });

        const positionFilter = document.getElementById('positionFilter');
        if (positionFilter) {
            positionFilter.value = '';
        }
    }

    /**
     * Clear teams display
     */
    clearTeamsDisplay() {
        const container = document.getElementById('teamsDisplay');
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Show notifications
     * @param {string} message - message
     * @param {string} type - notification type (success, error, info, warning)
     */
    showNotification(message, type = 'info') {
        // TODO: Implement a proper toast notification system
        console.log(`[${type.toUpperCase()}] ${message}`);
        if(type === 'error'){
            alert(`Error: ${message}`)
        }
    }

    /**
     * Escape HTML for security
     * @param {string} text - text to escape
     * @returns {string} escaped text
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * Initialize application
     */
    initialize() {
        this.stateManager.loadFromStorage();
        this.updateAllDisplays();
    }
}

window.UIController = UIController;
