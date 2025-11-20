# Troubleshooting Google OAuth Issues

If you encounter "Error 403: access_denied" or "Access blocked: [App Name] has not completed the Google verification process", follow these steps to fix it.

## Issue: "App is currently being tested"

**Error Message:**
> "The app is currently being tested, and can only be accessed by developer-approved testers. If you think you should have access, contact the developer."

**Cause:**
Your Google Cloud Project is in **Testing** mode, and the email account you are trying to use has not been added to the list of authorized test users.

### Solution 1: Add Test Users (Recommended for Development)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project.
3. Navigate to **APIs & Services** > **OAuth consent screen**.
4. Scroll down to the **Test users** section.
5. Click **+ ADD USERS**.
6. Enter the email address(es) of the Google account(s) you want to use for testing.
7. Click **SAVE**.

### Solution 2: Publish the App (For Production)
If you want to allow any user to sign in, you need to publish the app.
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Click the **PUBLISH APP** button (under "Publishing status").
3. Confirm the dialog.
   - **Note:** You might see a warning about verification. For personal use or internal tools, you can often proceed without full verification, but users might see a "Google hasn't verified this app" warning screen where they have to click "Advanced" > "Go to [App Name] (unsafe)" to proceed.

## Issue: "Application privacy policy link must not be empty"

**Error Message:**
> "Application privacy policy link must not be empty"

**Cause:**
Google requires a privacy policy link for OAuth consent screen configuration.

### Solution:
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** > **OAuth consent screen**.
3. Under "App domain", add the following:
   - **Application privacy policy link**: `https://avpv.github.io/team-balance/privacy.html`
   - **Application home page** (optional): `https://avpv.github.io/team-balance/`
4. Click **SAVE AND CONTINUE**.

**Note:** The privacy policy page is already included in the project at `privacy.html`.

## Issue: "mismatch" or "origin_mismatch"

**Error Message:**
> "The given origin is not allowed for the given client ID."

**Cause:**
The URL you are running the app from (e.g., `http://localhost:8080` or `https://avpv.github.io`) is not listed in the "Authorized JavaScript origins".

### Solution:
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** > **Credentials**.
3. Click on your **OAuth 2.0 Client ID** (Web application).
4. Under **Authorized JavaScript origins**, ensure you have added:
   - `http://localhost:8080` (for local development)
   - `https://avpv.github.io` (for production)
   - **Important:** Do NOT include trailing slashes or paths (e.g., `https://avpv.github.io/team-balance` is WRONG).
5. Click **SAVE**.
