import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import {
    LayoutDashboard,
    Settings,
    User,
    Wallet
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWebSocket } from '../../context/WebSocketContext';

export default function TabLayout() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { t } = useTranslation();
    const { job } = useWebSocket() as any;
    const insets = useSafeAreaInsets();

    const colors = {
        bg: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        active: isDark ? '#60a5fa' : '#2563eb',
        inactive: isDark ? '#94a3b8' : '#64748b',
        danger: isDark ? '#ef4444' : '#dc2626',
    };

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: true,
                tabBarStyle: {
                    height: 60 + (Platform.OS === 'ios' ? insets.bottom : 15),
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                    borderTopWidth: 0,
                    elevation: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                },
                tabBarLabelStyle: styles.label,
                tabBarActiveTintColor: colors.active,
                tabBarInactiveTintColor: colors.inactive,
                tabBarBackground: () => (
                    <BlurView
                        intensity={Platform.OS === 'ios' ? 90 : 100}
                        tint={isDark ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                ),
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t('tabs.dashboard'),
                    tabBarIcon: ({ color }) => (
                        <LayoutDashboard size={22} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="history"
                options={{
                    title: t('tabs.earnings'),
                    tabBarIcon: ({ color }) => <Wallet size={22} color={color} />,
                }}
            />



            <Tabs.Screen
                name="profile"
                options={{
                    title: t('tabs.profile'),
                    tabBarIcon: ({ color }) => <User size={22} color={color} />,
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{
                    title: t('tabs.settings'),
                    tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
                }}
            />


        </Tabs>
    );
}

const styles = StyleSheet.create({
    label: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    fab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
});