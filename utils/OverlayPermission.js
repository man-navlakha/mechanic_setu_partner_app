// utils/OverlayPermission.js
import { Linking, Platform } from 'react-native';

// Safely import react-native-permissions
let Permissions;
try {
    Permissions = require('react-native-permissions');
} catch (e) {
    console.warn("react-native-permissions not found. This feature requires a Development Build.");
}

export const checkOverlayPermission = async () => {
    if (Platform.OS !== 'android') return true;

    // If running in Expo Go, the native module won't exist
    if (!Permissions || !Permissions.check) {
        console.log("[Overlay] Permission check skipped: Native module not available (Expo Go).");
        return false;
    }

    try {
        const permission = Permissions.PERMISSIONS.ANDROID.SYSTEM_ALERT_WINDOW;
        if (!permission) {
            // SYSTEM_ALERT_WINDOW is not supported by react-native-permissions in this version
            console.warn("[Overlay] SYSTEM_ALERT_WINDOW permission constant is undefined. Skipping check.");
            return false;
        }

        const status = await Permissions.check(permission);
        return status === Permissions.RESULTS.GRANTED;
    } catch (error) {
        console.error('[Overlay] Check failed:', error);
        return false;
    }
};

export const requestOverlayPermission = () => {
    if (Platform.OS === 'android') {
        // This is a standard Android Intent that often works without native modules
        Linking.openSettings();
    }
};