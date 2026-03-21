import { useRouter } from 'expo-router';
import { Bike, Car, MapPin, Truck, User, VolumeOff, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

// --- Job Card Component ---
const JobCard = ({ job, onAccept, onReject, onCancel, isDark, t }) => {
    const [accepting, setAccepting] = useState(false);

    const handleAccept = async () => {
        setAccepting(true);
        await onAccept(job.id);
        setAccepting(false);
    };

    return (
        <View
            className="bg-white dark:bg-slate-800 rounded-3xl mx-4 mb-4 overflow-hidden border border-slate-200 dark:border-slate-700"
            style={{
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
            }}
        >
            {/* Card Content */}
            <View className="p-5">
                {/* Header */}
                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center">
                        {getVehicleIcon(job.vehical_type, isDark)}
                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2 uppercase">
                            {job.vehical_type || t('jobPopup.vehicle')}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                            onPress={() => onCancel(job.id)}
                            className="bg-red-100 dark:bg-red-900/20 p-2 rounded-full border border-red-200 dark:border-red-800"
                            activeOpacity={0.7}
                        >
                            <X size={16} color={isDark ? "#f87171" : "#ef4444"} />
                        </TouchableOpacity>

                        <View className={`px-2.5 py-1 rounded-full ${job.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30' :
                            job.status === 'ACCEPTED' ? 'bg-green-100 dark:bg-green-900/30' :
                                'bg-slate-100 dark:bg-slate-700'
                            }`}>
                            <Text className={`text-[10px] font-bold uppercase ${job.status === 'PENDING' ? 'text-amber-700 dark:text-amber-400' :
                                job.status === 'ACCEPTED' ? 'text-green-700 dark:text-green-400' :
                                    'text-slate-500 dark:text-slate-400'
                                }`}>
                                {job.status}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Problem + Request Id */}
                <View className="mb-4">
                    <Text className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                        New Service Request #{job.id}
                    </Text>
                    <Text className="text-2xl font-black text-slate-900 dark:text-slate-100" numberOfLines={2}>
                        {job.problem || t('jobPopup.unknownIssue')}
                    </Text>
                </View>

                {/* Location */}
                <View className="bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-3.5 mb-3 border border-slate-200 dark:border-slate-700">
                    <View className="flex-row items-start">
                        <MapPin size={16} color={isDark ? "#94a3b8" : "#64748b"} style={{ marginTop: 2 }} />
                        <View className="flex-1 ml-2">
                            <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wide">
                                Pickup Location
                            </Text>
                            <Text className="text-sm text-slate-700 dark:text-slate-300 font-medium" numberOfLines={2}>
                                {job.location || t('jobPopup.locationShared')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Customer Info */}
                <View className="flex-row items-center mb-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700">
                    <View className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 items-center justify-center mr-3 overflow-hidden">
                        {job.user_profile_pic ? (
                            <Image
                                source={{ uri: job.user_profile_pic }}
                                className="w-12 h-12"
                                resizeMode="cover"
                            />
                        ) : (
                            <User size={24} color={isDark ? "#f472b6" : "#db2777"} />
                        )}
                    </View>
                    <View className="flex-1">
                        <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 tracking-wide">
                            Customer
                        </Text>
                        <Text className="text-base text-slate-900 dark:text-slate-100 font-bold">
                            {job.first_name} {job.last_name}
                        </Text>
                        {job.mobile_number && (
                            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {job.mobile_number}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Coordinates */}
                {job.latitude && job.longitude && (
                    <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 mb-3 border border-blue-100 dark:border-blue-900/30">
                        <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">
                            Coordinates
                        </Text>
                        <Text className="text-xs text-blue-800 dark:text-blue-200 font-mono">
                            {job.latitude.toFixed(6)}, {job.longitude.toFixed(6)}
                        </Text>
                    </View>
                )}

                {/* Additional Details */}
                {job.additional_details && job.additional_details.trim() !== '' && (
                    <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4 border border-amber-200 dark:border-amber-800">
                        <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">
                            Additional Details
                        </Text>
                        <Text className="text-sm text-amber-800 dark:text-amber-200">
                            {job.additional_details}
                        </Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                    <TouchableOpacity
                        onPress={() => onReject(job.id)}
                        className="bg-slate-100 dark:bg-slate-700 px-4 py-3 rounded-xl flex-1 items-center justify-center border border-slate-200 dark:border-slate-600"
                        activeOpacity={0.7}
                    >
                        <Text className="text-slate-700 dark:text-slate-300 font-bold text-sm">
                            {t('jobPopup.reject') || 'Reject'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleAccept}
                        disabled={accepting}
                        className="bg-green-500 px-5 py-3 rounded-xl flex-[1.6] items-center justify-center"
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
    const { pendingJobs, acceptJob, rejectJob, cancelJob, isOnline, setIsOnline, stopRing, isRinging } = useWebSocket();
    const { t } = useTranslation();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [selectedJobIdForCancel, setSelectedJobIdForCancel] = useState(null);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);

    // Auto-navigate back to dashboard if all jobs are gone
    useEffect(() => {
        console.log(`[PendingJobs] 📊 Current pendingJobs count: ${pendingJobs.length}`, pendingJobs.map(j => j.id));
        if (pendingJobs.length === 0 && !cancelModalVisible) {
            router.back();
        }
    }, [pendingJobs.length, cancelModalVisible]);

    const handleAccept = async (jobId) => {
        try {
            await acceptJob(jobId);
        } catch (error) {
            console.error('Error accepting job:', error);
        }
    };

    const handleReject = (jobId) => {
        rejectJob(jobId);
    };

    const handleOpenCancel = (jobId) => {
        setSelectedJobIdForCancel(jobId);
        setCancelModalVisible(true);
    };

    const submitCancellation = async () => {
        if (!cancelReason.trim()) {
            Alert.alert("Required", "Please select or type a reason.");
            return;
        }
        setLoadingAction(true);
        try {
            await cancelJob(selectedJobIdForCancel, cancelReason);
            setCancelModalVisible(false);
            setCancelReason('');
            // After cancellation, the list will update via WebSocket
        } catch (err) {
            Alert.alert("Error", "Failed to cancel job.");
        } finally {
            setLoadingAction(false);
        }
    };

    return (
        <View className="flex-1 bg-slate-100 dark:bg-slate-900">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View
                className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
                style={{
                    paddingTop: insets.top + 12,
                    paddingBottom: 14,
                }}
            >
                <View className="mx-4 flex-row justify-between items-center">
                    <View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">
                            Incoming Jobs
                        </Text>
                        <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {pendingJobs.length} {pendingJobs.length === 1 ? 'request waiting' : 'requests waiting'}
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                        <View className="bg-blue-500 px-3 py-1.5 rounded-full">
                            <Text className="text-white font-extrabold text-xs">
                                {pendingJobs.length}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full"
                        >
                            <X size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                        </TouchableOpacity>
                    </View>
                </View>
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
                        onCancel={handleOpenCancel}
                        isDark={isDark}
                        t={t}
                    />
                )}
                contentContainerStyle={{ paddingTop: 14, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            />

            {/* Cancel Modal */}
            <Modal animationType="slide" transparent visible={cancelModalVisible} onRequestClose={() => setCancelModalVisible(false)}>
                <View className="flex-1 justify-end bg-slate-900/60">
                    <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 h-[70%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Cancellation Reason</Text>
                            <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                                <X size={24} color={isDark ? "#94a3b8" : "#64748b"} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {["Customer requested cancel", "Unable to contact customer", "Vehicle issue too complex", "I had an emergency", "Parts not available"].map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => setCancelReason(r)}
                                    className={`p-4 rounded-xl border mb-3 flex-row justify-between ${cancelReason === r ? 'bg-red-50 border-red-500 dark:bg-red-900/20' : 'bg-slate-50 border-slate-100 dark:bg-slate-700 dark:border-slate-600'}`}
                                >
                                    <Text className={`font-medium ${cancelReason === r ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                            <TextInput
                                placeholder="Other reason..."
                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                value={cancelReason}
                                onChangeText={setCancelReason}
                                className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-4 rounded-xl h-24 text-slate-700 dark:text-slate-200 mb-6"
                                multiline
                                textAlignVertical="top"
                            />
                        </ScrollView>
                        <TouchableOpacity onPress={submitCancellation} disabled={loadingAction} className="bg-red-500 py-4 rounded-xl items-center shadow-lg shadow-red-200 mt-4">
                            {loadingAction ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Confirm Cancellation</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
