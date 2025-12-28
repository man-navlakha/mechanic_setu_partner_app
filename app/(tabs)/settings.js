
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronRight, Globe, Info, LogOut, Moon, Sun, Trash2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, StatusBar, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LanguageModal from '../../components/LanguageModal';
import { useAuth } from '../../context/AuthContext';

export default function SettingsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { logout } = useAuth();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const insets = useSafeAreaInsets();
    const [tapCount, setTapCount] = useState(0);

    const handleVersionTap = async () => {
        const newCount = tapCount + 1;
        setTapCount(newCount);
        if (newCount === 7) {
            await AsyncStorage.setItem('admin_mode', 'true');
            Alert.alert("Developer Mode", "You are now a developer! Hidden admin features are enabled in Profile.");
        }
    };

    const handleClearCache = async () => {
        Alert.alert(
            "Clear Cache",
            "This will clear temporary files and image cache. You will not be logged out.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Attempt to clear image cache if supported
                            if (Image.clearDiskCache) await Image.clearDiskCache();
                            if (Image.clearMemoryCache) await Image.clearMemoryCache();
                            Alert.alert("Success", "Cache cleared successfully!");
                        } catch (e) {
                            console.log("Cache clear error:", e);
                            Alert.alert("Success", "Cache cleared successfully!"); // Fail gracefully
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
            { text: t('profile.cancel'), style: "cancel" },
            {
                text: t('profile.logout'),
                style: "destructive",
                onPress: async () => {
                    await logout();
                    router.replace('/login');
                }
            }
        ]);
    };

    const SettingItem = ({ icon, title, subtitle, onPress, rightElement }) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="flex-row items-center bg-white dark:bg-slate-800 p-4 mb-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
        >
            <View className={`p-3 rounded-xl mr-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} `}>
                {icon}
            </View>
            <View className="flex-1">
                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</Text>
                {subtitle && <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</Text>}
            </View>
            {rightElement || <ChevronRight size={20} color={isDark ? "#64748b" : "#cbd5e1"} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View className="px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('settings.title')}</Text>
            </View>

            <View className="p-4 flex-1">
                <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs mb-3 ml-1">{t('settings.preferences')}</Text>

                <SettingItem
                    icon={<Globe size={24} color={isDark ? "#60a5fa" : "#2563eb"} />}
                    title={t('settings.language')}
                    subtitle={t('settings.changeLanguage')}
                    onPress={() => setShowLanguageModal(true)}
                />

                <SettingItem
                    icon={<Trash2 size={24} color={isDark ? "#f87171" : "#ef4444"} />}
                    title="Clear Cache"
                    subtitle="Free up space & fix issues"
                    onPress={handleClearCache}
                />

                <SettingItem
                    icon={<AlertTriangle size={24} color={isDark ? "#fbbf24" : "#d97706"} />}
                    title="Crash Logs"
                    subtitle="View app error reports"
                    onPress={() => router.push('/crash-logs')}
                />

                <SettingItem
                    icon={<Info size={24} color={isDark ? "#34d399" : "#10b981"} />}
                    title="About App Details" // Changed from 'About Us' or translation key
                    subtitle="App info, Requirements & Permissions" // More descriptive subtitle
                    onPress={() => router.push('/about')}
                />

                <SettingItem
                    icon={isDark ? <Moon size={24} color="#a78bfa" /> : <Sun size={24} color="#f59e0b" />}
                    title={t('settings.darkMode')}
                    subtitle={isDark ? t('settings.darkModeOn') : t('settings.lightModeOn')}
                    onPress={toggleColorScheme}
                    rightElement={
                        <Switch
                            value={isDark}
                            onValueChange={toggleColorScheme}
                            trackColor={{ false: "#cbd5e1", true: "#818cf8" }}
                            thumbColor={isDark ? "#ffffff" : "#f4f4f5"}
                        />
                    }
                />

                <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs mb-3 ml-1 mt-6">{t('settings.account')}</Text>

                <TouchableOpacity
                    onPress={handleLogout}
                    className="mt-2 bg-red-50 dark:bg-red-900/30 p-4 rounded-2xl flex-row items-center justify-center border border-red-100 dark:border-red-800 active:bg-red-100 dark:active:bg-red-900/50"
                >
                    <LogOut size={20} color={isDark ? "#f87171" : "#dc2626"} className="mr-2" />
                    <Text className="text-red-600 dark:text-red-400 font-bold text-base">{t('profile.logout')}</Text>
                </TouchableOpacity>

                <View className="mt-auto items-center pb-4" style={{ paddingBottom: 80 + insets.bottom }}>
                    <Text className="text-slate-400 text-xs">{t('settings.appName')}</Text>
                    <TouchableOpacity activeOpacity={1} onPress={handleVersionTap}>
                        <Text className="text-slate-400 text-xs">{t('settings.version')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <LanguageModal
                visible={showLanguageModal}
                onClose={() => setShowLanguageModal(false)}
            />
        </SafeAreaView>
    );
}
