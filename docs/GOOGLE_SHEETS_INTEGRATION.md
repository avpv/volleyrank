# Google Sheets Integration Guide

This guide explains how to set up and use the Google Sheets integration for TeamBalance.

## Overview

The Google Sheets integration allows you to:
- **Export** player lists to Google Sheets
- **Import** player lists from Google Sheets
- **Sync** data between TeamBalance and Google Sheets
- **Share** player rosters with your team via Google Sheets

## Setup Instructions

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top and select **"New Project"**
3. Enter a project name (e.g., "TeamBalance Integration")
4. Click **"Create"**

### Step 2: Enable Google Sheets API

1. In the Google Cloud Console, make sure your new project is selected
2. Go to **"APIs & Services"** → **"Library"**
3. Search for "Google Sheets API"
4. Click on **"Google Sheets API"**
5. Click **"Enable"**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen:
   - Choose **"External"** user type
   - Fill in the required fields:
     - **App name**: TeamBalance
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click **"Save and Continue"**
   - On the **Scopes** page, click **"Save and Continue"** (no need to add scopes here)
   - On the **Test users** page, add your Google account email
   - Click **"Save and Continue"**
   - Review and click **"Back to Dashboard"**

4. Now create the OAuth client ID:
   - Go back to **"Credentials"**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Choose **"Web application"**
   - Enter a name (e.g., "TeamBalance Web Client")

5. Add **Authorized JavaScript origins**:
   - For local development: `http://localhost:8080`
   - For GitHub Pages: `https://yourusername.github.io`
   - For custom domain: `https://yourdomain.com`

   **Example for this project:**
   - `https://avpv.github.io`

6. Add **Authorized redirect URIs** - **IMPORTANT for fixing redirect_uri_mismatch error**:

   Google Identity Services requires explicit redirect URIs. Add ALL of these:
   - For local development: `http://localhost:8080`
   - For GitHub Pages: `https://yourusername.github.io`
   - Also add the full path: `https://yourusername.github.io/team-balance`

   **Example for this project (add all three):**
   - `https://avpv.github.io`
   - `https://avpv.github.io/team-balance`
   - `https://avpv.github.io/team-balance/`

   ⚠️ **Note:** The trailing slash matters! Add both versions with and without the trailing slash to avoid issues.

7. Click **"Create"**

8. **Copy the Client ID** - you'll need this in the next step

### Step 4: Configure TeamBalance

1. Open the file `src/config/integrations.js` in your TeamBalance project

2. Update the configuration:

```javascript
const integrationsConfig = {
    googleSheets: {
        // Paste your Client ID here
        clientId: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',

        // Enable the integration
        enabled: true,

        // Other settings (optional)
        defaultSheetName: 'Players',
        defaultSpreadsheetTitle: 'TeamBalance Players',
    },
};
```

3. Save the file

### Step 5: Deploy or Test Locally

**For local testing:**
```bash
# Make sure you're serving from http://localhost:8080
python3 -m http.server 8080
# or
npx http-server -p 8080
```

**For GitHub Pages:**
1. Commit and push your changes
2. Make sure GitHub Pages is enabled in your repository settings
3. Access your site at `https://yourusername.github.io/team-balance`

## Usage Guide

### Connecting to Google Sheets

1. Open TeamBalance in your browser
2. Go to **Settings** page
3. Select an activity (e.g., Basketball)
4. Scroll down to the **"Google Sheets Integration"** section
5. Click **"Connect to Google Sheets"**
6. Sign in with your Google account
7. Grant permission to access Google Sheets

### Exporting Players

1. Make sure you have players added to your current session
2. In the **Google Sheets Integration** section:
   - (Optional) Paste a spreadsheet URL to update an existing sheet
   - Leave empty to create a new spreadsheet
3. Click **"Export to Google Sheets"**
4. Wait for the export to complete
5. Click the link in the success message to open your spreadsheet

**What gets exported:**
- Player names
- Positions for each player
- ELO ratings for each position

**Spreadsheet format:**
```
Name          | Positions | Point Guard Rating | Shooting Guard Rating | ...
John Smith    | PG, SG    | 1500              | 1450                  | ...
Alice Johnson | PG        | 1600              | -                     | ...
```

### Importing Players

1. Create or open a Google Spreadsheet with player data
2. Format your spreadsheet with these columns (minimum required):
   - **Name**: Player's full name
   - **Positions**: Comma-separated position codes (e.g., "PG, SG")

3. Get the spreadsheet URL or ID:
   - Full URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Or just the ID: `SPREADSHEET_ID`

4. In TeamBalance:
   - Paste the URL or ID into the **"Spreadsheet URL or ID"** field
   - Click **"Import from Google Sheets"**
   - Wait for the import to complete

**Import rules:**
- Duplicate players (same name) will be skipped
- Invalid positions will be ignored
- Empty rows will be skipped
- First row is treated as headers

### Disconnecting

To disconnect from Google Sheets:
1. Click **"Disconnect"** at the bottom of the integration section
2. Your authorization will be revoked
3. The saved spreadsheet ID will be cleared

## Troubleshooting

### "Failed to connect" error

**Possible causes:**
1. **Wrong Client ID**: Make sure you copied the correct Client ID from Google Cloud Console
2. **Unauthorized origin**: Add your site's URL to "Authorized JavaScript origins" in Google Cloud Console
3. **API not enabled**: Make sure Google Sheets API is enabled in your project

### "Failed to export" error

**Possible causes:**
1. **Not connected**: Make sure you're connected (see status indicator)
2. **No players**: Add at least one player before exporting
3. **Invalid spreadsheet ID**: If updating an existing sheet, make sure the ID is correct
4. **Permission denied**: You may have revoked access - try reconnecting

### "Failed to import" error

**Possible causes:**
1. **Not connected**: Make sure you're connected
2. **Invalid spreadsheet ID**: Check that the URL or ID is correct
3. **Wrong format**: Make sure your spreadsheet has "Name" and "Positions" columns
4. **Permission denied**: Make sure you have access to the spreadsheet
5. **Sheet not found**: Make sure the sheet name matches (default: "Players")

### "Integration is not configured" message

This means the integration is disabled or Client ID is missing:
1. Check `src/config/integrations.js`
2. Make sure `enabled: true`
3. Make sure `clientId` is set to your actual Client ID

## Advanced Configuration

### Custom Sheet Name

To use a different sheet name (default is "Players"):

```javascript
// In src/config/integrations.js
defaultSheetName: 'MyCustomSheetName',
```

### Custom Spreadsheet Title

To change the default title for new spreadsheets:

```javascript
// In src/config/integrations.js
defaultSpreadsheetTitle: 'My Team Roster',
```

### Multiple Spreadsheets

You can work with multiple spreadsheets:
1. Export to one spreadsheet (copy the URL)
2. Later, paste that URL to update the same spreadsheet
3. Or leave empty to create a new one each time

## Security & Privacy

### What permissions does TeamBalance request?

TeamBalance requests the following Google API scope:
- `https://www.googleapis.com/auth/spreadsheets` - Create, view, and edit spreadsheets

### What data is accessed?

- **Read**: Your spreadsheet data when importing
- **Write**: Creates or updates spreadsheets when exporting
- **No other access**: TeamBalance does NOT access your other Google Drive files, emails, or personal information

### Where is my data stored?

- **Google Sheets**: Your player data is stored in your Google Sheets (you control this)
- **Browser localStorage**: The spreadsheet ID is saved locally in your browser
- **No server**: TeamBalance has no backend server - all processing happens in your browser
- **No tracking**: No data is sent to third parties

### How to revoke access?

You can revoke TeamBalance's access anytime:
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find "TeamBalance" in the list
3. Click **"Remove Access"**

Or use the **"Disconnect"** button in TeamBalance.

## API Limits

Google Sheets API has the following limits (as of 2025):

- **Read requests**: 300 per minute per project
- **Write requests**: 300 per minute per project
- **Simultaneous requests**: 100 per project

For TeamBalance typical usage:
- **Export**: 5-10 requests per export (depending on spreadsheet size)
- **Import**: 1-2 requests per import

You're unlikely to hit these limits in normal usage.

## Development Notes

### Testing Locally

When testing locally, make sure to:
1. Use `http://localhost:8080` (not `http://127.0.0.1:8080`)
2. Add this exact URL to "Authorized JavaScript origins"
3. Don't use HTTPS for localhost (unless you have proper certs)

### Production Deployment

For production (GitHub Pages or custom domain):
1. Use HTTPS (required by Google)
2. Add the exact origin URL (including `https://`)
3. Don't include trailing slashes in origins
4. Test the integration after deployment

### Code Structure

- **Integration module**: `src/integrations/GoogleSheetsIntegration.js`
- **Configuration**: `src/config/integrations.js`
- **UI implementation**: `src/pages/SettingsPage.js` (lines 1281-1542)
- **Element IDs**: `src/config/ui.js`

## Troubleshooting

### Error: "redirect_uri_mismatch" (Error 400)

**Full error message:**
```
Доступ заблокирован: недопустимый запрос от этого приложения
Access blocked: invalid request from this application
Error 400: redirect_uri_mismatch
```

**Cause:** The redirect URI used by the application doesn't match the URIs configured in your Google Cloud Console OAuth client.

**Solution:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID and click the edit icon (pencil)
5. Scroll to **Authorized redirect URIs** section
6. Add the following URIs (add ALL of them):

   **For this project specifically:**
   ```
   https://avpv.github.io
   https://avpv.github.io/team-balance
   https://avpv.github.io/team-balance/
   ```

   **For local development (if testing locally):**
   ```
   http://localhost:8080
   ```

7. Click **"Save"**
8. **Wait 5 minutes** for changes to propagate
9. Clear your browser cache or try in an incognito window
10. Try connecting to Google Sheets again

**Important notes:**
- ⚠️ The trailing slash matters! Add both versions (`/team-balance` and `/team-balance/`)
- ⚠️ Make sure you also have the same URIs in **Authorized JavaScript origins**
- ⚠️ Changes can take up to 5 minutes to take effect
- ⚠️ Use the exact URL where your app is hosted (check your browser's address bar)

### Error: "Access denied" or "Permission denied"

**Cause:** The OAuth consent screen is not properly configured or the app is in testing mode without your email added.

**Solution:**
1. Go to **APIs & Services** → **OAuth consent screen**
2. If in "Testing" mode, make sure your Google account email is added to "Test users"
3. Or publish the app (not recommended unless you want public access)

### Error: "Invalid Client ID"

**Cause:** The Client ID in `src/config/integrations.js` doesn't match the one from Google Cloud Console.

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Copy the Client ID exactly
3. Update `src/config/integrations.js` with the correct Client ID
4. Redeploy or refresh your application

## Support

If you encounter issues:

1. Check the browser console for error messages (F12)
2. Verify your Google Cloud Console settings (see Troubleshooting section above)
3. Make sure you're using HTTPS in production
4. Try disconnecting and reconnecting
5. Clear browser cache and try in incognito mode
6. Wait 5 minutes after changing Google Cloud Console settings

For more help, please open an issue on the GitHub repository.

## Future Enhancements

Potential future features:
- **Auto-sync**: Automatically sync changes between TeamBalance and Google Sheets
- **Two-way sync**: Update ratings in both directions
- **Multiple sheets**: Support for multiple player lists in one spreadsheet
- **Templates**: Pre-formatted spreadsheet templates
- **Batch operations**: Import/export multiple sessions at once

## Examples

### Example 1: Creating a Team Roster

1. Add players in TeamBalance
2. Compare players to calculate ratings
3. Export to Google Sheets
4. Share the Google Sheets link with your team
5. Team members can view the roster online

### Example 2: Importing from Existing List

1. Create a Google Sheet with columns: Name, Positions
2. Fill in your team members
3. Copy the spreadsheet URL
4. In TeamBalance, paste the URL and import
5. All players are now in TeamBalance

### Example 3: Keeping Data in Sync

1. Export your players to Google Sheets
2. Save the spreadsheet URL
3. Make changes in TeamBalance (add/remove players)
4. Export again using the same URL
5. Your spreadsheet is updated with the latest data

---

**Note**: This integration uses Google's OAuth 2.0 for client-side authentication. No TeamBalance backend server is involved - all communication is directly between your browser and Google's servers.
