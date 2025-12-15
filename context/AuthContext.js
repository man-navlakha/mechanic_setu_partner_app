import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext({});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        try {
            setError(null);

            // Check for saved session (we save user data directly as fallback)
            const savedUserData = await SecureStore.getItemAsync('user_data');
            console.log("[Auth] Checking saved user data:", savedUserData ? "Found" : "Missing");

            if (savedUserData) {
                // Parse saved user data
                const parsedUser = JSON.parse(savedUserData);
                console.log("[Auth] Restored user from storage:", parsedUser.id);

                // Validate with backend - try to fetch current user info
                console.log("[Auth] Validating session with backend...");
                try {
                    const userRes = await api.get('core/me/');
                    console.log("[Auth] core/me/ response:", JSON.stringify(userRes.data, null, 2));

                    if (userRes.data && (userRes.data.username || userRes.data.id || userRes.data.email)) {
                        console.log("[Auth] Session valid. Setting user.");
                        setUser(userRes.data);
                        await fetchProfile();
                    } else {
                        console.log("[Auth] User data invalid. Logging out.");
                        await logout();
                        setError("Session expired. Please login again.");
                    }
                } catch (apiError) {
                    // If API fails with 401, session is expired
                    if (apiError.response?.status === 401 || apiError.response?.status === 403) {
                        console.log("[Auth] Session expired (401/403). Logging out.");
                        await logout();
                        setError("Session expired. Please login again.");
                    } else {
                        // Other API errors - might be network, keep user logged in but show error
                        console.log("[Auth] API error, using cached user data:", apiError.message);
                        setUser(parsedUser);
                        await fetchProfile();
                    }
                }
            } else {
                console.log("[Auth] No saved session. Keeping user logged out.");
            }
        } catch (e) {
            console.log("[Auth] checkLoginStatus error:", e);
            setError("Failed to restore session.");
            await logout();
        } finally {
            setLoading(false);
        }
    };

    // Helper to fetch profile data
    const fetchProfile = async () => {
        try {
            console.log("[Auth] Fetching MechanicProfile...");
            const res = await api.get('/Profile/MechanicProfile/');
            console.log("[Auth] Profile res:", res.status);

            if (res.data && res.data.mobile_number) {
                setProfile(res.data);
            } else {
                console.log("Profile incomplete (Missing mobile number). Treating as New User.");
                setProfile(null);
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log("User has no profile yet (404)");
                setProfile(null);
            } else {
                console.error("Failed to fetch profile:", error);
            }
        }
    };

    // Login Action - Now saves user data directly for session persistence
    const login = async (userData, cookieString) => {
        console.log("[Auth] Login called with userData:", userData);

        // Set user in state
        setUser(userData);
        setError(null);

        // Save user data to SecureStore for persistence
        await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
        console.log("[Auth] User data saved to SecureStore");

        // Also save cookie if provided (for API calls)
        if (cookieString && cookieString.length > 0) {
            await SecureStore.setItemAsync('session_cookie', cookieString);
            console.log("[Auth] Cookie saved to SecureStore");
        }

        // Fetch profile immediately after login
        await fetchProfile();
    };

    const logout = async () => {
        console.log("[Auth] Logging out...");
        setUser(null);
        setProfile(null);
        await SecureStore.deleteItemAsync('session_cookie');
        await SecureStore.deleteItemAsync('user_data');
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, error, login, logout, refreshProfile: fetchProfile }}>
            {children}
        </AuthContext.Provider>
    );
}