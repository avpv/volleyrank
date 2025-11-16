// src/components/GoogleSheetsSection.js

/**
 * GoogleSheetsSection Component - Google Sheets integration UI and logic
 *
 * Features:
 * - Connect/disconnect Google account
 * - Export players to Google Sheets
 * - Import players from Google Sheets
 * - Manage spreadsheet ID
 */

import Component from './base/Component.js';
import { getIcon } from './base/Icons.js';
import storage from '../core/StorageAdapter.js';
import toast from './base/Toast.js';
import GoogleSheetsIntegration from '../integrations/GoogleSheetsIntegration.js';
import integrationsConfig from '../config/integrations.js';
import uiConfig from '../config/ui.js';
import { STORAGE_KEYS } from '../utils/constants.js';

const { ELEMENT_IDS, TOAST } = uiConfig;

class GoogleSheetsSection extends Component {
    constructor(container, props = {}) {
        super(container, props);

        this.playerService = props.playerService;

        // Google Sheets integration
        this.googleSheetsIntegration = null;
        this.googleSheetsEnabled = integrationsConfig.googleSheets.enabled;
        this.googleSheetsSpreadsheetId = storage.get('googleSheetsSpreadsheetId', '');

        // Initialize Google Sheets if enabled
        if (this.googleSheetsEnabled && integrationsConfig.googleSheets.clientId) {
            this.googleSheetsIntegration = new GoogleSheetsIntegration(
                integrationsConfig.googleSheets.clientId
            );
        }
    }

    /**
     * Get current activity from storage
     * Always fetch fresh value to ensure it's up to date
     */
    getCurrentActivity() {
        return storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);
    }

    onMount() {
        this.attachEventListeners();
    }

    onUpdate() {
        this.attachEventListeners();
    }

    render() {
        return `
            <div class="player-section google-sheets-section" id="${ELEMENT_IDS.GOOGLE_SHEETS_SECTION}">
                <h4 class="section-title">Google Sheets Integration</h4>
                <div class="section-content">
                    ${this.renderContent()}
                </div>
            </div>
        `;
    }

    renderContent() {
        if (!this.googleSheetsEnabled || !integrationsConfig.googleSheets.clientId) {
            return this.renderSetupNotice();
        }

        const isConnected = this.googleSheetsIntegration?.checkAuthorization() || false;

        return `
            <div class="google-sheets-content">
                <!-- Connection Status -->
                <div class="connection-status">
                    <div
                        class="status-indicator ${isConnected ? 'connected' : 'disconnected'}"
                        id="${ELEMENT_IDS.GOOGLE_SHEETS_STATUS}"
                        role="status"
                        aria-live="polite"
                        aria-label="${isConnected ? 'Google Sheets connection status: connected' : 'Google Sheets connection status: disconnected'}">
                        ${isConnected
                            ? `${getIcon('check-circle', { size: 16 })} <span>Connected to Google Sheets</span>`
                            : `${getIcon('x-circle', { size: 16 })} <span>Not connected</span>`
                        }
                    </div>
                </div>

                ${!isConnected ? this.renderConnectSection() : this.renderExportImportSection()}
            </div>
        `;
    }

    renderSetupNotice() {
        return `
            <div class="setup-notice">
                <div class="setup-icon">
                    ${getIcon('file-text', { size: 24 })}
                </div>
                <div class="setup-content">
                    <h4 class="setup-title">Enable Google Sheets Integration</h4>
                    <p class="setup-description">
                        Connect your TeamBalance data with Google Sheets for easy sharing and collaboration.
                    </p>
                    <details class="setup-instructions">
                        <summary>View setup instructions</summary>
                        <ol>
                            <li>Set up Google Sheets API credentials</li>
                            <li>Update the configuration in <code>src/config/integrations.js</code></li>
                            <li>Set <code>enabled: true</code> and add your Client ID</li>
                        </ol>
                        <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" class="setup-link">
                            Get started with Google Cloud Console →
                        </a>
                    </details>
                </div>
            </div>
        `;
    }

    renderConnectSection() {
        const currentActivity = this.getCurrentActivity();
        return `
            <!-- Connect Section -->
            <div class="connect-section">
                <div class="connect-prompt">
                    <p class="prompt-text">
                        Sync your player roster with Google Sheets for easy collaboration and sharing.
                    </p>
                    <ul class="feature-list">
                        <li>
                            ${getIcon('check', { size: 16, className: 'check-icon' })}
                            <span>Export player data with ratings</span>
                        </li>
                        <li>
                            ${getIcon('check', { size: 16, className: 'check-icon' })}
                            <span>Import players from spreadsheets</span>
                        </li>
                        <li>
                            ${getIcon('check', { size: 16, className: 'check-icon' })}
                            <span>Keep data synced across devices</span>
                        </li>
                    </ul>
                </div>
                <button
                    type="button"
                    class="btn btn-primary btn-lg"
                    id="${ELEMENT_IDS.GOOGLE_SHEETS_CONNECT_BTN}"
                    aria-describedby="connect-help-text"
                    ${!currentActivity ? 'disabled' : ''}>
                    ${getIcon('link', { size: 16, className: 'btn-icon' })}
                    <span>Connect Google Account</span>
                </button>
                ${!currentActivity ? `<p id="connect-help-text" class="form-help-text" style="margin-top: var(--spacing-3);"><span class="help-secondary">Please select an activity first</span></p>` : ''}
            </div>
        `;
    }

    renderExportImportSection() {
        const currentActivity = this.getCurrentActivity();
        return `
            <!-- Export/Import Section -->
            <div class="export-import-section">
                <div class="google-sheets-actions">
                    <div class="action-group">
                        <button
                            type="button"
                            class="btn btn-primary"
                            id="${ELEMENT_IDS.GOOGLE_SHEETS_EXPORT_BTN}"
                            aria-label="Export players to Google Sheets"
                            ${!currentActivity ? 'disabled' : ''}>
                            ${getIcon('upload', { size: 16, className: 'btn-icon' })}
                            <span>Export Players</span>
                        </button>
                        <button
                            type="button"
                            class="btn btn-secondary"
                            id="${ELEMENT_IDS.GOOGLE_SHEETS_IMPORT_BTN}"
                            aria-label="Import players from Google Sheets"
                            ${!currentActivity ? 'disabled' : ''}>
                            ${getIcon('download', { size: 16, className: 'btn-icon' })}
                            <span>Import Players</span>
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="${ELEMENT_IDS.GOOGLE_SHEETS_SPREADSHEET_ID}" class="label-with-hint">
                        <span class="label-text">Spreadsheet Link</span>
                        <span class="label-hint">(optional)</span>
                    </label>
                    <input
                        type="text"
                        id="${ELEMENT_IDS.GOOGLE_SHEETS_SPREADSHEET_ID}"
                        class="form-control"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value="${this.escape(this.googleSheetsSpreadsheetId)}"
                        aria-describedby="spreadsheet-help-text"
                        ${!currentActivity ? 'disabled' : ''}>
                    <div id="spreadsheet-help-text" class="form-help-text">
                        <span class="help-primary">Leave empty to create a new spreadsheet</span>
                        <span class="help-secondary">Paste the full URL or just the ID to use an existing one</span>
                    </div>
                </div>

                <div class="disconnect-section">
                    <button
                        type="button"
                        class="btn btn-link"
                        id="${ELEMENT_IDS.GOOGLE_SHEETS_DISCONNECT_BTN}"
                        aria-label="Disconnect from Google Sheets">
                        ${getIcon('log-out', { size: 16, className: 'btn-icon' })}
                        <span>Disconnect Google Sheets</span>
                    </button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const googleSheetsConnectBtn = this.$(`#${ELEMENT_IDS.GOOGLE_SHEETS_CONNECT_BTN}`);
        const googleSheetsDisconnectBtn = this.$(`#${ELEMENT_IDS.GOOGLE_SHEETS_DISCONNECT_BTN}`);
        const googleSheetsExportBtn = this.$(`#${ELEMENT_IDS.GOOGLE_SHEETS_EXPORT_BTN}`);
        const googleSheetsImportBtn = this.$(`#${ELEMENT_IDS.GOOGLE_SHEETS_IMPORT_BTN}`);

        if (googleSheetsConnectBtn) {
            googleSheetsConnectBtn.addEventListener('click', () => this.handleConnect());
        }

        if (googleSheetsDisconnectBtn) {
            googleSheetsDisconnectBtn.addEventListener('click', () => this.handleDisconnect());
        }

        if (googleSheetsExportBtn) {
            googleSheetsExportBtn.addEventListener('click', () => this.handleExport());
        }

        if (googleSheetsImportBtn) {
            googleSheetsImportBtn.addEventListener('click', () => this.handleImport());
        }
    }

    async handleConnect() {
        if (!this.googleSheetsIntegration) {
            toast.error('Google Sheets integration is not initialized');
            return;
        }

        try {
            toast.info('Connecting to Google Sheets...', { duration: TOAST.MEDIUM_DURATION });
            await this.googleSheetsIntegration.authorize();
            toast.success('Successfully connected to Google Sheets!');
            this.update();
        } catch (error) {
            console.error('Failed to connect to Google Sheets:', error);
            toast.error('Failed to connect: ' + error.message);
        }
    }

    handleDisconnect() {
        if (!this.googleSheetsIntegration) {
            return;
        }

        this.googleSheetsIntegration.revokeAuthorization();
        this.googleSheetsSpreadsheetId = '';
        storage.set('googleSheetsSpreadsheetId', '');
        toast.success('Disconnected from Google Sheets');
        this.update();
    }

    async handleExport() {
        if (!this.googleSheetsIntegration) {
            toast.error('Google Sheets integration is not initialized');
            return;
        }

        const currentActivity = this.getCurrentActivity();
        if (!currentActivity) {
            toast.error('Please select an activity first');
            return;
        }

        try {
            // Get spreadsheet ID from input
            const spreadsheetInput = this.$(`#${ELEMENT_IDS.GOOGLE_SHEETS_SPREADSHEET_ID}`);
            let spreadsheetId = spreadsheetInput?.value.trim() || '';

            // Extract ID from URL if full URL was provided
            if (spreadsheetId) {
                const extractedId = this.googleSheetsIntegration.extractSpreadsheetId(spreadsheetId);
                spreadsheetId = extractedId || spreadsheetId;
            }

            // Get players and positions
            const players = this.playerService.getAll();
            if (players.length === 0) {
                toast.error('No players to export');
                return;
            }

            const positions = this.playerService.positions;

            toast.info('Exporting to Google Sheets...', { duration: TOAST.LONG_DURATION });

            const result = await this.googleSheetsIntegration.exportPlayers(
                players,
                positions,
                spreadsheetId || null,
                integrationsConfig.googleSheets.defaultSheetName
            );

            // Save the spreadsheet ID for future use
            this.googleSheetsSpreadsheetId = result.spreadsheetId;
            storage.set('googleSheetsSpreadsheetId', result.spreadsheetId);

            toast.success(
                `Exported ${result.rowCount - 1} players to Google Sheets!`,
                { duration: TOAST.MEDIUM_DURATION }
            );

            // Show a link to the spreadsheet
            setTimeout(() => {
                toast.info(
                    `<a href="${result.spreadsheetUrl}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">Open in Google Sheets →</a>`,
                    { duration: TOAST.LONG_DURATION, allowHtml: true }
                );
            }, TOAST.SHORT_DURATION);

            this.update();
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export: ' + error.message);
        }
    }

    async handleImport() {
        if (!this.googleSheetsIntegration) {
            toast.error('Google Sheets integration is not initialized');
            return;
        }

        const currentActivity = this.getCurrentActivity();
        if (!currentActivity) {
            toast.error('Please select an activity first');
            return;
        }

        try {
            // Get spreadsheet ID from input
            const spreadsheetInput = this.$(`#${ELEMENT_IDS.GOOGLE_SHEETS_SPREADSHEET_ID}`);
            let spreadsheetId = spreadsheetInput?.value.trim() || this.googleSheetsSpreadsheetId;

            if (!spreadsheetId) {
                toast.error('Please provide a spreadsheet URL or ID');
                return;
            }

            // Extract ID from URL if full URL was provided
            const extractedId = this.googleSheetsIntegration.extractSpreadsheetId(spreadsheetId);
            spreadsheetId = extractedId || spreadsheetId;

            toast.info('Importing from Google Sheets...', { duration: TOAST.LONG_DURATION });

            const players = await this.googleSheetsIntegration.importPlayers(
                spreadsheetId,
                integrationsConfig.googleSheets.defaultSheetName
            );

            if (players.length === 0) {
                toast.warning('No players found in the spreadsheet');
                return;
            }

            // Import players
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

            // Save the spreadsheet ID for future use
            this.googleSheetsSpreadsheetId = spreadsheetId;
            storage.set('googleSheetsSpreadsheetId', spreadsheetId);

            toast.success(
                `Imported ${imported} player(s)${skipped > 0 ? `, skipped ${skipped}` : ''}`,
                { duration: TOAST.MEDIUM_DURATION }
            );
        } catch (error) {
            console.error('Import failed:', error);
            toast.error('Failed to import: ' + error.message);
        }
    }
}

export default GoogleSheetsSection;
