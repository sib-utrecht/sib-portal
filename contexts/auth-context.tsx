// "use client"
//
// import { createContext, useContext, useState, useEffect, type ReactNode, SetStateAction } from "react"
// import type { AuthState, PhotoPermission, User } from "../types/user"
// import { api } from "../convex/_generated/api";
// import { useQuery, useMutation } from "convex/react";
//
// interface AuthContextType extends AuthState {
// 	login: (users: User[], email: string, password: string) => Promise<boolean>
// 	logout: () => void
// 	updatePhotoPermission: (permission: PhotoPermission) => void
// }
//
// const AuthContext = createContext<AuthContextType | undefined>(undefined)
//
// const AUTH_STORAGE_KEY = "sib_auth_state"
//
// export function AuthProvider({ children }: { children: ReactNode }) {
// 	const [authState, setAuthState] = useState<AuthState>({
// 		user: null,
// 		isAuthenticated: false,
// 	})
// 	const [isHydrated, setIsHydrated] = useState(false)
//
// 	useEffect(() => {
// 		const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
// 		if (storedAuth) {
// 			try {
// 				const parsedAuth = JSON.parse(storedAuth)
// 				setAuthState(parsedAuth)
// 			} catch (error) {
// 				console.error("Failed to parse stored auth state:", error)
// 				localStorage.removeItem(AUTH_STORAGE_KEY)
// 			}
// 		}
// 		setIsHydrated(true)
// 	}, [])
//
// 	useEffect(() => {
// 		if (isHydrated) {
// 			if (authState.isAuthenticated) {
// 				localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState))
// 			} else {
// 				localStorage.removeItem(AUTH_STORAGE_KEY)
// 			}
// 		}
// 	}, [authState, isHydrated])
//
// 	const login = async (users: User[], email: string, password: string): Promise<boolean> => {
// 		const foundUser = users.find((u) => u.email === email && u.password === password);
// 		if (foundUser === undefined) {
// 			return false
// 		}
// 		const newAuthState = {
// 			user: foundUser,
// 			isAuthenticated: true,
// 		}
// 		setAuthState(newAuthState)
// 		return true
// 	}
//
// 	const logout = () => {
// 		setAuthState({
// 			user: null,
// 			isAuthenticated: false,
// 		})
// 	}
//
// 	const updatePhotoPermission = (permission: PhotoPermission) => {
// 		if (authState.user) {
// 			const updatedUser = { ...authState.user, photoPermission: permission }
// 			const newAuthState = {
// 				...authState,
// 				user: updatedUser,
// 			}
// 			setAuthState(newAuthState);
// 		}
// 	}
//
// 	return (
// 		<AuthContext.Provider
// 			value={{
// 				...authState,
// 				login,
// 				logout,
// 				updatePhotoPermission,
// 			}}
// 		>
// 			{children}
// 		</AuthContext.Provider>
// 	)
// }
//
// export function useAuth() {
// 	const context = useContext(AuthContext)
// 	if (context === undefined) {
// 		throw new Error("useAuth must be used within an AuthProvider")
// 	}
// 	return context
// }
//
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

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  token: string | null;
  login: (username: string, password: string, keepLoggedIn?: boolean) => Promise<void>;
  requestPasswordlessCode: (email: string) => Promise<void>;
  loginWithCode: (email: string, code: string, keepLoggedIn?: boolean) => Promise<void>;
  logout: () => void;
  error: string | null;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// These should be set via environment variables
// const poolData = {
//     UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "",
//     ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || "",
// };
const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
};
// const REGION = import.meta.env.VITE_AWS_REGION || "eu-central-1";
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || "eu-central-1";

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

// Helper function to decode JWT and check for admin group
const isAdminUser = (jwtToken: string): boolean => {
  try {
    const payload = JSON.parse(atob(jwtToken.split(".")[1]));
    const groups = payload["cognito:groups"] || [];
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
      const payload = JSON.parse(atob(jwtToken.split(".")[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      storage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiryTime.toString());
    } catch (error) {
      console.error("Failed to parse token expiry:", error);
    }
  };

  // Helper to clear token from localStorage
  const clearToken = () => {
    setToken(null);
    setIsAuthenticated(false);
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
            if (isAdminUser(jwtToken)) {
              const storage = getTokenStorage();
              setToken(jwtToken);
              storage.setItem(TOKEN_STORAGE_KEY, jwtToken);

              // Update expiry
              try {
                const payload = JSON.parse(atob(jwtToken.split(".")[1]));
                const expiryTime = payload.exp * 1000;
                storage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiryTime.toString());
              } catch (error) {
                console.error("Failed to parse token expiry:", error);
              }

              resolve(true);
            } else {
              clearToken();
              resolve(false);
            }
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

        if (isAdminUser(jwtToken)) {
          // Keep the same refresh token and username
          saveToken(jwtToken, response.AuthenticationResult.RefreshToken || refreshToken, username);
          return true;
        }
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
      console.log("Restoring token");
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
          // Invalid token, clear it
          // clearToken();
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
            if (isAdminUser(jwtToken)) {
              saveToken(jwtToken, refreshToken, cognitoUser.getUsername());
            } else {
              // User is not an admin, sign them out
              cognitoUser.signOut();
              setError("Access denied: Admin privileges required");
            }
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

          // Check if user is in admin group
          // if (!isAdminUser(jwtToken)) {
          //     cognitoUser.signOut();
          //     setError("Access denied: Admin privileges required");
          //     setIsLoading(false);
          //     reject(new Error("Access denied: Admin privileges required"));
          //     return;
          // }

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

  const loginWithCode = async (email: string, code: string, keepLoggedIn = false): Promise<void> => {
    setError(null);
    setIsLoading(true);

    if (!sessionData) {
      setError("No active session. Please request a code first.");
      setIsLoading(false);
      return;
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

        // Check if user is in admin group
        // if (!isAdminUser(jwtToken)) {
        //     setError("Access denied: Admin privileges required");
        //     setIsLoading(false);
        //     setSessionData(null);
        //     throw new Error("Access denied: Admin privileges required");
        // }

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
