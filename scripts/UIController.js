/**
 * UI Controller
 */
class UIController {
    constructor(stateManager, playerManager, eloCalculator, teamOptimizer) {
        this.stateManager = stateManager;
        this.playerManager = playerManager;
        this.eloCalculator = eloCalculator;
        this.teamOptimizer = teamOptimizer;
        
        this.currentTab = 'compare';
        this.isProcessing = false;
        this.currentTeams = null;
        
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
        const showEloRatingsCheckbox = document.getElementById('showEloRatings');
        const exportTeamsBtn = document.getElementById('exportTeamsBtn');
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.handleClearAll());
        }
        
        if (resetAllRatingsBtn) {
            resetAllRatingsBtn.addEventListener('click', () => this.handleResetAllRatings());
        }

        if (exportPlayersBtn) {
            exportPlayersBtn.addEventListener('click', () => this.handleExportPlayers());
        }

        if (showEloRatingsCheckbox) {
            showEloRatingsCheckbox.addEventListener('change', () => this.handleToggleEloDisplay());
        }

        if (exportTeamsBtn) {
            exportTeamsBtn.addEventListener('click', () => this.handleExportTeams());
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

    showResetPlayerModal(playerId) {
        const state = this.stateManager.getState();
        const player = state.players.find(p => p.id === playerId);
        
        if (!player) {
            this.showNotification('Player not found', 'error');
            return;
        }
    
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        const positionsOptions = player.positions
            .map(pos => {
                const rating = Math.round(player.ratings[pos]);
                const comparisons = player.comparisons[pos];
                
                return `
                    <label class="position-checkbox-label">
                        <input type="checkbox" name="resetPositions" value="${pos}" checked>
                        <span>
                            ${this.playerManager.positions[pos]} 
                            <span class="position-stats-inline">
                                (${rating} ELO, ${comparisons} comp.)
                            </span>
                        </span>
                    </label>
                `;
            }).join('');
    
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Reset Ratings - ${this.escapeHtml(player.name)}</h3>
                    <button class="btn btn-secondary modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Select positions to reset:</label>
                        <div class="positions-grid">
                            ${positionsOptions}
                        </div>
                        <div class="warning-box">
                            <div class="warning-title">⚠️ Warning</div>
                            <div class="warning-text">
                                This will reset ratings to 1500 and clear all comparison history for selected positions.
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close">Cancel</button>
                    <button class="btn btn-warning" id="confirmResetBtn">Reset Selected</button>
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
    
        modal.querySelector('#confirmResetBtn').addEventListener('click', () => {
            const selectedPositions = Array.from(modal.querySelectorAll('input[name="resetPositions"]:checked'))
                .map(cb => cb.value);
    
            if (selectedPositions.length === 0) {
                this.showNotification('Please select at least one position', 'error');
                return;
            }
    
            try {
                this.stateManager.resetPlayerPositions(player.id, selectedPositions);
                
                const posNames = selectedPositions.map(p => this.playerManager.positions[p]).join(', ');
                this.showNotification(
                    `Reset ${posNames} for "${player.name}"`, 
                    'success'
                );
                document.body.removeChild(modal);
            } catch (error) {
                this.showNotification(`Failed to reset: ${error.message}`, 'error');
            }
        });
    }
    
    showResetAllRatingsModal() {
        const state = this.stateManager.getState();
        
        if (state.players.length === 0) {
            this.showNotification('No players to reset', 'error');
            return;
        }
    
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        const positionStats = {};
        Object.keys(this.playerManager.positions).forEach(pos => {
            const players = this.playerManager.getPlayersForPosition(pos);
            const totalComparisons = players.reduce((sum, p) => sum + (p.comparisons[pos] || 0), 0);
            positionStats[pos] = {
                playerCount: players.length,
                comparisons: Math.floor(totalComparisons / 2)
            };
        });
    
        const positionsOptions = Object.entries(this.playerManager.positions)
            .filter(([pos]) => positionStats[pos].playerCount > 0)
            .map(([pos, name]) => {
                const stats = positionStats[pos];
                
                return `
                    <label class="position-checkbox-label">
                        <input type="checkbox" name="resetAllPositions" value="${pos}" checked>
                        <span>
                            ${name}
                            <span class="position-stats-inline">
                                (${stats.playerCount} players, ${stats.comparisons} comp.)
                            </span>
                        </span>
                    </label>
                `;
            }).join('');
    
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Reset All Ratings</h3>
                    <button class="btn btn-secondary modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Select positions to reset for ALL players:</label>
                        <div class="positions-grid">
                            ${positionsOptions}
                        </div>
                        <div class="warning-box warning-box-danger">
                            <div class="warning-title">⚠️ Warning</div>
                            <div class="warning-text">
                                This will reset ALL players' ratings to 1500 and clear ALL comparison history for selected positions. This action cannot be undone!
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close">Cancel</button>
                    <button class="btn btn-danger" id="confirmResetAllBtn">Reset All</button>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
    
        const confirmBtn = modal.querySelector('#confirmResetAllBtn');
    
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
    
        confirmBtn.addEventListener('click', () => {
            const selectedPositions = Array.from(modal.querySelectorAll('input[name="resetAllPositions"]:checked'))
                .map(cb => cb.value);
    
            if (selectedPositions.length === 0) {
                this.showNotification('Please select at least one position', 'error');
                return;
            }
    
            try {
                this.stateManager.resetAllPlayersPositions(selectedPositions);
                
                const posNames = selectedPositions.map(p => this.playerManager.positions[p]).join(', ');
                this.showNotification(
                    `Reset ${posNames} for all players`, 
                    'success'
                );
                document.body.removeChild(modal);
            } catch (error) {
                this.showNotification(`Failed to reset: ${error.message}`, 'error');
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

        this.stateManager.subscribe('playerPositionsReset', (data) => {
            const posNames = data.positions.map(p => this.playerManager.positions[p]).join(', ');
            this.showNotification(
                `Reset ${posNames} for ${data.player.name}`, 
                'success'
            );
        });
        
        this.stateManager.subscribe('allPlayersPositionsReset', (data) => {
            const posNames = data.positions.map(p => this.playerManager.positions[p]).join(', ');
            this.showNotification(
                `Reset ${posNames} for ${data.playersAffected} players`, 
                'success'
            );
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
            this.updatePositionProgressBars();
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
            
            const teamCount = parseInt(document.getElementById('teamCount')?.value) || 2;
            const composition = this.getTeamComposition();
            const state = this.stateManager.getState();
    
            if (Object.values(composition).every(count => count === 0)) {
                this.showNotification('Please select at least one player per team', 'error');
                this.isProcessing = false;
                return;
            }
    
            // Start animation
            await this.showOptimizationAnimation();
            
            const result = await this.teamOptimizer.optimizeTeams(
                composition, 
                teamCount, 
                state.players
            );
    
            this.currentTeams = result;
            this.displayOptimizedTeams(result);
            this.showTeamsControls();
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

    async showOptimizationAnimation() {
        const container = document.getElementById('teamsDisplay');
        if (!container) return;
    
        const steps = [
            { icon: '🔍', text: 'Analyzing players...', duration: 400 },
            { icon: '📊', text: 'Generating initial solutions...', duration: 500 },
            { icon: '🧬', text: 'Running Genetic Algorithm...', duration: 600 },
            { icon: '🔄', text: 'Executing Tabu Search...', duration: 500 },
            { icon: '🔥', text: 'Simulated Annealing...', duration: 600 },
            { icon: '✨', text: 'Local Search refinement...', duration: 400 },
            { icon: '⚖️', text: 'Finalizing teams...', duration: 400 }
        ];
    
        container.innerHTML = `
            <div class="optimization-animation">
                <div class="optimization-content">
                    <div class="optimization-current-step" id="optimizationCurrentStep"></div>
                    <div class="optimization-progress">
                        <div class="optimization-progress-bar" id="optimizationProgressBar"></div>
                    </div>
                </div>
            </div>
        `;
    
        const stepContainer = document.getElementById('optimizationCurrentStep');
        const progressBar = document.getElementById('optimizationProgressBar');
        
        const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
        let elapsed = 0;
    
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            // Replace step content
            stepContainer.innerHTML = `
                <div class="optimization-step active">
                    <div class="step-icon">${step.icon}</div>
                    <div class="step-text">${step.text}</div>
                    <div class="step-spinner"></div>
                </div>
            `;
    
            // Update progress
            elapsed += step.duration;
            const progress = (elapsed / totalDuration) * 100;
            progressBar.style.width = progress + '%';
    
            // Wait
            await new Promise(resolve => setTimeout(resolve, step.duration));
    
            // Mark as complete briefly
            const stepEl = stepContainer.querySelector('.optimization-step');
            stepEl.classList.remove('active');
            stepEl.classList.add('complete');
            stepEl.querySelector('.step-spinner').innerHTML = '✓';
            
            // Brief pause
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }

    displayOptimizedTeams(result) {
        const container = document.getElementById('teamsDisplay');
        if (!container) return;
    
        const showElo = document.getElementById('showEloRatings')?.checked !== false;
        let html = '';
    
        result.teams.forEach((team, index) => {
            const teamStats = this.eloCalculator.calculateTeamStrength(team);
            
            html += `
                <div class="team">
                    <h3>
                        Team ${index + 1}
                        <span class="team-stats-header ${showElo ? '' : 'hidden'}">
                            (${teamStats.totalRating} ELO, avg ${teamStats.averageRating})
                        </span>
                    </h3>
                    <div class="team-player-count">
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
                        <div class="team-player-rating ${showElo ? '' : 'hidden'}">${Math.round(rating)}</div>
                    </div>
                `;
            });
    
            html += '</div>';
        });
    
        container.innerHTML = html;
    }
    
    handleResetAllRatings() {
        this.showResetAllRatingsModal();
    }

    handleToggleEloDisplay() {
        if (!this.currentTeams) return;
        this.displayOptimizedTeams(this.currentTeams);
    }

    handleExportTeams() {
        if (!this.currentTeams) {
            this.showNotification('No teams to export', 'error');
            return;
        }

        try {
            const showElo = document.getElementById('showEloRatings')?.checked !== false;
            const lines = [];
            
            // Header
            const header = showElo ? 
                ['Team', 'Player', 'Position', 'ELO Rating'] : 
                ['Team', 'Player', 'Position'];
            lines.push(header.join(','));

            // Team data
            this.currentTeams.teams.forEach((team, teamIndex) => {
                team.forEach(player => {
                    const displayPosition = player.assignedPosition || player.positions[0];
                    const rating = player.ratings[displayPosition] || player.rating || 1500;
                    const positionName = this.playerManager.positions[displayPosition];
                    
                    const row = [
                        `Team ${teamIndex + 1}`,
                        `"${player.name.replace(/"/g, '""')}"`,
                        positionName
                    ];
                    
                    if (showElo) {
                        row.push(Math.round(rating));
                    }
                    
                    lines.push(row.join(','));
                });
            });

            // Add team statistics
            lines.push('');
            lines.push('Team Statistics');
            lines.push('Team,Total ELO,Average ELO,Players');
            
            this.currentTeams.teams.forEach((team, teamIndex) => {
                const teamStats = this.eloCalculator.calculateTeamStrength(team);
                lines.push([
                    `Team ${teamIndex + 1}`,
                    teamStats.totalRating,
                    teamStats.averageRating,
                    team.length
                ].join(','));
            });

            const csv = lines.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `volleyrank-teams-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showNotification('Teams exported successfully!', 'success');
        } catch (error) {
            this.showNotification(`Export failed: ${error.message}`, 'error');
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
        this.updatePositionProgressBars();
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
    
        const positionOrder = ['S', 'OPP', 'OH', 'MB', 'L'];
        const sortedPlayers = [...state.players].sort((a, b) => {
            // Compare positions in order
            const maxLength = Math.max(a.positions.length, b.positions.length);
            for (let i = 0; i < maxLength; i++) {
                const posA = a.positions[i];
                const posB = b.positions[i];
                
                // If one player has fewer positions, they come after
                if (!posA) return 1;
                if (!posB) return -1;
                
                const indexA = positionOrder.indexOf(posA);
                const indexB = positionOrder.indexOf(posB);
                
                if (indexA !== indexB) {
                    return indexA - indexB;
                }
            }
            
            // If all positions are equal, sort by name
            return a.name.localeCompare(b.name);
        });
        
        let html = '';
        sortedPlayers.forEach(player => {
            // Format positions as tiles
            let positionsTiles = '';
            player.positions.forEach(pos => {
                const rating = Math.round(player.ratings[pos]);
                const comparisons = player.comparisons[pos];
                positionsTiles += `
                    <div class="position-tile">
                        <div class="position-tile-name">${this.playerManager.positions[pos]}</div>
                        <div class="position-tile-stats">
                            <span class="position-tile-rating">${rating}</span> ELO
                            <span class="position-tile-comparisons">${comparisons} comp.</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                <div class="player-item">
                    <div class="player-content-wrapper">
                        <div class="player-header-row">
                            <h3 class="player-name-header">
                                ${this.escapeHtml(player.name)}
                                ${player.positions.length > 1 ? 
                                    '<span class="multi-position-badge">Multi-pos</span>' : ''
                                }
                            </h3>
                        </div>
                        
                        <div class="player-positions-grid">
                            ${positionsTiles}
                        </div>
                        
                        <div class="player-actions">
                            <button class="btn btn-secondary" onclick="uiController.handleEditPlayerPositions(${player.id})">
                                Edit
                            </button>
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

    handleResetPlayer(playerId) {
        this.showResetPlayerModal(playerId);
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
                <div class="position-stat-card">
                    <div class="position-stat-number">${positionStats.canPlay}</div>
                    <div class="position-stat-label">${name}s</div>
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
                            <div class="ranking-stats">
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

    updatePositionProgressBars() {
        const container = document.getElementById('positionProgressBars');
        if (!container) return;

        const positions = ['S', 'OPP', 'OH', 'MB', 'L'];
        let html = '<h3 class="position-progress-title">Position Progress</h3>';

        positions.forEach(pos => {
            const players = this.playerManager.getPlayersForPosition(pos);
            
            if (players.length < 2) {
                html += `
                    <div class="position-progress-item disabled">
                        <div class="position-progress-header">
                            <span>${this.playerManager.positions[pos]}</span>
                            <span class="not-enough-players">Need 2+ players</span>
                        </div>
                    </div>
                `;
                return;
            }

            const totalPairs = (players.length * (players.length - 1)) / 2;
            const comparedPairs = new Set();
            
            players.forEach(player => {
                const comparedWith = player.comparedWith[pos] || [];
                comparedWith.forEach(opponentName => {
                    const pair = [player.name, opponentName].sort().join('|');
                    comparedPairs.add(pair);
                });
            });
            
            const completed = comparedPairs.size;
            const percentage = Math.round((completed / totalPairs) * 100);
            
            html += `
                <div class="position-progress-item">
                    <div class="position-progress-header">
                        <span>${this.playerManager.positions[pos]}</span>
                        <span>${completed}/${totalPairs} (${percentage}%)</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
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
            this.updatePositionProgressBars();
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
                this.updatePositionProgressBars();
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
            this.updatePositionProgressBars();
            return;
        }

        const [player1, player2] = status.nextPair;
        this.stateManager.setCurrentPair(status.nextPair, selectedPosition);
        this.displayComparisonPair(player1, player2, selectedPosition);
        this.updateComparisonStats(selectedPosition);
        this.updatePositionProgressBars();
    }

    displayComparisonPair(player1, player2, selectedPosition) {
        const container = document.getElementById('comparisonContainer');
        container.innerHTML = `
            <div class="comparison-info">
                Comparing at: <strong>${this.playerManager.positions[selectedPosition]}</strong>
            </div>
            <div class="comparison-area">
                <div class="player-card" onclick="uiController.handlePlayerComparison(${player1.id}, ${player2.id}, '${selectedPosition}')">
                    <div class="player-avatar player-avatar-blue">
                        ${player1.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="player-name">${this.escapeHtml(player1.name)}</div>
                    <div class="player-position">${this.playerManager.positions[selectedPosition]}</div>
                    <div class="player-rating">${Math.round(player1.ratings[selectedPosition])} ELO</div>
                    <div class="player-comparisons">
                        Comparisons: ${player1.comparisons[selectedPosition]}
                    </div>
                </div>
                <div class="vs-divider">VS</div>
                <div class="player-card" onclick="uiController.handlePlayerComparison(${player2.id}, ${player1.id}, '${selectedPosition}')">
                    <div class="player-avatar player-avatar-purple">
                        ${player2.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="player-name">${this.escapeHtml(player2.name)}</div>
                    <div class="player-position">${this.playerManager.positions[selectedPosition]}</div>
                    <div class="player-rating">${Math.round(player2.ratings[selectedPosition])} ELO</div>
                    <div class="player-comparisons">
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
            
            // Calculate progress
            const totalPossiblePairs = (players.length * (players.length - 1)) / 2;
            const comparedPairs = new Set();
            
            players.forEach(player => {
                const comparedWith = player.comparedWith[position] || [];
                comparedWith.forEach(opponentName => {
                    const pair = [player.name, opponentName].sort().join('|');
                    comparedPairs.add(pair);
                });
            });
            
            const completedComparisons = comparedPairs.size;
            const remainingComparisons = totalPossiblePairs - completedComparisons;
            const progressPercentage = totalPossiblePairs > 0 ? 
                Math.round((completedComparisons / totalPossiblePairs) * 100) : 0;
            
            container.innerHTML = `
                <div class="comparison-stats-progress">
                    <div class="comparison-stats-header">
                        <span class="comparison-stats-label">
                            ${this.playerManager.positions[position]} Progress
                        </span>
                        <span class="comparison-stats-value">
                            ${completedComparisons} / ${totalPossiblePairs} comparisons
                        </span>
                    </div>
                    <div class="comparison-progress-bar">
                        <div class="comparison-progress-fill" style="width: ${progressPercentage}%;"></div>
                    </div>
                    <div class="comparison-stats-remaining">
                        ${remainingComparisons > 0 ? 
                            `${remainingComparisons} comparison${remainingComparisons === 1 ? '' : 's'} remaining` : 
                            'All pairs compared!'
                        }
                    </div>
                </div>
                <div class="comparison-stats-total">
                    Players: ${players.length} • Total comparisons across all positions: ${state.comparisons}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="comparison-stats-total">
                    Total comparisons: ${state.comparisons}
                </div>
            `;
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
        
        this.currentTeams = null;
        this.hideTeamsControls();
    }

    showTeamsControls() {
        const controls = document.getElementById('teamsControls');
        if (controls) {
            controls.classList.remove('hidden');
        }
    }

    hideTeamsControls() {
        const controls = document.getElementById('teamsControls');
        if (controls) {
            controls.classList.add('hidden');
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
