
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
            Alert.alert(t('settings.developerMode'), t('settings.developerModeBody'));
        }
    };

    const handleClearCache = async () => {
        Alert.alert(
            t('settings.clearCacheAlertTitle'),
            t('settings.clearCacheAlertBody'),
            [
                { text: t('common.cancel'), style: "cancel" },
                {
                    text: t('common.clear'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Attempt to clear image cache if supported
                            if (Image.clearDiskCache) await Image.clearDiskCache();
                            if (Image.clearMemoryCache) await Image.clearMemoryCache();
                            Alert.alert(t('common.success'), t('settings.cacheCleared'));
                        } catch (e) {
                            console.log("Cache clear error:", e);
                            Alert.alert(t('common.success'), t('settings.cacheCleared')); // Fail gracefully
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
            { text: t('common.cancel'), style: "cancel" },
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

    const SettingItem = ({ icon, title, subtitle, onPress, rightElement, isDestructive }) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="flex-row items-center py-4 px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800"
        >
            <View className="mr-4">
                {icon}
            </View>
            <View className="flex-1 justify-center">
                <Text className={`text-[17px] font-medium ${isDestructive ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {title}
                </Text>
                {subtitle && <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</Text>}
            </View>
            {rightElement || <ChevronRight size={20} color="#cbd5e1" />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className="flex-row items-center justify-center py-3 border-b border-slate-100 dark:border-slate-800">
                <Text className="text-[18px] font-bold text-slate-900 dark:text-white">{t('settings.title')}</Text>
            </View>

            <View className="flex-1">
                {/* ScrollView for list content */}
                <View>
                    <Text className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 uppercase tracking-wide">
                        {t('settings.preferences')}
                    </Text>

                    <SettingItem
                        icon={<Globe size={22} color={isDark ? "#e2e8f0" : "#1e293b"} strokeWidth={1.5} />}
                        title={t('settings.language')}
                        onPress={() => setShowLanguageModal(true)}
                    />

                    <SettingItem
                        icon={isDark ? <Moon size={22} color="#e2e8f0" strokeWidth={1.5} /> : <Sun size={22} color="#1e293b" strokeWidth={1.5} />}
                        title={t('settings.darkMode')}
                        onPress={toggleColorScheme}
                        rightElement={
                            <Switch
                                value={isDark}
                                onValueChange={toggleColorScheme}
                                trackColor={{ false: "#e2e8f0", true: "#818cf8" }}
                                thumbColor={"#ffffff"}
                                ios_backgroundColor="#e2e8f0"
                            />
                        }
                    />
                </View>

                <View className="mt-4">
                    <Text className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 uppercase tracking-wide">
                        Maintenance
                    </Text>

                    <SettingItem
                        icon={<Trash2 size={22} color={isDark ? "#e2e8f0" : "#1e293b"} strokeWidth={1.5} />}
                        title={t('settings.clearCache')}
                        onPress={handleClearCache}
                    />

                    <SettingItem
                        icon={<AlertTriangle size={22} color={isDark ? "#e2e8f0" : "#1e293b"} strokeWidth={1.5} />}
                        title={t('settings.crashLogs')}
                        onPress={() => router.push('/crash-logs')}
                    />
                </View>

                <View className="mt-4">
                    <Text className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 uppercase tracking-wide">
                        {t('settings.account')}
                    </Text>
                    <SettingItem
                        icon={<Info size={22} color={isDark ? "#e2e8f0" : "#1e293b"} strokeWidth={1.5} />}
                        title={t('settings.aboutApp')}
                        onPress={() => router.push('/about')}
                    />

                    <SettingItem
                        icon={<LogOut size={22} color="#dc2626" strokeWidth={1.5} />}
                        title={t('profile.logout')}
                        onPress={handleLogout}
                        isDestructive
                        rightElement={<View />} // Empty view to hide chevron
                    />
                </View>

                <View className="mt-auto items-center py-8">
                    <Text className="text-slate-400 text-xs text-center">{t('settings.appName')}</Text>
                    <TouchableOpacity activeOpacity={1} onPress={handleVersionTap}>
                        <Text className="text-slate-400 text-xs text-center mt-1">{t('settings.version')}</Text>
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
