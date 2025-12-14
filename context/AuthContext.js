import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext({});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null); // Store Mechanic Profile (Verified status)
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkLoginStatus();
    }, []);

    // 1. Check Login & Fetch Profile on App Start
    const checkLoginStatus = async () => {
        try {
            const cookie = await SecureStore.getItemAsync('session_cookie');

            if (cookie) {
                // A. Check if Session is Valid
                const userRes = await api.get('core/me/');
                if (userRes.data.username || userRes.data.id) {
                    setUser(userRes.data);

                    // B. Fetch Profile for Verification Status
                    await fetchProfile();
                } else {
                    await logout();
                }
            }
        } catch (e) {
            console.log("Auto-login failed:", e);
            await logout();
        } finally {
            setLoading(false);
        }
    };

    // 2. Helper to fetch profile data
    const fetchProfile = async () => {
        try {
            const res = await api.get('/Profile/MechanicProfile/');
            setProfile(res.data);
            console.log("Profile Data:", res.data); // Debugging
        } catch (error) {
            console.error("Failed to fetch profile", error);
        }
    };

    // 3. Login Action
    const login = async (userData, cookieString) => {
        setUser(userData);
        if (cookieString) {
            await SecureStore.setItemAsync('session_cookie', cookieString);
        }
        await fetchProfile(); // Fetch profile immediately after login
    };

    const logout = async () => {
        setUser(null);
        setProfile(null);
        await SecureStore.deleteItemAsync('session_cookie');
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, login, logout, refreshProfile: fetchProfile }}>
            {children}
        </AuthContext.Provider>
    );
}