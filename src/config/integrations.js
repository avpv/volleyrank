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
        //    - https://yourdomain.github.io (for production)
        // 7. Copy the Client ID and paste it here
        clientId: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',

        // Whether Google Sheets integration is enabled
        enabled: false,

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
