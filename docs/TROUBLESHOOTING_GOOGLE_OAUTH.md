# Troubleshooting Google OAuth Errors

This guide helps you resolve common Google OAuth errors when using the Google Sheets integration.

## Error 403: access_denied

### Symptoms
You see an error like this when trying to connect to Google Sheets:

```
Ошибка 403: access_denied
Параметры запроса:
  access_type=online
  scope=https://www.googleapis.com/auth/spreadsheets
  response_type=token
  redirect_uri=storagerelay://https/avpv.github.io?id=auth888759
  ...
```

### Root Cause
This error occurs when the **Authorized JavaScript Origins** are not properly configured in your Google Cloud Console OAuth client.

The application uses **Google Identity Services (GIS)**, which is the modern OAuth 2.0 library. GIS requires **Authorized JavaScript Origins** instead of traditional redirect URIs.

### Solution

Follow these steps to fix the 403 error:

#### 1. Open Google Cloud Console

Go to [Google Cloud Console](https://console.cloud.google.com/)

#### 2. Navigate to OAuth Client Settings

1. Select your project
2. Go to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (the one matching your clientId in the code)
4. Click the **Edit** button (pencil icon)

#### 3. Configure Authorized JavaScript Origins

**CRITICAL:** For GIS to work, you MUST add your domain to **Authorized JavaScript origins**.

Add the following origins:

**For Production (GitHub Pages):**
```
https://avpv.github.io
```

**For Local Development:**
```
http://localhost:8080
```

**IMPORTANT:**
- ✅ Use just the origin (protocol + domain + port)
- ❌ Do NOT include paths like `/team-balance`
- ✅ Example: `https://avpv.github.io`
- ❌ Wrong: `https://avpv.github.io/team-balance`

#### 4. Configure Authorized Redirect URIs (Optional)

While GIS doesn't use traditional redirect URIs, you may add these for completeness:

```
https://avpv.github.io
https://avpv.github.io/team-balance
https://avpv.github.io/team-balance/
http://localhost:8080
```

#### 5. Save Changes

Click **Save** at the bottom of the page.

#### 6. Wait for Changes to Propagate

⏱️ **Important:** It can take **5-10 minutes** for changes to propagate through Google's systems.

- Clear your browser cache
- Try in an incognito/private window
- Wait a few minutes before testing again

#### 7. Test the Connection

1. Reload your application
2. Go to Settings → Google Sheets Integration
3. Click "Connect to Google Sheets"
4. You should now see the Google account picker

---

## Error 400: redirect_uri_mismatch

### Symptoms
Error message: `redirect_uri_mismatch` or similar

### Solution
This error was fixed in commit `615bbc0`. Make sure you have the latest code.

If you still see this error, verify that your redirect URIs include all variations:
- With and without trailing slashes
- With and without the `/team-balance` path

---

## OAuth Consent Screen Configuration

### Publishing Status

If you see errors about "app not verified" or can only test with specific accounts:

#### For Personal/Internal Use:
1. Go to **OAuth consent screen**
2. Keep the app in **Testing** mode
3. Add your email to **Test users**
4. You don't need to publish the app

#### For Public Use:
1. Go to **OAuth consent screen**
2. Fill in all required fields:
   - App name
   - User support email
   - Developer contact information
3. Add required scopes: `https://www.googleapis.com/auth/spreadsheets`
4. Submit for verification (can take several days)

---

## Verification Checklist

Before testing, verify:

- [ ] Google Sheets API is enabled in your project
- [ ] OAuth 2.0 Client ID is created (Web application type)
- [ ] **Authorized JavaScript origins** includes your domain
- [ ] OAuth consent screen is configured
- [ ] For testing mode: Your email is added as a test user
- [ ] Client ID in code matches the one in Google Cloud Console
- [ ] Changes have had 5-10 minutes to propagate
- [ ] Browser cache is cleared

---

## Common Mistakes

### ❌ Wrong: Adding path to JavaScript origins
```
https://avpv.github.io/team-balance  ← Wrong!
```

### ✅ Correct: Just the origin
```
https://avpv.github.io  ← Correct!
```

### ❌ Wrong: Forgetting to add origins
Only adding redirect URIs is not enough for GIS!

### ✅ Correct: Both origins and redirect URIs
Add to both sections for maximum compatibility.

---

## Debug Information

### Check Current Origin

Open browser console and run:
```javascript
console.log(window.location.origin)
```

This shows the exact origin that needs to be in your Authorized JavaScript origins list.

### Expected Values

| Environment | Origin |
|------------|--------|
| Production | `https://avpv.github.io` |
| Local Dev | `http://localhost:8080` |

### Inspect OAuth Request

When you see the error, check:
1. The domain in the error URL
2. Make sure it matches your configured JavaScript origin
3. Verify the client_id in the error matches your configuration

---

## Still Having Issues?

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab for failed requests

### Verify Client ID

Make sure the Client ID in `/src/config/integrations.js` matches exactly with the one in Google Cloud Console.

### Test in Incognito Mode

Sometimes cached tokens or cookies cause issues. Always test in a private/incognito window after making changes.

### Contact Support

If none of the above works:
1. Check that you're using the correct Google account
2. Verify the Google Cloud project is active
3. Check if there are any billing or quota issues
4. Review Google Cloud Console audit logs for more details

---

## Reference Links

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [OAuth 2.0 for Client-side Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## Quick Fix Summary

**The #1 most common fix for 403 errors:**

1. Go to Google Cloud Console
2. Edit your OAuth 2.0 Client ID
3. Add `https://avpv.github.io` to **Authorized JavaScript origins**
4. Save and wait 5-10 minutes
5. Clear browser cache and try again

That's it! 🎉
