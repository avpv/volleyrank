/**
 * UI Controller with multiple position ratings support
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

    initializeEventListeners() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleTabClick(e));
        });

        this.initializeMultiplePositionSelectors();

        const playerNameInput = document.getElementById('playerName');
        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleAddPlayer();
                }
            });
        }

        const positionFilter = document.getElementById('positionFilter');
        if (positionFilter) {
            positionFilter.addEventListener('change', () => this.handlePositionChange());
        }

        const optimizeTeamsBtn = document.getElementById('optimizeTeamsBtn');
        const teamCountInput = document.getElementById('teamCount');
        
        if (optimizeTeamsBtn) {
            optimizeTeamsBtn.addEventListener('click', () => this.handleOptimizeTeams());
        }
        
        if (teamCountInput) {
            teamCountInput.addEventListener('input', () => this.updatePlayersPerTeam());
        }

        document.querySelectorAll('.composition-input').forEach(input => {
            input.addEventListener('input', () => this.updatePlayersPerTeam());
        });

        const clearAllBtn = document.getElementById('clearAllBtn');
        const resetAllRatingsBtn = document.getElementById('resetAllRatingsBtn');
        const exportPlayersBtn = document.getElementById('exportPlayersBtn');
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.handleClearAll());
        }
        
        if (resetAllRatingsBtn) {
            resetAllRatingsBtn.addEventListener('click', () => this.handleResetAllRatings());
        }

        if (exportPlayersBtn) {
            exportPlayersBtn.addEventListener('click', () => this.handleExportPlayers());
        }

        setTimeout(() => this.initializeImportModalHandlers(), 100);
    }

    initializeMultiplePositionSelectors() {
        const addPlayerBtn = document.getElementById('addPlayerBtn');
        if (addPlayerBtn) {
            const newBtn = addPlayerBtn.cloneNode(true);
            addPlayerBtn.parentNode.replaceChild(newBtn, addPlayerBtn);
            newBtn.addEventListener('click', () => this.handleAddPlayer());
        }
    }

    handleAddPlayer() {
        if (this.isProcessing) return;

        const nameInput = document.getElementById('playerName');
        const name = nameInput?.value || '';
        const selectedPositions = this.getSelectedPositions();
        
        if (selectedPositions.length === 0) {
            this.showNotification('Please select at least one position', 'error');
            return;
        }

        try {
            const validation = this.playerManager.validatePlayer(name, selectedPositions);
            
            if (!validation.isValid) {
                this.showNotification(validation.errors.join(', '), 'error');
                return;
            }

            this.stateManager.addPlayer(validation.sanitizedName, validation.sanitizedPositions);
            
            nameInput.value = '';
            this.clearPositionSelection();
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    getSelectedPositions() {
        const checkboxes = document.querySelectorAll('input[name="playerPositions"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    clearPositionSelection() {
        const checkboxes = document.querySelectorAll('input[name="playerPositions"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    handleEditPlayerPositions(playerId) {
        const state = this.stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) {
            this.showNotification('Player not found', 'error');
            return;
        }

        this.showEditPositionsModal(player);
    }

    showEditPositionsModal(player) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        const positionsOptions = Object.entries(this.playerManager.positions)
            .map(([key, name]) => {
                const isChecked = player.positions && player.positions.includes(key);
                
                return `
                    <label class="position-checkbox-label">
                        <input type="checkbox" name="editPositions" value="${key}" 
                               ${isChecked ? 'checked' : ''}>
                        <span>${name}</span>
                    </label>
                `;
            }).join('');

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Positions - ${this.escapeHtml(player.name)}</h3>
                    <button class="btn btn-secondary modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Positions (select all applicable):</label>
                        <div class="positions-grid">
                            ${positionsOptions}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close">Cancel</button>
                    <button class="btn btn-primary" id="savePositionsBtn">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        modal.querySelector('#savePositionsBtn').addEventListener('click', () => {
            const selectedPositions = Array.from(modal.querySelectorAll('input[name="editPositions"]:checked'))
                .map(cb => cb.value);

            if (selectedPositions.length === 0) {
                this.showNotification('Please select at least one position', 'error');
                return;
            }

            try {
                this.stateManager.updatePlayerPositions(player.id, selectedPositions);
                this.showNotification(`Positions for "${player.name}" updated successfully`, 'success');
                document.body.removeChild(modal);
            } catch (error) {
                this.showNotification(`Failed to update positions: ${error.message}`, 'error');
            }
        });
    }

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
            const posName = this.playerManager.positions[data.position];
            this.showNotification(
                `${data.winner.name} defeats ${data.loser.name} at ${posName}! Ratings updated.`, 
                'success'
            );
        });

        this.stateManager.subscribe('dataMigrated', (data) => {
            this.showNotification(
                `${data.message}. Updated ${data.playersUpdated} players.`, 
                'success'
            );
        });
    }

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

    switchTab(tabName, targetElement) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        targetElement.classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        this.currentTab = tabName;
        
        if (tabName === 'rankings') {
            this.updateRankingsDisplay();
        } else if (tabName === 'compare') {
            this.updateComparisonDisplay();
        }
    }

    handlePositionChange() {
        // Clear cached pair when position changes
        this.stateManager.updateState({ currentPair: null });
        this.updateComparisonDisplay();
    }

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

    getTeamComposition() {
        const composition = {};
        const positions = ['S', 'OPP', 'OH', 'MB', 'L'];
        
        positions.forEach(pos => {
            const input = document.getElementById(`comp_${pos}`);
            composition[pos] = parseInt(input?.value) || 0;
        });
        
        return composition;
    }

    showTeamOptimizationProgress(message) {
        const container = document.getElementById('teamsDisplay');
        if (container) {
            container.innerHTML = `
                <div class="no-comparison" style="color: var(--text-secondary);">
                    ${message}
                </div>
            `;
        }
    }

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

            team.forEach(player => {
                const displayPosition = player.assignedPosition || player.positions[0];
                const rating = player.ratings[displayPosition] || player.rating || 1500;
                
                html += `
                    <div class="team-player">
                        <div class="team-player-info">
                            <div class="team-player-name">${this.escapeHtml(player.name)}</div>
                            <div class="team-player-position">
                                ${this.playerManager.positions[displayPosition]}
                            </div>
                        </div>
                        <div class="team-player-rating">${Math.round(rating)}</div>
                    </div>
                `;
            });

            html += '</div>';
        });

        container.innerHTML = html;
    }

    handleResetAllRatings() {
        if (!confirm('Are you sure you want to reset ALL ratings for ALL positions for ALL players?')) {
            return;
        }

        try {
            const state = this.stateManager.getState();
            state.players.forEach(player => {
                this.stateManager.resetPlayer(player.id);
            });

            this.stateManager.updateState({ 
                comparisons: 0,
                currentPair: null
            });

            this.showNotification('All player ratings reset to default', 'success');
            
        } catch (error) {
            this.showNotification(`Failed to reset ratings: ${error.message}`, 'error');
        }
    }

    handleClearAll() {
        if (!confirm('Are you sure you want to delete all players? This cannot be undone!')) {
            return;
        }

        try {
            this.stateManager.clearAllData();
            this.clearAllDisplays();
            this.showNotification('All data cleared', 'success');
        } catch (error) {
            this.showNotification(`Failed to clear data: ${error.message}`, 'error');
        }
    }

    updateAllDisplays() {
        this.updatePlayersListDisplay();
        this.updateRankingsDisplay();
        this.updateComparisonDisplay();
        this.updatePlayersPerTeam();
        this.updatePositionStats();
    }

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
            
            // Format positions with ratings
            let positionsDisplay = '';
            player.positions.forEach(pos => {
                const rating = player.ratings[pos];
                const comparisons = player.comparisons[pos];
                positionsDisplay += `<div style="margin: 0.25rem 0;">
                    <strong>${this.playerManager.positions[pos]}:</strong> ${Math.round(rating)} ELO (${comparisons} comparisons)
                </div>`;
            });
            
            html += `
                <div class="player-item">
                    <div class="player-content-wrapper">
                        <div class="player-name-header">
                            ${this.escapeHtml(player.name)}
                            ${player.positions.length > 1 ? 
                                '<span class="multi-position-badge">Multi-pos</span>' : ''
                            }
                        </div>
                        
                        <div class="player-info-item">
                            <strong>Positions & Ratings</strong>
                            ${positionsDisplay}
                        </div>
                    </div>
                    
                    <div class="player-actions">
                        <button class="btn btn-secondary" onclick="uiController.handleEditPlayerPositions(${player.id})">
                            Edit Positions
                        </button>
                        <button class="btn btn-warning" onclick="uiController.handleResetPlayer(${player.id})">
                            Reset
                        </button>
                        <button class="btn btn-danger" onclick="uiController.handleRemovePlayer(${player.id})">
                            Remove
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    handleResetPlayer(playerId) {
        const state = this.stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) {
            this.showNotification('Player not found', 'error');
            return;
        }

        if (!confirm(`Reset all ratings for "${player.name}"?`)) {
            return;
        }

        this.stateManager.resetPlayer(playerId);
    }

    handleRemovePlayer(playerId) {
        const state = this.stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) {
            this.showNotification('Player not found', 'error');
            return;
        }

        if (!confirm(`Delete player "${player.name}"?`)) {
            return;
        }

        this.stateManager.removePlayer(playerId);
    }

    updatePositionStats() {
        const container = document.getElementById('playersStats');
        if (!container) return;

        const stats = this.playerManager.getPositionStats();
        let html = '';

        Object.entries(this.playerManager.positions).forEach(([pos, name]) => {
            const positionStats = stats[pos] || { canPlay: 0 };
            
            html += `
                <div style="text-align: center; padding: 0.5rem;">
                    <div style="font-weight: 600; font-size: 1.2rem;">${positionStats.canPlay}</div>
                    <div style="font-size: 0.9rem; color:var(--text-secondary);">${name}s</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

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
                const rating = player.ratings[position];
                const comparisons = player.comparisons[position];
                
                html += `
                    <div class="ranking-item">
                        <div class="rank-number ${rankClass}">${index + 1}</div>
                        <div class="player-info">
                            <div>${this.escapeHtml(player.name)}</div>
                            <div style="color:var(--text-secondary); font-size: 0.9rem;">
                                ${Math.round(rating)} ELO (${comparisons} comparisons)
                            </div>
                        </div>
                    </div>
                `;
            });
            
            positionDiv.innerHTML = html;
            container.appendChild(positionDiv);
        });
    }

    updateComparisonDisplay() {
        const positionSelect = document.getElementById('positionFilter');
        const container = document.getElementById('comparisonContainer');
        
        if (!positionSelect || !container) return;

        const selectedPosition = positionSelect.value;
        const state = this.stateManager.getState();
        
        if (!selectedPosition) {
            container.innerHTML = `
                <div class="no-comparison">
                    Select a position to start comparing players
                </div>
            `;
            this.updateComparisonStats('');
            return;
        }

        // Check if we have cached pair for this position
        if (state.currentPair && state.currentComparisonPosition === selectedPosition) {
            const [player1, player2] = state.currentPair;
            // Verify players still exist and can play this position
            const p1Valid = state.players.find(p => p.id === player1.id)?.positions?.includes(selectedPosition);
            const p2Valid = state.players.find(p => p.id === player2.id)?.positions?.includes(selectedPosition);
            
            if (p1Valid && p2Valid) {
                // Use cached pair
                this.displayComparisonPair(player1, player2, selectedPosition);
                this.updateComparisonStats(selectedPosition);
                return;
            }
        }

        // Find new pair only if no valid cached pair
        const status = this.playerManager.getPositionComparisonStatus(selectedPosition);
        
        if (!status.canCompare) {
            let message = status.reason;
            if (status.allPairsCompared) {
                message = 'All possible pairs compared for this position!';
            }
            
            container.innerHTML = `<div class="no-comparison">${message}</div>`;
            this.updateComparisonStats(selectedPosition);
            return;
        }

        const [player1, player2] = status.nextPair;
        this.stateManager.setCurrentPair(status.nextPair, selectedPosition);
        this.displayComparisonPair(player1, player2, selectedPosition);
        this.updateComparisonStats(selectedPosition);
    }

    displayComparisonPair(player1, player2, selectedPosition) {
        const container = document.getElementById('comparisonContainer');
        container.innerHTML = `
            <div class="comparison-info" style="text-align: center; margin-bottom: 1rem;">
                Comparing at: <strong>${this.playerManager.positions[selectedPosition]}</strong>
            </div>
            <div class="comparison-area">
                <div class="player-card" onclick="uiController.handlePlayerComparison(${player1.id}, ${player2.id}, '${selectedPosition}')">
                    <div class="player-avatar" style="background:linear-gradient(135deg, #2563eb, #3b82f6);">
                        ${player1.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="player-name">${this.escapeHtml(player1.name)}</div>
                    <div class="player-position">${this.playerManager.positions[selectedPosition]}</div>
                    <div class="player-rating">${Math.round(player1.ratings[selectedPosition])} ELO</div>
                    <div style="font-size: 0.9em; color:var(--text-secondary); margin-top: 5px;">
                        Comparisons: ${player1.comparisons[selectedPosition]}
                    </div>
                </div>
                <div class="vs-divider">VS</div>
                <div class="player-card" onclick="uiController.handlePlayerComparison(${player2.id}, ${player1.id}, '${selectedPosition}')">
                    <div class="player-avatar" style="background:linear-gradient(135deg, #a855f7, #ec4899);">
                        ${player2.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="player-name">${this.escapeHtml(player2.name)}</div>
                    <div class="player-position">${this.playerManager.positions[selectedPosition]}</div>
                    <div class="player-rating">${Math.round(player2.ratings[selectedPosition])} ELO</div>
                    <div style="font-size: 0.9em; color:var(--text-secondary); margin-top: 5px;">
                        Comparisons: ${player2.comparisons[selectedPosition]}
                    </div>
                </div>
            </div>
        `;
    }

    handlePlayerComparison(winnerId, loserId, position) {
        if (this.isProcessing) return;

        try {
            this.isProcessing = true;
            
            // Delay before updating to allow smooth animation
            setTimeout(() => {
                this.stateManager.updateRatingsAfterComparison(winnerId, loserId, position);
                this.isProcessing = false;
            }, 300);
            
        } catch (error) {
            this.showNotification(`Failed to process comparison: ${error.message}`, 'error');
            this.isProcessing = false;
        }
    }

    updateComparisonStats(position) {
        const container = document.getElementById('comparisonStats');
        if (!container) return;

        const state = this.stateManager.getState();
        
        if (position) {
            const players = this.playerManager.getPlayersForPosition(position);
            container.innerHTML = `
                Players for ${this.playerManager.positions[position]}: ${players.length}<br>
                Total comparisons: ${state.comparisons}
            `;
        } else {
            container.innerHTML = `Total comparisons: ${state.comparisons}`;
        }
    }

    updatePlayersPerTeam() {
        const element = document.getElementById('playersPerTeam');
        if (!element) return;

        const composition = this.getTeamComposition();
        const total = Object.values(composition).reduce((sum, count) => sum + count, 0);
        element.textContent = total;
    }

    showImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.style.display = 'flex';
            this.handleImportMethodChange();
        }
    }

    hideImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) modal.style.display = 'none';
    }

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
            
            this.showNotification('Template downloaded!', 'success');
        } catch (error) {
            this.showNotification(`Download failed: ${error.message}`, 'error');
        }
    }

    async handleExecuteImport() {
        const method = document.getElementById('importMethod')?.value;
        let data = '';
        let format = 'auto';

        try {
            if (method === 'file') {
                const fileInput = document.getElementById('importFileInput');
                const file = fileInput?.files[0];
                
                if (!file) {
                    this.showNotification('Please select a file', 'error');
                    return;
                }

                data = await this.readFileAsText(file);
                format = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
                
            } else if (method === 'paste') {
                const textarea = document.getElementById('importDataTextarea');
                data = textarea?.value?.trim() || '';
                
                if (!data) {
                    this.showNotification('Please paste data', 'error');
                    return;
                }
            }

            const result = this.stateManager.importPlayers(data, format);
            
            // Always close modal after import attempt
            // Result can be checked - if success is true or if imported > 0
            if (result && (result.success === true || result.imported > 0)) {
                this.hideImportModal();
                
                // Clear inputs
                const fileInput = document.getElementById('importFileInput');
                const textarea = document.getElementById('importDataTextarea');
                if (fileInput) fileInput.value = '';
                if (textarea) textarea.value = '';
            }

        } catch (error) {
            this.showNotification(`Import failed: ${error.message}`, 'error');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    clearAllDisplays() {
        const containers = ['playersList', 'rankingsContainer', 'comparisonContainer', 'teamsDisplay'];
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

    clearTeamsDisplay() {
        const container = document.getElementById('teamsDisplay');
        if (container) {
            container.innerHTML = '';
        }
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        if(type === 'error'){
            alert(`Error: ${message}`)
        }
    }

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

    initialize() {
        this.stateManager.loadFromStorage();
        this.updateAllDisplays();
    }
}

window.UIController = UIController;
