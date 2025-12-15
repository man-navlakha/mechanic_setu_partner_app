import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import "../global.css";
import "../i18n/i18n";

// Define a minimal type for the AuthContext since it's in JS
interface AuthContextType {
  user: any;
  profile: any;
  loading: boolean;
  login: (userData: any, cookieString?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

function RootLayoutNav() {
  const { user, profile, loading } = useAuth() as AuthContextType;
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log("[Layout] Navigation check - loading:", loading, "user:", !!user, "profile:", !!profile, "currentRoute:", segments[0]);

    if (loading) {
      console.log("[Layout] Still loading, skipping navigation");
      return;
    }

    const currentRoute = segments[0] as string | undefined;

    // --- CASE 1: NOT LOGGED IN ---
    if (!user) {
      console.log("[Layout] No user - redirecting to login");
      // Allow 'index' (splash), 'login', and 'verify'
      if (currentRoute !== 'index' && currentRoute !== 'login' && currentRoute !== 'verify') {
        router.replace('/login');
      }

      // If we are on 'index' (or undefined/root) and not loading, we should move to 'login'
      if ((currentRoute === 'index' || currentRoute === undefined) && !loading) {
        router.replace('/login');
      }
      return;
    }

    // --- CASE 2: LOGGED IN ---
    if (user) {
      console.log("[Layout] User logged in. Profile:", profile ? "exists" : "null", "is_verified:", profile?.is_verified);

      // A. Profile is Null (New User OR Missing Mobile Number)
      if (!profile) {
        console.log("[Layout] No profile - redirecting to form");
        // Force them to the Form to complete profile
        if (currentRoute !== 'form') {
          router.replace('/form');
        }
        return;
      }

      // B. Profile Exists (Has Mobile Number) -> Check Verification
      if (profile.is_verified) {
        console.log("[Layout] Profile verified - should go to dashboard, currentRoute:", currentRoute);
        // Verified -> Go to Dashboard (if on intro screens OR undefined/root)
        // Added 'login' to the list of screens to redirect FROM
        if (currentRoute === undefined || currentRoute === 'index' || currentRoute === 'login' || currentRoute === 'verify' || currentRoute === 'unverified' || currentRoute === 'form') {
          console.log("[Layout] Redirecting to dashboard");
          router.replace('/dashboard');
        }
      } else {
        console.log("[Layout] Profile NOT verified - redirecting to unverified");
        // Unverified -> Go to Unverified Screen
        if (currentRoute !== 'unverified') {
          router.replace('/unverified' as any);
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
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="form" />
      <Stack.Screen name="unverified" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <WebSocketProvider>
          <RootLayoutNav />
        </WebSocketProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}