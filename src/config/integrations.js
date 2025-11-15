// src/config/integrations.js

/**
 * Integration configurations
 *
 * This file contains configuration for third-party integrations.
 */

const integrationsConfig = {
    googleSheets: {
        // OAuth 2.0 Client ID from Google Cloud Console
        //
        // IMPORTANT: This integration uses Google Identity Services (GIS), which requires
        // "Authorized JavaScript origins" to be configured (NOT just redirect URIs).
        //
        // To get your Client ID:
        // 1. Go to https://console.cloud.google.com/
        // 2. Create or select a project
        // 3. Enable Google Sheets API
        // 4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
        // 5. Choose "Web application"
        //
        // 6. **CRITICAL**: Add "Authorized JavaScript origins" (required for GIS):
        //    - http://localhost:8080 (for local development)
        //    - https://avpv.github.io (for this production deployment)
        //    Note: Use ONLY the origin (protocol + domain + port), NO paths!
        //    ✅ Correct: https://avpv.github.io
        //    ❌ Wrong: https://avpv.github.io/team-balance
        //
        // 7. Optionally add "Authorized redirect URIs" (for compatibility):
        //    - http://localhost:8080
        //    - https://avpv.github.io
        //    - https://avpv.github.io/team-balance
        //    - https://avpv.github.io/team-balance/
        //
        // 8. Configure OAuth consent screen (required for first-time setup)
        // 9. Copy the Client ID and paste it here
        //
        // Troubleshooting: If you get "403: access_denied" error, see:
        // docs/TROUBLESHOOTING_GOOGLE_OAUTH.md
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
