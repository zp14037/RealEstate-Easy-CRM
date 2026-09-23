/**
 * Google OAuth 2.0 Service (Google Identity Services)
 * Direct client-side authentication for Google Calendar API
 */

export const GOOGLE_CLIENT_ID = 
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || 
  '290545989059-p9hs8gi7se1e9be7h5k32nkpm4mcjj1i.apps.googleusercontent.com';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

const STORAGE_KEY_TOKEN = 'xpotential_google_access_token';
const STORAGE_KEY_TOKEN_EXPIRY = 'xpotential_google_token_expiry';
const STORAGE_KEY_USER = 'xpotential_google_user_profile';

export interface GoogleUserProfile {
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
}

let tokenClientInstance: any = null;

/**
 * Ensures Google Identity Services (GSI) script is loaded
 */
function waitForGoogleGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }

    let retries = 0;
    const interval = setInterval(() => {
      retries++;
      if ((window as any).google?.accounts?.oauth2) {
        clearInterval(interval);
        resolve();
      } else if (retries > 30) {
        clearInterval(interval);
        reject(new Error('Google Identity Services script failed to load. Check your internet connection.'));
      }
    }, 100);
  });
}

/**
 * Get current stored Access Token if not expired
 */
export function getStoredAccessToken(): string | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
    if (!token || !expiry) return null;

    if (Date.now() > parseInt(expiry, 10)) {
      // Token expired
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Get current stored Google User Profile
 */
export function getStoredGoogleUser(): GoogleUserProfile | null {
  try {
    const userStr = localStorage.getItem(STORAGE_KEY_USER);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

/**
 * Signs in with Google using popup and requests Calendar permissions
 */
export async function signInWithGoogle(): Promise<{ token: string; user: GoogleUserProfile }> {
  await waitForGoogleGsi();

  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;

      tokenClientInstance = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          const accessToken = tokenResponse.access_token;
          const expiresIn = parseInt(tokenResponse.expires_in, 10) || 3599;
          const expiryTimestamp = Date.now() + (expiresIn - 60) * 1000;

          localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
          localStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, expiryTimestamp.toString());

          // Fetch user profile info
          let userProfile: GoogleUserProfile = {};
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              userProfile = {
                id: data.sub,
                name: data.name,
                email: data.email,
                picture: data.picture,
              };
              localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userProfile));
            }
          } catch (e) {
            console.warn('Failed to fetch Google user profile info', e);
          }

          window.dispatchEvent(new CustomEvent('crm-google-auth-changed', {
            detail: { loggedIn: true, user: userProfile }
          }));

          resolve({ token: accessToken, user: userProfile });
        },
      });

      // Prompt account selection
      tokenClientInstance.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Sign out of Google Calendar integration
 */
export function signOutGoogle(): void {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (token && (window as any).google?.accounts?.oauth2) {
    try {
      (window as any).google.accounts.oauth2.revoke(token, () => {});
    } catch (e) {
      console.warn('Error revoking token', e);
    }
  }

  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEY_USER);

  window.dispatchEvent(new CustomEvent('crm-google-auth-changed', {
    detail: { loggedIn: false, user: null }
  }));
}
