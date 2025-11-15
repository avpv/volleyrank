// src/config/integrations.js

/**
 * Integration configurations
 *
 * This file contains configuration for third-party integrations.
 */

const integrationsConfig = {
    googleSheets: {
        // OAuth 2.0 Client ID from Google Cloud Console
        // To get your Client ID:
        // 1. Go to https://console.cloud.google.com/
        // 2. Create or select a project
        // 3. Enable Google Sheets API
        // 4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
        // 5. Choose "Web application"
        // 6. Add your authorized JavaScript origins:
        //    - http://localhost:8080 (for local development)
        //    - https://avpv.github.io (for this production deployment)
        // 7. Add your authorized redirect URIs (IMPORTANT to avoid redirect_uri_mismatch):
        //    - http://localhost:8080 (for local development)
        //    - https://avpv.github.io (for production)
        //    - https://avpv.github.io/team-balance (with path)
        //    - https://avpv.github.io/team-balance/ (with trailing slash)
        // 8. Copy the Client ID and paste it here
        clientId: '793407683980-60nn9nngdghn7chf1bb5dnigl1i8aiht.apps.googleusercontent.com',

        // Whether Google Sheets integration is enabled
        enabled: true,

        // Default sheet name for exports
        defaultSheetName: 'Players',

        // Default spreadsheet title for new spreadsheets
        defaultSpreadsheetTitle: 'TeamBalance Players',
    },

    // Future integrations can be added here
    // slack: { ... },
    // discord: { ... },
};

export default integrationsConfig;
