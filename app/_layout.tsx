import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LocationProvider } from '../context/LocationContext'; // <--- IMPORT THIS
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

function NavigationGuard() {
  const { user, profile, loading } = useAuth() as AuthContextType;
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (loading || !navigationState?.key) return;
    const currentRoute = segments[0] as string | undefined;

    if (!user) {
      if (currentRoute !== 'login' && currentRoute !== 'verify' && currentRoute !== 'index') {
        router.replace('/login');
      }
      return;
    }

    if (user) {
      if (!profile) {
        if (currentRoute !== 'form') router.replace('/form');
        return;
      }
      if (profile.is_verified) {
        if (['login', 'verify', 'unverified', 'form'].includes(currentRoute || '')) {
          router.replace('/(tabs)');
        }
      } else {
        if (currentRoute !== 'unverified') router.replace('/unverified' as any);
      }
    }
  }, [user, profile, loading, segments, navigationState?.key]);
  return null;
}
// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => { });

function RootLayoutContent() {
  const { loading } = useAuth() as AuthContextType;

  useEffect(() => {
    if (!loading) {
      // Hide splash screen once auth loading is done
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    // 1. WRAP LOCATION PROVIDER HERE
    <LocationProvider>
      <WebSocketProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationGuard />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="verify" />
            <Stack.Screen name="form" />
            <Stack.Screen name="unverified" />
            <Stack.Screen name="job/[id]" />
          </Stack>
        </GestureHandlerRootView>
      </WebSocketProvider>
    </LocationProvider>
  );
}

export default function RootLayoutNav() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}


