# FINAL FIX - Better Auth Cross-Origin Cookies

## What Was Wrong

After reading the **official Better Auth Options documentation**, I discovered we were using the wrong approach.

### Previous Attempts (WRONG):
1. ❌ `session.cookie.sameSite` - This property doesn't exist in Better Auth
2. ❌ `advanced.cookieOptions` - This was also wrong
3. ❌ `advanced.cookies.[cookie_name].attributes` - This works but is for SPECIFIC cookies only

### The Correct Solution (from official docs):

According to the [Better Auth Options Reference](https://www.better-auth.com/docs/reference/options#advanced), use:

```typescript
advanced: {
  useSecureCookies: true,
  defaultCookieAttributes: {
    sameSite: "none",  // ✅ THIS is the correct way!
    secure: true,
    httpOnly: true,
    path: "/",
  },
}
```

## Why `defaultCookieAttributes` is Correct

From the official documentation:

> **`defaultCookieAttributes`**: Default attributes for all cookies

This applies the attributes to **ALL** cookies that Better Auth creates:
- `__Secure-better-auth.session_token`
- `__Secure-better-auth.session_data`
- Any other cookies from plugins

## The Fixed Configuration

```typescript
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "https://minute-intelligent-assistant.onrender.com",
  basePath: "/api/auth",
  
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:8080", 
    "https://minute-intelligent-assistant.onrender.com",
    process.env.FRONTEND_BASE_URL || "https://minute-intelligent-assistant.vercel.app",
  ],
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      prompt: "select_account",
      accessType: "offline",
      scope: [
        "https://www.googleapis.com/auth/meetings.space.settings",
        "https://www.googleapis.com/auth/meetings.space.readonly",
      ],
      redirectURI: `${process.env.BETTER_AUTH_URL || "https://minute-intelligent-assistant.onrender.com"}/api/auth/callback/google`,
    },
  },
  
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },

  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: "none", // Required for cross-origin cookies
      secure: true,
      httpOnly: true,
      path: "/",
    },
  },
});
```

## Deploy and Test

### 1. Commit and Push
```bash
cd /home/bad-dev/minute-intelligent-assistant/backend
git add -A
git commit -m "Fix: Use defaultCookieAttributes for cross-origin cookies (official Better Auth config)"
git push origin main
```

### 2. Wait for Render Deployment
Render will automatically deploy (2-3 minutes)

### 3. Check Logs
After deployment, try signing in and look for:

```
🍪 Setting cookies: [
  '...SameSite=None; Secure; HttpOnly...',  ✅ CORRECT!
  '...SameSite=None; Secure; HttpOnly...'   ✅ CORRECT!
]
```

### 4. Verify in Browser
1. Clear cookies (Ctrl+Shift+Delete)
2. Go to https://minute-intelligent-assistant.vercel.app
3. Sign in with Google
4. Check Storage tab for cookies with `SameSite=None`

## Why This Will Work

**`defaultCookieAttributes`** is the official Better Auth way to set attributes for ALL cookies. This is documented in the [Options Reference](https://www.better-auth.com/docs/reference/options#advanced) under the `advanced` section.

The documentation explicitly shows:
```typescript
advanced: {
  defaultCookieAttributes: {
    httpOnly: true,
    secure: true
  }
}
```

So adding `sameSite: "none"` to these default attributes will apply it to all Better Auth cookies.

## Additional Notes

If you need to customize specific cookies differently, you can combine both:

```typescript
advanced: {
  defaultCookieAttributes: {
    sameSite: "none",  // Default for all
    secure: true,
  },
  cookies: {
    session_token: {
      attributes: {
        maxAge: 3600,  // Override just maxAge for this cookie
      }
    }
  }
}
```

But for our use case, `defaultCookieAttributes` alone is sufficient and cleaner.

## References

- [Better Auth Options Documentation](https://www.better-auth.com/docs/reference/options)
- [Better Auth Express Integration](https://www.better-auth.com/docs/integrations/express)
- [Better Auth Cookies](https://www.better-auth.com/docs/concepts/cookies)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
