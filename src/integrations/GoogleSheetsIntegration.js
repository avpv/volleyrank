// src/integrations/GoogleSheetsIntegration.js

/**
 * Google Sheets Integration
 *
 * Provides export and import functionality for player data using Google Sheets API v4.
 * Uses Google Identity Services (GIS) for client-side OAuth 2.0 authentication (no backend required).
 *
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select an existing one
 * 3. Enable Google Sheets API
 * 4. Create OAuth 2.0 Client ID (Web application)
 * 5. **CRITICAL**: Add authorized JavaScript origins (e.g., https://yourdomain.github.io)
 *    - This is REQUIRED for GIS to work
 *    - Use only the origin (protocol + domain), NOT paths
 *    - Example: https://avpv.github.io (not https://avpv.github.io/team-balance)
 * 6. Configure OAuth consent screen
 * 7. Copy the Client ID and update the configuration in src/config/integrations.js
 *
 * Troubleshooting:
 * - If you get "403: access_denied" error, see docs/TROUBLESHOOTING_GOOGLE_OAUTH.md
 * - The error usually means JavaScript origins are not configured correctly
 */

class GoogleSheetsIntegration {
    constructor(clientId) {
        this.clientId = clientId;
        this.tokenClient = null;
        this.accessToken = null;
        this.isInitialized = false;
        this.isAuthorized = false;

        // Google Sheets API configuration
        this.apiScopes = 'https://www.googleapis.com/auth/spreadsheets';
        this.discoveryDoc = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

        // GIS (Google Identity Services) library
        this.gisLoaded = false;
        this.gapiLoaded = false;
    }

    /**
     * Initialize the Google API client and GIS
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Load Google API libraries
            await this.loadGoogleLibraries();

            // Initialize GAPI client
            await this.initializeGapiClient();

            // Initialize GIS token client
            this.initializeGisClient();

            this.isInitialized = true;
            console.log('Google Sheets integration initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Google Sheets integration:', error);
            throw new Error(`Initialization failed: ${error.message}`);
        }
    }

    /**
     * Load Google API libraries dynamically
     */
    async loadGoogleLibraries() {
        // Load GAPI library
        if (!window.gapi) {
            await this.loadScript('https://apis.google.com/js/api.js');
            await new Promise((resolve) => {
                window.gapi.load('client', resolve);
            });
        }
        this.gapiLoaded = true;

        // Load GIS library
        if (!window.google?.accounts?.oauth2) {
            await this.loadScript('https://accounts.google.com/gsi/client');
        }
        this.gisLoaded = true;
    }

    /**
     * Load external script
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize GAPI client
     */
    async initializeGapiClient() {
        await window.gapi.client.init({
            apiKey: '', // API key is optional for OAuth 2.0
            discoveryDocs: [this.discoveryDoc],
        });
    }

    /**
     * Initialize GIS token client
     */
    initializeGisClient() {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: this.apiScopes,
            callback: (response) => {
                if (response.error !== undefined) {
                    throw new Error(this.formatOAuthError(response.error));
                }
                this.accessToken = response.access_token;
                this.isAuthorized = true;
            },
        });
    }

    /**
     * Request authorization from user
     */
    async authorize() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            this.tokenClient.callback = async (response) => {
                if (response.error !== undefined) {
                    const errorMessage = this.formatOAuthError(response.error);
                    console.error('OAuth error:', response.error, errorMessage);
                    reject(new Error(errorMessage));
                    return;
                }
                this.accessToken = response.access_token;
                this.isAuthorized = true;
                resolve(true);
            };

            try {
                // Log current origin for debugging
                console.log('Requesting OAuth token from origin:', window.location.origin);

                // Request access token
                if (this.accessToken === null) {
                    // Prompt the user to select a Google Account and ask for consent
                    this.tokenClient.requestAccessToken({ prompt: 'consent' });
                } else {
                    // Skip display of account chooser and consent dialog
                    this.tokenClient.requestAccessToken({ prompt: '' });
                }
            } catch (error) {
                reject(new Error(this.formatOAuthError(error.message || 'unknown_error')));
            }
        });
    }

    /**
     * Revoke authorization
     */
    revokeAuthorization() {
        if (this.accessToken) {
            window.google.accounts.oauth2.revoke(this.accessToken, () => {
                this.accessToken = null;
                this.isAuthorized = false;
                console.log('Authorization revoked');
            });
        }
    }

    /**
     * Check if user is authorized
     */
    checkAuthorization() {
        return this.isAuthorized && this.accessToken !== null;
    }

    /**
     * Export players to Google Sheets
     *
     * @param {Array} players - Array of player objects
     * @param {Object} positions - Position mapping (e.g., {PG: 'Point Guard'})
     * @param {string} spreadsheetId - Optional existing spreadsheet ID
     * @param {string} sheetName - Sheet name (default: 'Players')
     * @returns {Object} - {spreadsheetId, spreadsheetUrl, sheetId}
     */
    async exportPlayers(players, positions, spreadsheetId = null, sheetName = 'Players') {
        if (!this.checkAuthorization()) {
            await this.authorize();
        }

        try {
            let targetSpreadsheetId = spreadsheetId;
            let sheetId = 0;

            // Create new spreadsheet if ID not provided
            if (!targetSpreadsheetId) {
                const createResult = await this.createSpreadsheet('TeamBalance Players');
                targetSpreadsheetId = createResult.spreadsheetId;
                sheetId = createResult.sheetId;
            } else {
                // Find or create the sheet
                const sheetResult = await this.getOrCreateSheet(targetSpreadsheetId, sheetName);
                sheetId = sheetResult.sheetId;
            }

            // Prepare data for export
            const data = this.formatPlayersForExport(players, positions);

            // Clear existing data
            await this.clearSheet(targetSpreadsheetId, sheetName);

            // Write data to sheet
            await this.writeToSheet(targetSpreadsheetId, sheetName, data);

            // Format the sheet
            await this.formatSheet(targetSpreadsheetId, sheetId, data[0].length);

            const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`;

            return {
                spreadsheetId: targetSpreadsheetId,
                spreadsheetUrl: spreadsheetUrl,
                sheetId: sheetId,
                rowCount: data.length
            };
        } catch (error) {
            console.error('Export failed:', error);
            throw new Error(`Failed to export players: ${error.message}`);
        }
    }

    /**
     * Import players from Google Sheets
     *
     * @param {string} spreadsheetId - Spreadsheet ID
     * @param {string} sheetName - Sheet name (default: 'Players')
     * @returns {Array} - Array of player objects {name, positions}
     */
    async importPlayers(spreadsheetId, sheetName = 'Players') {
        if (!this.checkAuthorization()) {
            await this.authorize();
        }

        try {
            // Read data from sheet
            const range = `${sheetName}!A:Z`;
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: range,
            });

            const values = response.result.values;

            if (!values || values.length === 0) {
                throw new Error('No data found in the sheet');
            }

            // Parse data
            const players = this.parsePlayersFromSheet(values);

            return players;
        } catch (error) {
            console.error('Import failed:', error);
            throw new Error(`Failed to import players: ${error.message}`);
        }
    }

    /**
     * Format players data for export to Google Sheets
     */
    formatPlayersForExport(players, positions) {
        // Create header row
        const positionKeys = Object.keys(positions);
        const headers = ['Name', 'Positions', ...positionKeys.map(key => `${positions[key]} Rating`)];

        // Create data rows
        const rows = players.map(player => {
            const row = [
                player.name,
                player.positions.join(', ')
            ];

            // Add ratings for each position
            positionKeys.forEach(posKey => {
                row.push(player.ratings?.[posKey] || '');
            });

            return row;
        });

        return [headers, ...rows];
    }

    /**
     * Parse players from Google Sheets data
     */
    parsePlayersFromSheet(values) {
        // First row is header
        const headers = values[0];
        const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
        const positionsIndex = headers.findIndex(h => h.toLowerCase() === 'positions');

        if (nameIndex === -1 || positionsIndex === -1) {
            throw new Error('Sheet must have "Name" and "Positions" columns');
        }

        // Parse data rows
        const players = [];
        for (let i = 1; i < values.length; i++) {
            const row = values[i];
            const name = row[nameIndex]?.trim();
            const positionsStr = row[positionsIndex]?.trim();

            if (!name || !positionsStr) {
                continue; // Skip empty rows
            }

            // Parse positions (can be comma-separated)
            const positions = positionsStr.split(',').map(p => p.trim()).filter(p => p);

            players.push({
                name: name,
                positions: positions
            });
        }

        return players;
    }

    /**
     * Create a new spreadsheet
     */
    async createSpreadsheet(title) {
        const response = await window.gapi.client.sheets.spreadsheets.create({
            properties: {
                title: title
            }
        });

        return {
            spreadsheetId: response.result.spreadsheetId,
            sheetId: response.result.sheets[0].properties.sheetId
        };
    }

    /**
     * Get or create a sheet in a spreadsheet
     */
    async getOrCreateSheet(spreadsheetId, sheetName) {
        // Get spreadsheet metadata
        const response = await window.gapi.client.sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId
        });

        const sheets = response.result.sheets;
        const existingSheet = sheets.find(s => s.properties.title === sheetName);

        if (existingSheet) {
            return { sheetId: existingSheet.properties.sheetId };
        }

        // Create new sheet
        const addSheetResponse = await window.gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            requests: [{
                addSheet: {
                    properties: {
                        title: sheetName
                    }
                }
            }]
        });

        return {
            sheetId: addSheetResponse.result.replies[0].addSheet.properties.sheetId
        };
    }

    /**
     * Clear sheet data
     */
    async clearSheet(spreadsheetId, sheetName) {
        await window.gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A:Z`
        });
    }

    /**
     * Write data to sheet
     */
    async writeToSheet(spreadsheetId, sheetName, data) {
        const response = await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            resource: {
                values: data
            }
        });

        return response.result;
    }

    /**
     * Format sheet (header row, freeze, etc.)
     */
    async formatSheet(spreadsheetId, sheetId, columnCount) {
        const requests = [
            // Format header row
            {
                repeatCell: {
                    range: {
                        sheetId: sheetId,
                        startRowIndex: 0,
                        endRowIndex: 1
                    },
                    cell: {
                        userEnteredFormat: {
                            backgroundColor: {
                                red: 0.2,
                                green: 0.4,
                                blue: 0.8
                            },
                            textFormat: {
                                foregroundColor: {
                                    red: 1,
                                    green: 1,
                                    blue: 1
                                },
                                fontSize: 11,
                                bold: true
                            }
                        }
                    },
                    fields: 'userEnteredFormat(backgroundColor,textFormat)'
                }
            },
            // Freeze header row
            {
                updateSheetProperties: {
                    properties: {
                        sheetId: sheetId,
                        gridProperties: {
                            frozenRowCount: 1
                        }
                    },
                    fields: 'gridProperties.frozenRowCount'
                }
            },
            // Auto-resize columns
            {
                autoResizeDimensions: {
                    dimensions: {
                        sheetId: sheetId,
                        dimension: 'COLUMNS',
                        startIndex: 0,
                        endIndex: columnCount
                    }
                }
            }
        ];

        await window.gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            requests: requests
        });
    }

    /**
     * List user's spreadsheets (requires Drive API scope)
     * Note: This would require additional Drive API scope
     */
    async listSpreadsheets() {
        // This would require Drive API scope and implementation
        // Left as a placeholder for future enhancement
        throw new Error('Not implemented - requires Drive API scope');
    }

    /**
     * Get spreadsheet URL from ID
     */
    getSpreadsheetUrl(spreadsheetId) {
        return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    }

    /**
     * Extract spreadsheet ID from URL
     */
    extractSpreadsheetId(url) {
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    }

    /**
     * Format OAuth error messages with helpful troubleshooting info
     */
    formatOAuthError(errorCode) {
        const origin = window.location.origin;

        const errorMessages = {
            'access_denied': `OAuth access denied (403). This usually means the Authorized JavaScript Origins are not configured correctly in Google Cloud Console.\n\n` +
                `Please ensure "${origin}" is added to Authorized JavaScript Origins (NOT redirect URIs).\n\n` +
                `Steps to fix:\n` +
                `1. Go to https://console.cloud.google.com/\n` +
                `2. Select your project → APIs & Services → Credentials\n` +
                `3. Edit your OAuth 2.0 Client ID\n` +
                `4. Add "${origin}" to "Authorized JavaScript origins"\n` +
                `5. Save and wait 5-10 minutes for changes to propagate\n\n` +
                `See docs/TROUBLESHOOTING_GOOGLE_OAUTH.md for detailed instructions.`,

            'popup_closed_by_user': 'OAuth popup was closed before completing authorization. Please try again.',

            'popup_blocked': 'OAuth popup was blocked by your browser. Please allow popups for this site and try again.',

            'invalid_client': `Invalid OAuth client configuration. Please verify that the Client ID in src/config/integrations.js matches your Google Cloud Console configuration.`,

            'unauthorized_client': `This client is not authorized. Please check:\n` +
                `1. Google Sheets API is enabled\n` +
                `2. OAuth consent screen is configured\n` +
                `3. For testing mode: your email is added as a test user`,

            'org_internal': 'This OAuth client is restricted to internal users only. Please contact your Google Workspace administrator.',

            'invalid_request': 'Invalid OAuth request. This may indicate a configuration error. Check browser console for details.'
        };

        const message = errorMessages[errorCode];
        if (message) {
            return message;
        }

        // Generic error message for unknown errors
        return `OAuth error: ${errorCode}\n\n` +
            `Current origin: ${origin}\n` +
            `Please ensure this origin is added to "Authorized JavaScript origins" in Google Cloud Console.\n\n` +
            `See docs/TROUBLESHOOTING_GOOGLE_OAUTH.md for help.`;
    }
}

export default GoogleSheetsIntegration;
