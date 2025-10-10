# Deployment Checklist - Auth Cookie Fix

## Changes Made:

### 1. `lib/auth.ts`
- ✅ Moved `trustedOrigins` before `socialProviders` (order matters in Better Auth)
- ✅ Added explicit `redirectURI` to Google provider
- ✅ Added `httpOnly: true` and `path: "/"` to cookie options
- ✅ Kept `sameSite: "none"` and `secure: true` for cross-origin cookies

### 2. `server.js`
- ✅ Fixed wildcard route from `/api/auth/*splat` to `/api/auth/*`
- ✅ Added cookie logging to debug Set-Cookie headers
- ✅ Improved CORS configuration with origin function
- ✅ Simplified auth request logging

## Deployment Steps:

### Step 1: Build the Backend
```bash
cd /home/bad-dev/minute-intelligent-assistant/backend
pnpm run build:esbuild
```

### Step 2: Test Locally (Optional but Recommended)
```bash
# Start the server locally
pnpm start

# In another terminal, test the auth endpoint
curl -v http://localhost:8080/api/auth/get-session
```
Look for `Set-Cookie` headers in the response.

### Step 3: Deploy to Render
1. Commit and push your changes:
```bash
git add .
git commit -m "Fix: Configure cookies for cross-origin auth (SameSite=None)"
git push origin main
```

2. Render will auto-deploy, or manually trigger a deploy from the Render dashboard

### Step 4: Verify Environment Variables on Render
Make sure these are set correctly:
- ✅ `BETTER_AUTH_SECRET` - your secret key
- ✅ `BETTER_AUTH_URL` = `https://minute-intelligent-assistant.onrender.com`
- ✅ `FRONTEND_BASE_URL` = `https://minute-intelligent-assistant.vercel.app`
- ✅ `GOOGLE_CLIENT_ID` - your Google OAuth client ID
- ✅ `GOOGLE_CLIENT_SECRET` - your Google OAuth client secret
- ✅ `DATABASE_URL` - your PostgreSQL connection string

### Step 5: Check Render Logs After Deploy
Look for these log messages:
1. When you try to sign in, you should see: `🍪 Setting cookies: [cookie data]`
2. After redirect, you should see cookies in subsequent requests

### Step 6: Test in Firefox
1. Clear all cookies and cache
2. Go to https://minute-intelligent-assistant.vercel.app
3. Open DevTools > Storage tab
4. Click "Sign in with Google"
5. After redirect, check both domains in the Storage tab:
   - `minute-intelligent-assistant.vercel.app` (should be empty)
   - `minute-intelligent-assistant.onrender.com` (should have cookies)

### Step 7: Check Firefox's Cookie Settings
If still not working, check Firefox settings:
1. Type `about:config` in address bar
2. Search for `network.cookie.sameSite.laxByDefault`
3. Make sure it's set to `true` (default)
4. Search for `network.cookie.sameSite.noneRequiresSecure`
5. Make sure it's set to `true` (default)

### Step 8: Alternative - Check if Firefox is Blocking
1. Open https://minute-intelligent-assistant.vercel.app
2. Click the shield icon (🛡️) in the address bar
3. Look for "Cross-Site Cookies" - if blocked, temporarily allow them
4. Click "Protection Settings" → Choose "Custom"
5. Under "Cookies", select "All cookies"

## Expected Behavior:

After successful deployment, you should see:
1. ✅ Login redirects to Google
2. ✅ Google redirects back to your backend callback
3. ✅ Backend sets cookies with `SameSite=None; Secure; HttpOnly`
4. ✅ Frontend receives session data
5. ✅ No more "Access Denied" errors

## Troubleshooting:

### If cookies still not showing:
- Check Render logs for `🍪 Setting cookies:` message
- If message appears but cookies don't work, it's a browser issue
- Try in Chrome/Chromium to verify it works there
- Check if Firefox Enhanced Tracking Protection is blocking

### If you see "cookies: undefined" in logs:
- The browser is not sending cookies
- This is expected for first request, but should have cookies after callback
- If callback also shows undefined, cookies aren't being set at all

### If authentication works but session doesn't persist:
- Check cookie expiry time
- Verify `cookieCache.maxAge` setting in auth.ts
- Check if cookies are being cleared by browser/extensions
