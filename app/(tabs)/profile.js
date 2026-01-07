import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    ArrowLeft,
    CheckCircle, ChevronRight,
    DollarSign,
    FileText,
    History,
    LogOut,
    MapPin,
    Settings,
    Store,
    User,
    Users
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LanguageModal from '../../components/LanguageModal';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ProfileScreen() {
    const router = useRouter();
    const { logout } = useAuth();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    // Dark mode detection
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [activeSection, setActiveSection] = useState('home');
    const [profileData, setProfileData] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const checkAdmin = async () => {
                const allowed = await AsyncStorage.getItem('admin_mode');
                setIsAdmin(allowed === 'true');
            };
            checkAdmin();
        }, [])
    );

    // --- 1. FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileRes, historyRes] = await Promise.all([
                    api.get('/Profile/MechanicProfile/'),
                    api.get('/Profile/MechanicHistory/')
                ]);
                setProfileData(profileRes.data);
                setHistoryData(historyRes.data);
            } catch (error) {
                console.error("Failed to fetch profile data:", error);
                Alert.alert("Error", "Could not load profile data. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- 2. ACTIONS ---
    const [tapCount, setTapCount] = useState(0);
    const [showAdminUI, setShowAdminUI] = useState(false); // Local toggle on Profile page

    // Check if Global Developer Mode is enabled (from Settings)
    useFocusEffect(
        useCallback(() => {
            const checkGlobalAdmin = async () => {
                const mode = await AsyncStorage.getItem('admin_mode');
                setIsAdmin(mode === 'true');
            };
            checkGlobalAdmin();
        }, [])
    );

    const handleVersionTap = () => {
        // Only allow toggling if Global Admin Mode is enabled in Settings
        if (!isAdmin) return;

        const newCount = tapCount + 1;
        if (newCount >= 7) {
            setShowAdminUI(!showAdminUI);
            setTapCount(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(showAdminUI ? "Hidden Features Hidden" : "Hidden Features Visible",
                showAdminUI ? "" : "Admin buttons are now visible below.");
        } else {
            setTapCount(newCount);
        }
    };

    const createAd = async () => {
        const newAdData = {
            businessName: "Pixel Classes",
            logo: "https://ik.imagekit.io/pxc/pixel%20class%20fav%20w-02.png",
            link: "https://pixelclass.netlify.app/",
            latitude: 23.023934,
            longitude: 72.570247,
            description: "Learn Coding from Experts!",
            offerTitle: "OFFER OFFER OFFER",
            offerSubtitle: "Get Full Stack Web Development Course at",
            offerPrice: "just ₹5000/- only",
            bgGradient: ["#ff9a9e", "#fad0c4"]
        };

        try {
            const response = await api.post('/core/map-ads/', newAdData);
            console.log("Ad Created Successfully:", response.data);
            Alert.alert("Success", "Ad Posted Successfully!");
        } catch (error) {
            console.error("Full Error Object:", error);

            let errorMessage = "Failed to post ad.";

            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error("Response Data:", error.response.data);
                console.error("Response Status:", error.response.status);

                if (typeof error.response.data === 'string') {
                    // Likely HTML error page (500 or 403 debug page)
                    // Extract basic info or just show status
                    errorMessage = `Server Error (${error.response.status}). Check console for details.`;
                    if (error.response.status === 403) errorMessage = "Permission Denied (403). Are you an admin?";
                    if (error.response.status === 500) errorMessage = "Internal Server Error (500).";
                } else {
                    errorMessage = error.response.data?.detail || error.message;
                }
            } else if (error.request) {
                // The request was made but no response was received
                console.error("No Response:", error.request);
                errorMessage = "Network Error: No response from server.";
            } else {
                errorMessage = error.message;
            }

            Alert.alert("Error", errorMessage);
        }
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

    const handleGoBack = () => {
        if (activeSection === 'home') {
            router.back();
        } else {
            setActiveSection('home');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-900">
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <ActivityIndicator size="large" color={isDark ? "#60a5fa" : "#2563eb"} />
            </View>
        );
    }

    // --- 3. SUB-COMPONENTS ---

    // Reusable Form Field (Read-only style by default)
    const InfoField = ({ label, value }) => (
        <View className="mb-4">
            <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">{label}</Text>
            <View className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3">
                <Text className="text-slate-800 dark:text-slate-100 font-medium text-base">{value || "N/A"}</Text>
            </View>
        </View>
    );

    // Modern List Item for new UI
    const ListItem = ({ icon, title, subtitle, onClick, rightElement, isDark }) => (
        <TouchableOpacity
            onPress={onClick}
            activeOpacity={0.7}
            className="flex-row items-center py-4 px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800"
        >
            <View className="mr-4 p-2 bg-slate-900 dark:bg-slate-700 rounded-full">
                {icon}
            </View>
            <View className="flex-1 justify-center">
                <Text className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                </Text>
                {/* {subtitle && <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</Text>} */}
            </View>
            {rightElement || <ChevronRight size={20} color="#cbd5e1" />}
        </TouchableOpacity>
    );


    // --- 4. SECTIONS ---

    const WeeklyChart = ({ history }) => {
        // 1. Process Data for Last 7 Days
        const chartData = [];
        const today = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayLabel = days[d.getDay()];

            // Filter jobs for this date (match YYYY-MM-DD)
            const dayTotal = history
                .filter(j => j.created_at && j.created_at.startsWith(dateStr) && j.status === 'COMPLETED')
                .reduce((sum, j) => sum + (parseFloat(j.price) || 0), 0);

            chartData.push({ day: dayLabel, value: dayTotal });
        }

        const maxValue = Math.max(...chartData.map(d => d.value), 100); // Normalize, min 100 to avoid div/0

        return (
            <View className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 shadow-sm">
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">Weekly Earnings</Text>
                        <Text className="text-slate-400 dark:text-slate-500 text-xs text-bold">Last 7 Days</Text>
                    </View>
                </View>

                <View className="flex-row justify-between items-end h-32 px-1">
                    {chartData.map((item, index) => {
                        const heightPct = (item.value / maxValue) * 100;
                        return (
                            <View key={index} className="items-center w-8">
                                {/* Tooltip Value */}
                                {item.value > 0 && (
                                    <Text className="text-[9px] text-slate-400 dark:text-slate-500 mb-1 font-bold">
                                        {item.value >= 1000 ? (item.value / 1000).toFixed(1) + 'k' : item.value}
                                    </Text>
                                )}
                                {/* Animated Bar */}
                                <Animated.View
                                    entering={FadeInDown.delay(index * 100).springify()}
                                    style={{
                                        height: `${Math.max(heightPct, 4)}%`, // Minimum height 4%
                                        width: '100%',
                                        borderTopLeftRadius: 6,
                                        borderTopRightRadius: 6,
                                    }}
                                    className={`w-full ${item.value > 0 ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}
                                />
                                <Text className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{item.day}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    const HomeOverview = () => (
        <View className="flex-1">
            {/* Header / Avatar Section */}
            <View className="items-center py-6 bg-white dark:bg-slate-900 mb-4 px-4 pt-12">
                <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                    Hello, {profileData?.first_name || 'Partner'}
                </Text>

                <View className="relative mb-4">
                    {/* Ring Container */}
                    <View className="w-32 h-32 rounded-full border-[6px] border-blue-100 dark:border-slate-800 items-center justify-center relative">
                        {/* Progress Indicator (Simulated with partial border or just generic ring) */}
                        <View className="absolute w-32 h-32 rounded-full border-[6px] border-l-blue-600 border-t-blue-600 border-r-transparent border-b-transparent transform rotate-45" />

                        <Image
                            source={{ uri: profileData?.profile_pic || 'https://via.placeholder.com/150' }}
                            className="w-28 h-28 rounded-full bg-slate-200 dark:bg-slate-700"
                        />
                    </View>
                    {profileData?.is_verified && (
                        <View className="absolute bottom-1 right-1 bg-green-500 p-1.5 rounded-full border-4 border-white dark:border-slate-900">
                            <CheckCircle size={16} color="white" />
                        </View>
                    )}
                </View>

                {/* Earnings / Target Text */}
                <View className="flex-row items-end">
                    <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ₹{historyData?.statistics?.total_earnings || 0}
                    </Text>
                    <Text className="text-sm font-medium text-slate-400 dark:text-slate-500 mb-1 ml-1">
                        / ₹10,000 Goal
                    </Text>
                </View>
                <Text className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-bold">
                    Total Earnings
                </Text>
            </View>

            {/* List Menu Section */}
            <View className="bg-white dark:bg-slate-900">
                <Text className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2">Dashboard</Text>

                <ListItem
                    title={t('profile.personalInfo')}
                    subtitle="Contact & ID"
                    icon={<User size={20} color="white" />}
                    onClick={() => setActiveSection('personalInfo')}
                    isDark={isDark}
                />
                <ListItem
                    title={t('profile.shopDetails')}
                    subtitle="Location & Store"
                    icon={<Store size={20} color="white" />}
                    onClick={() => setActiveSection('shopInfo')}
                    isDark={isDark}
                />
                <ListItem
                    title={t('profile.earnings')}
                    subtitle="Stats & Charts"
                    icon={<DollarSign size={20} color="white" />}
                    onClick={() => setActiveSection('earnings')}
                    isDark={isDark}
                />
                <ListItem
                    title={t('profile.jobHistory')}
                    subtitle="Past Orders"
                    icon={<History size={20} color="white" />}
                    onClick={() => setActiveSection('jobHistory')}
                    isDark={isDark}
                />

                <Text className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 mt-6">Settings</Text>

                <ListItem
                    title="App settings"
                    subtitle="General, Privacy"
                    icon={<Settings size={20} color="white" />}
                    onClick={() => router.push('/settings')} // Navigate to settings tab/screen
                    isDark={isDark}
                />
                <ListItem
                    title={t('profile.logout')}
                    icon={<LogOut size={20} color="white" />}
                    onClick={handleLogout}
                    isDark={isDark}
                />


                {/* VERSION FOOTER WITH HIDDEN ADMIN ACCESS */}
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleVersionTap}
                    className="py-12 items-center"
                >
                    <Text className="text-slate-300 dark:text-slate-700 text-xs font-semibold">
                        Version 1.6.3
                    </Text>
                </TouchableOpacity>

                {/* HIDDEN ADMIN ACCESS */}
                {showAdminUI && (
                    <View className="px-4 pb-8 items-center">
                        <Text className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 mt-6">Admin Tools</Text>
                        <ListItem
                            title="POST TEST AD"
                            subtitle="General, Privacy"
                            icon={<CheckCircle size={20} color="white" />}
                            onClick={createAd}
                            isDark={isDark}
                        />
                        <ListItem
                            title="VERIFY MECHANICS"
                            subtitle="General, Privacy"
                            icon={<Users size={20} color="white" />}
                            onClick={() => router.push('/mechanic-verification')}
                            isDark={isDark}
                        />


                    </View>
                )}
            </View>
        </View>
    );

    const PersonalInfo = () => (
        <View className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mt-4">
            <InfoField label="Full Name" value={`${profileData.first_name} ${profileData.last_name}`} />
            <InfoField label="Email Address" value={profileData.email} />
            <InfoField label="Phone Number" value={profileData.mobile_number} />
            <InfoField label="Aadhar Card" value={profileData.adhar_card} />

            <View className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-3">KYC Document</Text>
                {profileData?.KYC_document ? (
                    <TouchableOpacity
                        onPress={() => Linking.openURL(profileData.KYC_document)}
                        className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex-row items-center active:bg-blue-100 dark:active:bg-blue-900/50"
                    >
                        <FileText size={24} color={isDark ? "#60a5fa" : "#2563eb"} className="mr-3" />
                        <View>
                            <Text className="font-bold text-blue-700 dark:text-blue-400">View Uploaded Document</Text>
                            <Text className="text-xs text-blue-500 dark:text-blue-300 mt-0.5">Tap to open in browser</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <Text className="text-red-500 dark:text-red-400 text-sm italic">Document not uploaded</Text>
                )}
            </View>
        </View>
    );

    const ShopInfo = () => (
        <View className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mt-4">
            <InfoField label={t('profile.shopName')} value={profileData.shop_name} />
            <InfoField label={t('profile.shopAddress')} value={profileData.shop_address} />

            <View className="flex-row gap-4 mt-2">
                <View className="flex-1">
                    <InfoField label="Latitude" value={String(profileData.shop_latitude)} />
                </View>
                <View className="flex-1">
                    <InfoField label="Longitude" value={String(profileData.shop_longitude)} />
                </View>
            </View>

            <View className="mt-2 bg-slate-50 dark:bg-slate-700 p-3 rounded-lg flex-row items-center border border-slate-200 dark:border-slate-600">
                <MapPin size={16} color={isDark ? "#94a3b8" : "#64748b"} className="mr-2" />
                <Text className="text-slate-500 dark:text-slate-400 text-xs">Coordinates allow customers to find you.</Text>
            </View>
        </View>
    );

    const EarningsSection = () => {
        const stats = historyData?.statistics;
        return (
            <View className="mt-4">
                <WeeklyChart history={historyData?.job_history || []} />
                <View className="flex-row flex-wrap justify-between">
                    <View className="w-[48%] bg-green-50 dark:bg-green-900/30 p-5 rounded-2xl border border-green-100 dark:border-green-800 mb-4 items-center">
                        <DollarSign size={28} color={isDark ? "#4ade80" : "#16a34a"} className="mb-2" />
                        <Text className="text-2xl font-black text-green-800 dark:text-green-400">₹{stats?.total_earnings || 0}</Text>
                        <Text className="text-xs text-green-600 dark:text-green-500 font-bold uppercase mt-1">{t('profile.totalEarned')}</Text>
                    </View>

                    <View className="w-[48%] bg-purple-50 dark:bg-purple-900/30 p-5 rounded-2xl border border-purple-100 dark:border-purple-800 mb-4 items-center">
                        <History size={28} color={isDark ? "#c084fc" : "#9333ea"} className="mb-2" />
                        <Text className="text-2xl font-black text-purple-800 dark:text-purple-400">{stats?.total_jobs || 0}</Text>
                        <Text className="text-xs text-purple-600 dark:text-purple-500 font-bold uppercase mt-1">{t('profile.totalJobs')}</Text>
                    </View>

                    <View className="w-full bg-blue-50 dark:bg-blue-900/30 p-5 rounded-2xl border border-blue-100 dark:border-blue-800 mb-4 flex-row items-center justify-between">
                        <View>
                            <Text className="text-3xl font-black text-blue-800 dark:text-blue-400">{stats?.jobs_this_month || 0}</Text>
                            <Text className="text-xs text-blue-600 dark:text-blue-500 font-bold uppercase mt-1">{t('profile.jobsMonth')}</Text>
                        </View>
                        <View className="bg-blue-100 dark:bg-blue-800 p-3 rounded-full">
                            <History size={24} color={isDark ? "#60a5fa" : "#2563eb"} />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const JobHistoryList = () => {
        const jobs = historyData?.job_history || [];
        return (
            <View className="mt-4">
                {jobs.length === 0 ? (
                    <View className="items-center py-10">
                        <Text className="text-slate-400 dark:text-slate-500 font-medium">{t('profile.noHistory')}</Text>
                    </View>
                ) : (
                    jobs.map((job, index) => (
                        <View key={index} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-3 shadow-sm">
                            <View className="flex-row justify-between items-start mb-2">
                                <Text className="font-bold text-slate-800 dark:text-slate-100 text-base flex-1 mr-2">{job.problem}</Text>
                                <View className={`px-2 py-1 rounded-md ${job.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                    <Text className={`text-[10px] font-bold ${job.status === 'COMPLETED' ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {job.status}
                                    </Text>
                                </View>
                            </View>

                            <Text className="text-slate-500 dark:text-slate-400 text-xs mb-3">{new Date(job.created_at).toDateString()}</Text>

                            <View className="flex-row justify-between items-center border-t border-slate-50 dark:border-slate-700 pt-3">
                                <Text className="text-slate-400 dark:text-slate-500 text-xs max-w-[70%]" numberOfLines={1}>
                                    <MapPin size={10} color={isDark ? "#64748b" : "#94a3b8"} /> {job.location || "Unknown Location"}
                                </Text>
                                <Text className="font-bold text-slate-900 dark:text-slate-100 text-base">₹{job.price || 0}</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        );
    };

    // --- MAIN RENDER ---
    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Navbar (Only show when drilling down, main profile view uses Hello header) */}
            {activeSection !== 'home' && (
                <View className="px-4 py-4 flex-row items-center border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <TouchableOpacity onPress={handleGoBack} className="p-2 -ml-2 rounded-full active:bg-slate-100 dark:active:bg-slate-700">
                        <ArrowLeft size={24} color={isDark ? "#e2e8f0" : "#1e293b"} />
                    </TouchableOpacity>

                    <Text className="text-xl font-bold text-slate-800 dark:text-slate-100 flex-1 ml-2">
                        {activeSection === 'personalInfo' ? t('profile.personalInfo') :
                            activeSection === 'shopInfo' ? t('profile.shopDetails') :
                                activeSection === 'earnings' ? t('profile.earnings') : t('profile.jobHistory')}
                    </Text>
                </View>
            )}

            {/* Content Area */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {activeSection === 'home' && <HomeOverview />}
                <View className="px-4">
                    {activeSection === 'personalInfo' && <PersonalInfo />}
                    {activeSection === 'shopInfo' && <ShopInfo />}
                    {activeSection === 'earnings' && <EarningsSection />}
                    {activeSection === 'jobHistory' && <JobHistoryList />}
                </View>

                <View style={{ height: 80 + insets.bottom }} />
            </ScrollView>

            <LanguageModal
                visible={showLanguageModal}
                onClose={() => setShowLanguageModal(false)}
            />
        </SafeAreaView>
    );
}
