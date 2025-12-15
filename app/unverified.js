
import { useRouter } from 'expo-router';
import { AlertCircle, BadgeCheck, Clock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function UnverifiedScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { profile, refreshProfile, logout } = useAuth();
    const [checking, setChecking] = useState(false);

    // Check status periodically (in case admin verifies them while they wait)
    useEffect(() => {
        refreshProfile();
    }, []);

    const handleRefresh = async () => {
        setChecking(true);
        await refreshProfile();
        setChecking(false);
    };

    const renderContent = () => {
        if (!profile) {
            return <ActivityIndicator size="large" color="#2563eb" />;
        }

        const isVerified = profile.is_verified;
        const hasSubmittedKyc = !!profile.KYC_document; // Convert to boolean

        // STATE 1: VERIFIED
        if (isVerified) {
            return (
                <View className="items-center p-6 bg-white rounded-2xl shadow-sm w-full">
                    <BadgeCheck size={80} color="#16a34a" />
                    <Text className="text-2xl font-bold text-green-600 mt-4 mb-2 text-center">
                        {t('unverified.verified')}
                    </Text>
                    <Text className="text-slate-600 text-center mb-6">
                        {t('unverified.verifiedDesc')}
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.replace('/dashboard')}
                        className="bg-blue-600 w-full py-3 rounded-xl"
                    >
                        <Text className="text-white text-center font-bold text-lg">{t('unverified.goToDashboard')}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // STATE 2: PENDING (Submitted but waiting)
        if (hasSubmittedKyc) {
            return (
                <View className="items-center p-6 bg-white rounded-2xl shadow-sm w-full">
                    <Clock size={80} color="#ca8a04" />
                    <Text className="text-2xl font-bold text-yellow-600 mt-4 mb-2 text-center">
                        {t('unverified.pending')}
                    </Text>
                    <Text className="text-slate-600 text-center mb-6">
                        {t('unverified.pendingDesc')}
                    </Text>
                    <TouchableOpacity
                        onPress={handleRefresh}
                        className="bg-slate-100 border border-slate-300 w-full py-3 rounded-xl flex-row justify-center items-center"
                    >
                        {checking ? <ActivityIndicator color="#000" /> : <Text className="text-slate-700 font-bold">{t('unverified.checkStatus')}</Text>}
                    </TouchableOpacity>
                </View>
            );
        }

        // STATE 3: NOT SUBMITTED
        return (
            <View className="items-center p-6 bg-white rounded-2xl shadow-sm w-full">
                <AlertCircle size={80} color="#dc2626" />
                <Text className="text-2xl font-bold text-red-600 mt-4 mb-2 text-center">
                    {t('unverified.notVerified')}
                </Text>
                <Text className="text-slate-600 text-center mb-6">
                    {t('unverified.notVerifiedDesc')}
                </Text>
                <TouchableOpacity
                    onPress={() => router.push('/form')}
                    className="bg-yellow-500 w-full py-3 rounded-xl mb-3"
                >
                    <Text className="text-white text-center font-bold text-lg">{t('unverified.completeKyc')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={logout}>
                    <Text className="text-slate-400 text-sm">{t('unverified.logout')}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center p-4">
            {renderContent()}
        </SafeAreaView>
    );
}