import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Safe Storage Helper
export const safeStorage = {
    getItem: async (key) => {
        try {
            if (Platform.OS === 'web') {
                return await AsyncStorage.getItem(key);
            }
            return await SecureStore.getItemAsync(key);
        } catch (e) {
            console.error('Storage Get Error', e);
            return null;
        }
    },
    setItem: async (key, value) => {
        try {
            if (Platform.OS === 'web') {
                return await AsyncStorage.setItem(key, value);
            }
            return await SecureStore.setItemAsync(key, value);
        } catch (e) {
            console.error('Storage Set Error', e);
        }
    },
    deleteItem: async (key) => {
        try {
            if (Platform.OS === 'web') {
                return await AsyncStorage.removeItem(key);
            }
            return await SecureStore.deleteItemAsync(key);
        } catch (e) {
            console.error('Storage Delete Error', e);
        }
    }
};

export default safeStorage;
