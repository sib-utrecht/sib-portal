import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

/** Shape of the value provided by {@link AuthContext} and consumed via {@link useAuth}. */
interface AuthContextType {
  /** Whether a user is currently signed in. */
  isAuthenticated: boolean;
  /** Whether the signed-in user belongs to the Cognito `"admins"` group. */
  isAdmin: boolean;
  /** `true` while the initial auth check or a login/logout operation is in progress. */
  isLoading: boolean;
  /** The raw Cognito ID token (JWT) for the current session, or `null` when signed out. */
  token: string | null;
  /**
   * Signs in with a Cognito username (email) and password.
   * @param keepLoggedIn - When `true`, tokens are persisted in `localStorage`; otherwise `sessionStorage`.
   */
  login: (username: string, password: string, keepLoggedIn?: boolean) => Promise<void>;
  /**
   * Initiates a passwordless email OTP flow by sending a one-time code to the given address.
   * Call {@link loginWithCode} with the received code to complete sign-in.
   */
  requestPasswordlessCode: (email: string) => Promise<void>;
  /**
   * Completes a passwordless sign-in by submitting the OTP code sent to `email`.
   * {@link requestPasswordlessCode} must have been called first.
   * @param keepLoggedIn - When `true`, tokens are persisted in `localStorage`; otherwise `sessionStorage`.
   */
  loginWithCode: (email: string, code: string, keepLoggedIn?: boolean) => Promise<void>;
  /** Signs out the current user and clears all stored tokens. */
  logout: () => void;
  /** The most recent authentication error message, or `null` when there is no error. */
  error: string | null;
  /**
   * Initiates a Cognito "forgot password" flow for the given email address.
   * On success Cognito sends a reset code to that address; call {@link confirmResetPassword} next.
   */
  resetPassword: (email: string) => Promise<void>;
  /**
   * Completes a password-reset flow by submitting the verification code and choosing a new password.
   * @param code        - The reset code sent to the user's email by {@link resetPassword}.
   * @param newPassword - The desired new password.
   */
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
if (!userPoolId) {
  throw new Error("Missing required environment variable: VITE_COGNITO_USER_POOL_ID");
}
if (!clientId) {
  throw new Error("Missing required environment variable: VITE_COGNITO_CLIENT_ID");
}

const poolData = {
  UserPoolId: userPoolId as string,
  ClientId: clientId as string,
};
const REGION = import.meta.env.VITE_AWS_REGION || "eu-central-1";

// Returns a new CognitoUserPool instance configured to use the given storage, so the
// SDK's own CognitoIdentityServiceProvider.* keys are written to the same location
// as our custom token keys rather than always defaulting to localStorage.
const makeUserPool = (storage: Storage) => new CognitoUserPool({ ...poolData, Storage: storage });

// Convenience wrapper: pool backed by the user's current keep-logged-in preference.
const getUserPool = () => makeUserPool(getTokenStorage());

// Create AWS SDK client for USER_AUTH flow
const cognitoClient = new CognitoIdentityProviderClient({
  region: REGION,
});

// Correctly decodes the payload of a JWT token, handling base64url encoding
// (which uses '-' and '_' instead of '+' and '/', and omits padding).
const decodeJwtPayload = (jwtToken: string): Record<string, unknown> => {
  const base64Url = jwtToken.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(atob(padded));
};

// Helper function to decode JWT and check for admin group
const isAdminUser = (jwtToken: string): boolean => {
  try {
    const payload = decodeJwtPayload(jwtToken);
    const groups = (payload["cognito:groups"] as string[]) || [];
    return groups.includes("admins");
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return false;
  }
};

const TOKEN_STORAGE_KEY = "cognito_jwt_token";
const REFRESH_TOKEN_STORAGE_KEY = "cognito_refresh_token";
const USERNAME_STORAGE_KEY = "cognito_username";
const TOKEN_EXPIRY_STORAGE_KEY = "cognito_token_expiry";
const KEEP_LOGGED_IN_KEY = "cognito_keep_logged_in";

// Returns the storage used for persisting tokens based on user preference.
// Defaults to sessionStorage when the preference key is absent.
const getTokenStorage = (): Storage =>
  localStorage.getItem(KEEP_LOGGED_IN_KEY) === "true" ? localStorage : sessionStorage;

// Refresh token 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Provides authentication state and Cognito operations to the React component
 * tree.  Wrap your application (or a subtree) with this provider and consume
 * the context via {@link useAuth}.
 *
 * On mount the provider attempts to restore a previous session from storage
 * (preferring `localStorage` when "keep me logged in" was selected, falling
 * back to `sessionStorage`).  If the stored token is within 5 minutes of
 * expiry it is refreshed automatically.  A periodic check runs every minute
 * while the user is authenticated to keep tokens fresh.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionData, setSessionData] = useState<string | null>(null); // Store session for OTP flow

  // Helper to save token to appropriate storage based on keep-logged-in preference.
  // When keepLoggedIn is not supplied, the existing stored preference is used so
  // that refresh/restore paths do not accidentally change the user's selection.
  const saveToken = (
    jwtToken: string,
    refreshToken?: string,
    username?: string,
    keepLoggedIn = localStorage.getItem(KEEP_LOGGED_IN_KEY) === "true",
  ) => {
    setToken(jwtToken);
    setIsAuthenticated(true);
    setIsAdmin(isAdminUser(jwtToken));

    localStorage.setItem(KEEP_LOGGED_IN_KEY, keepLoggedIn.toString());
    const storage = keepLoggedIn ? localStorage : sessionStorage;

    storage.setItem(TOKEN_STORAGE_KEY, jwtToken);

    if (refreshToken) {
      storage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }

    if (username) {
      storage.setItem(USERNAME_STORAGE_KEY, username);
    }

    // Calculate and store token expiry
    try {
      const payload = decodeJwtPayload(jwtToken);
      const expiryTime = (payload.exp as number) * 1000; // Convert to milliseconds
      storage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiryTime.toString());
    } catch (error) {
      console.error("Failed to parse token expiry:", error);
    }
  };

  // Helper to clear token from localStorage
  const clearToken = () => {
    setToken(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem(TOKEN_STORAGE_KEY);
      storage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      storage.removeItem(USERNAME_STORAGE_KEY);
      storage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
    });
    localStorage.removeItem(KEEP_LOGGED_IN_KEY);
  };

  // Helper to check if token needs refresh
  const needsRefresh = (): boolean => {
    const expiryStr = getTokenStorage().getItem(TOKEN_EXPIRY_STORAGE_KEY);
    if (!expiryStr) return false;

    const expiryTime = parseInt(expiryStr, 10);
    const now = Date.now();

    // Refresh if we're within the buffer time of expiry
    return expiryTime - now < REFRESH_BUFFER_MS;
  };

  // Helper to refresh token using refresh token
  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = getTokenStorage().getItem(REFRESH_TOKEN_STORAGE_KEY);
    const username = getTokenStorage().getItem(USERNAME_STORAGE_KEY);

    if (!refreshToken || !username) {
      return false;
    }

    try {
      // For password-based auth, use Cognito SDK
      const cognitoUser = getUserPool().getCurrentUser();
      if (cognitoUser) {
        return new Promise((resolve) => {
          cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session || !session.isValid()) {
              clearToken();
              resolve(false);
              return;
            }

            const jwtToken = session.getIdToken().getJwtToken();
            const sessionRefreshToken = session.getRefreshToken().getToken();
            saveToken(jwtToken, sessionRefreshToken);
            setIsAuthenticated(true);

            resolve(true);
          });
        });
      }

      // For email OTP auth, use AWS SDK InitiateAuth with REFRESH_TOKEN
      const command = new InitiateAuthCommand({
        ClientId: poolData.ClientId,
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await cognitoClient.send(command);

      if (response.AuthenticationResult?.IdToken) {
        const jwtToken = response.AuthenticationResult.IdToken;
        // Keep the same refresh token and username
        saveToken(jwtToken, response.AuthenticationResult.RefreshToken || refreshToken, username);
        return true;
      }

      clearToken();
      return false;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      clearToken();
      return false;
    }
  };

  // Check if user is already authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      // First, try to restore from localStorage
      const storedToken = getTokenStorage().getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        // Check if token needs refresh
        if (needsRefresh()) {
          const refreshed = await refreshAccessToken();
          setIsLoading(false);
          if (refreshed) return;
          // If refresh failed, fall through to clear and re-check
        } else if (isAdminUser(storedToken)) {
          // Token is still valid
          setToken(storedToken);
          setIsAuthenticated(true);
          setIsAdmin(true);
          setIsLoading(false);
          return;
        } else {
          setToken(storedToken);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to checking Cognito session
      const cognitoUser = getUserPool().getCurrentUser();
      if (cognitoUser) {
        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session) {
            setIsLoading(false);
            return;
          }
          if (session.isValid()) {
            const jwtToken = session.getIdToken().getJwtToken();
            const refreshToken = session.getRefreshToken().getToken();
            saveToken(jwtToken, refreshToken, cognitoUser.getUsername());
            setIsAdmin(isAdminUser(jwtToken));
          }
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRefresh = async () => {
      if (needsRefresh()) {
        await refreshAccessToken();
      }
    };

    // Check every minute
    const interval = setInterval(checkAndRefresh, 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = async (username: string, password: string, keepLoggedIn = false): Promise<void> => {
    setError(null);
    setIsLoading(true);

    // Compute storage directly from the parameter so we don't mutate KEEP_LOGGED_IN_KEY
    // before the auth completes. saveToken() sets the preference on successful auth.
    const loginStorage: Storage = keepLoggedIn ? localStorage : sessionStorage;

    const authenticationData = {
      Username: username,
      Password: password,
    };

    const authenticationDetails = new AuthenticationDetails(authenticationData);

    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: makeUserPool(loginStorage),
      Storage: loginStorage,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          const jwtToken = session.getIdToken().getJwtToken();
          const refreshToken = session.getRefreshToken().getToken();

          saveToken(jwtToken, refreshToken, username, keepLoggedIn);
          setIsLoading(false);
          resolve();
        },
        onFailure: (err: Error) => {
          setError(err.message);
          setIsLoading(false);
          reject(err);
        },
      });
    });
  };

  const logout = () => {
    const cognitoUser = getUserPool().getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    clearToken();
  };

  const requestPasswordlessCode = async (email: string): Promise<void> => {
    setError(null);
    setIsLoading(true);

    try {
      const command = new InitiateAuthCommand({
        ClientId: poolData.ClientId,
        AuthFlow: "USER_AUTH",
        AuthParameters: {
          USERNAME: email,
          PREFERRED_CHALLENGE: "EMAIL_OTP",
        },
      });

      const response = await cognitoClient.send(command);

      if (response.Session) {
        // Store session for the next step
        setSessionData(response.Session);
        setIsLoading(false);
      } else {
        throw new Error("Failed to initiate authentication");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
      setIsLoading(false);
      throw err;
    }
  };

  const loginWithCode = async (
    email: string,
    code: string,
    keepLoggedIn = false,
  ): Promise<void> => {
    setError(null);
    setIsLoading(true);

    if (!sessionData) {
      setError("No active session. Please request a code first.");
      setIsLoading(false);
      throw new Error("No active session. Please request a code first.");
    }

    try {
      const command = new RespondToAuthChallengeCommand({
        ClientId: poolData.ClientId,
        ChallengeName: "EMAIL_OTP",
        Session: sessionData,
        ChallengeResponses: {
          USERNAME: email,
          EMAIL_OTP_CODE: code,
        },
      });

      const response = await cognitoClient.send(command);

      if (response.AuthenticationResult?.IdToken) {
        const jwtToken = response.AuthenticationResult.IdToken;
        const refreshToken = response.AuthenticationResult.RefreshToken;

        saveToken(jwtToken, refreshToken, email, keepLoggedIn);
        setSessionData(null);
        setIsLoading(false);
      } else {
        throw new Error("Failed to complete authentication");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
      setIsLoading(false);
      throw err;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    setError(null);
    setIsLoading(true);

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: getUserPool(),
    });

    return new Promise((resolve, reject) => {
      cognitoUser.forgotPassword({
        // Called when Cognito has sent the verification code to the user.
        // Resolve here so the UI can transition to the code-entry step.
        inputVerificationCode: () => {
          setIsLoading(false);
          resolve();
        },
        // onSuccess fires after the full confirmPassword flow; not used here.
        onSuccess: () => {
          setIsLoading(false);
        },
        onFailure: (err: Error) => {
          setError(err.message);
          setIsLoading(false);
          reject(err);
        },
      });
    });
  };

  const confirmResetPassword = async (
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> => {
    setError(null);
    setIsLoading(true);

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: getUserPool(),
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          setIsLoading(false);
          resolve();
        },
        onFailure: (err: Error) => {
          setError(err.message);
          setIsLoading(false);
          reject(err);
        },
      });
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        isLoading,
        token,
        login,
        requestPasswordlessCode,
        loginWithCode,
        logout,
        error,
        resetPassword,
        confirmResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Returns the authentication context value.
 * Must be called inside a component that is a descendant of {@link AuthProvider}.
 *
 * @throws If called outside of an `AuthProvider` tree.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
