import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

/**
 * Firebase Auth Service
 *
 * Handles Firebase authentication for users migrated from Firebase
 * with null password_hash in Supabase.
 */
export class FirebaseAuthService {
  private app: App | null = null;
  private auth: Auth | null = null;

  constructor() {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase(): void {
    try {
      // Check if Firebase app is already initialized
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.app = existingApps[0];
        this.auth = getAuth(this.app);
        return;
      }

      // Get Firebase credentials from environment
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

      if (!projectId || !serviceAccountJson) {
        console.warn('Firebase credentials not found in environment variables');
        return;
      }

      // Parse service account JSON
      const serviceAccount = JSON.parse(serviceAccountJson);

      // Initialize Firebase Admin
      this.app = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });

      this.auth = getAuth(this.app);
      console.log('✓ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      this.app = null;
      this.auth = null;
    }
  }

  /**
   * Verify user credentials against Firebase Auth using REST API
   *
   * Firebase Admin SDK doesn't have a direct method to verify passwords,
   * so we use the Firebase Auth REST API.
   */
  async verifyCredentials(email: string, password: string): Promise<boolean> {
    try {
      // Get Firebase project ID from environment
      const projectId = process.env.FIREBASE_PROJECT_ID?.replace(/'/g, '');

      if (!projectId) {
        console.error('[FIREBASE] FIREBASE_PROJECT_ID environment variable is not configured');
        throw new Error('Firebase project ID not configured');
      }

      console.log(`[FIREBASE] Verifying credentials for ${email} using Firebase Auth REST API...`);

      // Firebase Auth REST API endpoint
      const apiKey = await this.getWebApiKey();
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Unknown error';
        const errorCode = errorData.error?.code || response.status;

        console.error(`[FIREBASE] Auth verification failed for ${email}:`, {
          status: response.status,
          code: errorCode,
          message: errorMessage
        });

        // Common Firebase Auth error codes
        if (errorMessage.includes('INVALID_PASSWORD') || errorMessage.includes('EMAIL_NOT_FOUND')) {
          console.log(`[FIREBASE] Invalid credentials for ${email}`);
          return false;
        }

        if (errorMessage.includes('TOO_MANY_ATTEMPTS')) {
          console.error(`[FIREBASE] Too many failed login attempts for ${email}`);
          throw new Error('Too many failed login attempts. Please try again later.');
        }

        if (errorMessage.includes('USER_DISABLED')) {
          console.error(`[FIREBASE] User account is disabled: ${email}`);
          throw new Error('User account has been disabled');
        }

        // For other errors, log and throw
        console.error(`[FIREBASE] Unexpected Firebase Auth error: ${errorMessage}`);
        throw new Error(`Firebase authentication failed: ${errorMessage}`);
      }

      const data = await response.json();
      const success = !!data.idToken;

      if (success) {
        console.log(`[FIREBASE] Successfully verified credentials for ${email}`);
      }

      return success;
    } catch (error) {
      // If it's an error we already handled and threw, re-throw it
      if (error instanceof Error && error.message.includes('Firebase')) {
        throw error;
      }

      // For unexpected errors, log and throw
      console.error('[FIREBASE] Unexpected error during credential verification:', error);
      throw new Error(`Firebase authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Firebase Web API Key
   *
   * The Web API key is needed for the REST API authentication.
   * You can find it in Firebase Console > Project Settings > Web API Key
   */
  private async getWebApiKey(): Promise<string> {
    const apiKey = process.env.FIREBASE_WEB_API_KEY;

    if (!apiKey) {
      console.error('[FIREBASE] FIREBASE_WEB_API_KEY environment variable is not configured');
      throw new Error('Firebase Web API Key not configured in environment variables');
    }

    return apiKey;
  }

  /**
   * Check if Firebase is properly configured
   */
  isConfigured(): boolean {
    return this.app !== null && this.auth !== null;
  }

  /**
   * Get user by email from Firebase
   *
   * This can be used to check if a user exists in Firebase Auth
   */
  async getUserByEmail(email: string): Promise<any | null> {
    try {
      if (!this.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      const userRecord = await this.auth.getUserByEmail(email);
      return userRecord;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      console.error('Error fetching Firebase user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();
