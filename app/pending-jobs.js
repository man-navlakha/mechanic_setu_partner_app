import { useRouter } from 'expo-router';
import { Bike, Car, MapPin, Truck, User, VolumeOff, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWebSocket } from '../context/WebSocketContext';

// --- Helper: Vehicle Icon ---
const getVehicleIcon = (type, isDark) => {
    const t = type?.toLowerCase();
    const color = isDark ? "#60a5fa" : "#2563eb";
    if (t?.includes('bike') || t?.includes('motorcycle')) return <Bike size={18} color={color} />;
    if (t?.includes('truck')) return <Truck size={18} color={color} />;
    return <Car size={18} color={color} />;
};

// --- Job Card Component (Matching JobNotificationPopup Style) ---
const JobCard = ({ job, onAccept, onReject, isDark, t }) => {
    const [accepting, setAccepting] = useState(false);

    const handleAccept = async () => {
        setAccepting(true);
        await onAccept(job.id);
        setAccepting(false);
    };

    return (
        <View
            className="bg-white dark:bg-slate-800 rounded-2xl mx-4 mb-3 overflow-hidden"
            style={{
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
            }}
        >
            {/* Card Content */}
            <View className="p-5">
                {/* Vehicle Type & Problem */}
                <View className="flex-row items-center mb-2">
                    {getVehicleIcon(job.vehical_type, isDark)}
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">
                        {job.vehical_type || t('jobPopup.vehicle')}
                    </Text>
                </View>

                {/* Problem Title and Price Badge */}
                <View className="flex-row justify-between items-start mb-3">
                    <Text className="text-xl font-black text-slate-900 dark:text-slate-100 flex-1 mr-3" numberOfLines={2}>
                        {job.problem || t('jobPopup.unknownIssue')}
                    </Text>
                    <View className="bg-blue-500 px-3 py-1.5 rounded-lg">
                        <Text className="text-white font-bold text-sm">
                            ₹{job.price || '73'}
                        </Text>
                        <Text className="text-white/80 text-[10px] font-semibold">
                            #{job.id}
                        </Text>
                    </View>
                </View>

                {/* Distance Badge */}
                {job.distance && (
                    <View className="bg-green-100 dark:bg-green-900/30 self-start px-3 py-1 rounded-lg mb-3 flex-row items-center">
                        <MapPin size={12} color="#22c55e" />
                        <Text className="text-xs font-bold text-green-700 dark:text-green-400 ml-1">
                            {job.distance} Km
                        </Text>
                    </View>
                )}

                {/* Location */}
                <View className="flex-row items-start mb-3">
                    <MapPin size={16} color={isDark ? "#94a3b8" : "#64748b"} style={{ marginTop: 2 }} />
                    <View className="flex-1 ml-2">
                        <Text className="text-sm text-slate-700 dark:text-slate-300 font-medium" numberOfLines={2}>
                            {job.location || t('jobPopup.locationShared')}
                        </Text>
                    </View>
                </View>

                {/* Customer Info */}
                <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 items-center justify-center mr-3 overflow-hidden">
                        {job.user_profile_pic ? (
                            <Image
                                source={{ uri: job.user_profile_pic }}
                                className="w-10 h-10"
                                resizeMode="cover"
                            />
                        ) : (
                            <User size={20} color={isDark ? "#f472b6" : "#db2777"} />
                        )}
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm text-slate-900 dark:text-slate-100 font-bold">
                            {job.first_name} {job.last_name}
                        </Text>
                        {job.mobile_number && (
                            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {job.mobile_number}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                    <TouchableOpacity
                        onPress={() => onReject(job.id)}
                        className="bg-slate-200 dark:bg-slate-700 px-5 py-3 rounded-xl flex-1 items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <Text className="text-slate-700 dark:text-slate-300 font-bold text-sm">
                            {t('jobPopup.reject') || 'Reject'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleAccept}
                        disabled={accepting}
                        className="bg-green-500 px-5 py-3 rounded-xl flex-[2] items-center justify-center"
                        activeOpacity={0.8}
                        style={{
                            shadowColor: '#22c55e',
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 4,
                        }}
                    >
                        {accepting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text className="text-white font-black text-base">
                                {t('jobPopup.swipeToAccept')?.replace('Swipe to ', '') || 'Accept'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// --- Main Screen ---
export default function PendingJobsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { pendingJobs, acceptJob, rejectJob, isOnline, setIsOnline, stopRing, isRinging } = useWebSocket();
    const { t } = useTranslation();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Auto-navigate back to dashboard if all jobs are gone
    useEffect(() => {
        if (pendingJobs.length === 0) {
            router.back();
        }
    }, [pendingJobs.length]);

    const handleAccept = async (jobId) => {
        try {
            await acceptJob(jobId);
            // Navigation will be handled by WebSocketContext
        } catch (error) {
            console.error('Error accepting job:', error);
        }
    };

    const handleReject = (jobId) => {
        rejectJob(jobId);
    };

    return (
        <View className="flex-1 bg-slate-100 dark:bg-slate-900">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View
                className="bg-white dark:bg-slate-800"
                style={{
                    paddingTop: insets.top + 12,
                    paddingBottom: 12,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                }}
            >
                <View className="mx-4 flex-row justify-between items-center">
                    {/* Left: Title with Count Badge */}
                    <View className="flex-row items-center">
                        <Text className="text-xl font-black text-slate-900 dark:text-slate-100 mr-2">
                            {pendingJobs.length} {pendingJobs.length === 1 ? 'Order' : 'Orders'}
                        </Text>
                        <View className="bg-blue-500 px-2.5 py-1 rounded-full">
                            <Text className="text-white font-bold text-xs">
                                {pendingJobs.length}
                            </Text>
                        </View>
                    </View>

                    {/* Right: Controls */}
                    <View className="flex-row items-center gap-2">


                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full"
                        >
                            <X size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Subtitle */}
                <Text className="mx-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t('dashboard.reviewAndAccept') || 'Review and accept'}
                </Text>
            </View>

            {/* Stop Ring Button (Floating) */}
            {isRinging && (
                <TouchableOpacity
                    onPress={stopRing}
                    className="absolute right-4 bg-red-500 px-4 py-2.5 rounded-full shadow-lg z-50 flex-row items-center"
                    style={{ top: insets.top + 80 }}
                >
                    <VolumeOff size={16} color="white" />
                    <Text className="text-white font-bold ml-2 text-sm">
                        {t('jobPopup.stopSound')}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Jobs List */}
            <FlatList
                data={pendingJobs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <JobCard
                        job={item}
                        onAccept={handleAccept}
                        onReject={handleReject}
                        isDark={isDark}
                        t={t}
                    />
                )}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}