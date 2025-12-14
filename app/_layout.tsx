import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import "../global.css";

function RootLayoutNav() {
  // 1. Get 'profile' from AuthContext along with 'user'
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Get the current screen name (e.g., 'index', 'dashboard', 'form')
    const currentRoute = segments[0];

    // --- CHECK 1: NOT LOGGED IN ---
    if (!user) {
      // If user is NOT logged in, kick them to Login ('/') 
      // UNLESS they are already on Login ('index') or Verify ('verify') page
      if (currentRoute !== 'index' && currentRoute !== 'verify') {
        router.replace('/');
      }
      return;
    }

    // --- CHECK 2: LOGGED IN ---
    if (user) {
      // If profile data hasn't loaded yet, wait.
      if (!profile) return;

      if (profile.is_verified) {
        // SCENARIO A: Verified Mechanic
        // If they are on Login, Verify, or Unverified screens -> Auto-move to Dashboard
        if (currentRoute === 'index' || currentRoute === 'verify' || currentRoute === 'unverified') {
          router.replace('/dashboard');
        }
      } else {
        // SCENARIO B: Unverified Mechanic
        // Force them to 'unverified' screen
        // BUT allow access to 'form' (so they can actually fill out the KYC!)
        if (currentRoute !== 'unverified' && currentRoute !== 'form') {
          router.replace('/unverified');
        }
      }
    }
  }, [user, profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="form" />

      {/* 3. Register the new screens in the Stack */}
      <Stack.Screen name="unverified" />
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}