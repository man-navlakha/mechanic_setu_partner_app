import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    CheckCircle, ChevronRight,
    DollarSign,
    FileText,
    Globe,
    History,
    LogOut,
    Mail,
    MapPin,
    Store,
    User
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageModal from '../components/LanguageModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function ProfileScreen() {
    const router = useRouter();
    const { logout } = useAuth();
    const { t } = useTranslation();

    const [activeSection, setActiveSection] = useState('home');
    const [profileData, setProfileData] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

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
            <View className="flex-1 justify-center items-center bg-slate-50">
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    // --- 3. SUB-COMPONENTS ---

    // Reusable Form Field (Read-only style by default)
    const InfoField = ({ label, value }) => (
        <View className="mb-4">
            <Text className="text-slate-500 text-xs font-bold uppercase mb-1">{label}</Text>
            <View className="bg-slate-100 border border-slate-200 rounded-xl p-3">
                <Text className="text-slate-800 font-medium text-base">{value || "N/A"}</Text>
            </View>
        </View>
    );

    // Menu Button Card
    const MenuCard = ({ icon, title, subtitle, color, onClick }) => (
        <TouchableOpacity
            onPress={onClick}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-row items-center mb-3 active:bg-slate-50"
        >
            <View className={`p-3 rounded-xl ${color} mr-4`}>
                {icon}
            </View>
            <View className="flex-1">
                <Text className="font-bold text-slate-800 text-base">{title}</Text>
                <Text className="text-slate-500 text-xs">{subtitle}</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
        </TouchableOpacity>
    );

    // --- 4. SECTIONS ---

    const HomeOverview = () => (
        <View>
            {/* Profile Header Card */}
            <View className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 items-center">
                <View className="relative mb-4">
                    <Image
                        source={{ uri: profileData?.profile_pic || 'https://via.placeholder.com/150' }}
                        className="w-24 h-24 rounded-full border-4 border-slate-50 bg-slate-200"
                    />
                    {profileData?.is_verified && (
                        <View className="absolute bottom-0 right-0 bg-green-500 p-1.5 rounded-full border-4 border-white">
                            <CheckCircle size={16} color="white" />
                        </View>
                    )}
                </View>

                <Text className="text-2xl font-bold text-slate-900 text-center">
                    {profileData?.first_name} {profileData?.last_name}
                </Text>
                <Text className="text-slate-500 text-sm flex-row items-center mt-1">
                    <Mail size={12} color="#64748b" /> {profileData?.email}
                </Text>

                <View className={`mt-4 px-4 py-1.5 rounded-full ${profileData?.is_verified ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <Text className={`text-xs font-bold ${profileData?.is_verified ? 'text-green-700' : 'text-yellow-700'}`}>
                        {profileData?.is_verified ? t('profile.verified') : t('profile.pending')}
                    </Text>
                </View>
            </View>

            <Text className="text-slate-900 font-bold text-lg mb-3 px-1">Manage Account</Text>

            <MenuCard
                title={t('profile.personalInfo')}
                subtitle={t('profile.personalInfoSubtitle')}
                icon={<User size={24} color="#2563eb" />}
                color="bg-blue-50"
                onClick={() => setActiveSection('personalInfo')}
            />
            <MenuCard
                title={t('profile.shopDetails')}
                subtitle={t('profile.shopDetailsSubtitle')}
                icon={<Store size={24} color="#16a34a" />}
                color="bg-green-50"
                onClick={() => setActiveSection('shopInfo')}
            />
            <MenuCard
                title={t('profile.earnings')}
                subtitle={t('profile.earningsSubtitle')}
                icon={<DollarSign size={24} color="#ca8a04" />}
                color="bg-yellow-50"
                onClick={() => setActiveSection('earnings')}
            />
            <MenuCard
                title={t('profile.jobHistory')}
                subtitle={t('profile.jobHistorySubtitle')}
                icon={<History size={24} color="#9333ea" />}
                color="bg-purple-50"
                onClick={() => setActiveSection('jobHistory')}
            />

            <TouchableOpacity
                onPress={handleLogout}
                className="mt-6 bg-red-50 p-4 rounded-2xl flex-row items-center justify-center border border-red-100 active:bg-red-100"
            >
                <LogOut size={20} color="#dc2626" className="mr-2" />
                <Text className="text-red-600 font-bold text-base">{t('profile.logout')}</Text>
            </TouchableOpacity>
        </View>
    );

    const PersonalInfo = () => (
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <InfoField label="Full Name" value={`${profileData.first_name} ${profileData.last_name}`} />
            <InfoField label="Email Address" value={profileData.email} />
            <InfoField label="Phone Number" value={profileData.mobile_number} />
            <InfoField label="Aadhar Card" value={profileData.adhar_card} />

            <View className="mt-2 pt-4 border-t border-slate-100">
                <Text className="text-slate-500 text-xs font-bold uppercase mb-3">KYC Document</Text>
                {profileData?.KYC_document ? (
                    <TouchableOpacity
                        onPress={() => Linking.openURL(profileData.KYC_document)}
                        className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex-row items-center active:bg-blue-100"
                    >
                        <FileText size={24} color="#2563eb" className="mr-3" />
                        <View>
                            <Text className="font-bold text-blue-700">View Uploaded Document</Text>
                            <Text className="text-xs text-blue-500 mt-0.5">Tap to open in browser</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <Text className="text-red-500 text-sm italic">Document not uploaded</Text>
                )}
            </View>
        </View>
    );

    const ShopInfo = () => (
        <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
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

            <View className="mt-2 bg-slate-50 p-3 rounded-lg flex-row items-center border border-slate-200">
                <MapPin size={16} color="#64748b" className="mr-2" />
                <Text className="text-slate-500 text-xs">Coordinates allow customers to find you.</Text>
            </View>
        </View>
    );

    const EarningsSection = () => {
        const stats = historyData?.statistics;
        return (
            <View>
                <View className="flex-row flex-wrap justify-between">
                    <View className="w-[48%] bg-green-50 p-5 rounded-2xl border border-green-100 mb-4 items-center">
                        <DollarSign size={28} color="#16a34a" className="mb-2" />
                        <Text className="text-2xl font-black text-green-800">₹{stats?.total_earnings || 0}</Text>
                        <Text className="text-xs text-green-600 font-bold uppercase mt-1">{t('profile.totalEarned')}</Text>
                    </View>

                    <View className="w-[48%] bg-purple-50 p-5 rounded-2xl border border-purple-100 mb-4 items-center">
                        <History size={28} color="#9333ea" className="mb-2" />
                        <Text className="text-2xl font-black text-purple-800">{stats?.total_jobs || 0}</Text>
                        <Text className="text-xs text-purple-600 font-bold uppercase mt-1">{t('profile.totalJobs')}</Text>
                    </View>

                    <View className="w-full bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-4 flex-row items-center justify-between">
                        <View>
                            <Text className="text-3xl font-black text-blue-800">{stats?.jobs_this_month || 0}</Text>
                            <Text className="text-xs text-blue-600 font-bold uppercase mt-1">{t('profile.jobsMonth')}</Text>
                        </View>
                        <View className="bg-blue-100 p-3 rounded-full">
                            <History size={24} color="#2563eb" />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const JobHistoryList = () => {
        const jobs = historyData?.job_history || [];
        return (
            <View>
                {jobs.length === 0 ? (
                    <View className="items-center py-10">
                        <Text className="text-slate-400 font-medium">{t('profile.noHistory')}</Text>
                    </View>
                ) : (
                    jobs.map((job, index) => (
                        <View key={index} className="bg-white p-4 rounded-2xl border border-slate-100 mb-3 shadow-sm">
                            <View className="flex-row justify-between items-start mb-2">
                                <Text className="font-bold text-slate-800 text-base flex-1 mr-2">{job.problem}</Text>
                                <View className={`px-2 py-1 rounded-md ${job.status === 'COMPLETED' ? 'bg-green-100' : 'bg-slate-100'}`}>
                                    <Text className={`text-[10px] font-bold ${job.status === 'COMPLETED' ? 'text-green-700' : 'text-slate-500'}`}>
                                        {job.status}
                                    </Text>
                                </View>
                            </View>

                            <Text className="text-slate-500 text-xs mb-3">{new Date(job.created_at).toDateString()}</Text>

                            <View className="flex-row justify-between items-center border-t border-slate-50 pt-3">
                                <Text className="text-slate-400 text-xs max-w-[70%]" numberOfLines={1}>
                                    <MapPin size={10} color="#94a3b8" /> {job.location || "Unknown Location"}
                                </Text>
                                <Text className="font-bold text-slate-900 text-base">₹{job.price || 0}</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        );
    };

    // --- MAIN RENDER ---
    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            {/* Navbar */}
            <View className="px-4 py-4 flex-row items-center border-b border-slate-200 bg-white">
                <TouchableOpacity onPress={handleGoBack} className="p-2 -ml-2 rounded-full active:bg-slate-100">
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-slate-800 ml-2 flex-1">
                    {activeSection === 'home' ? t('profile.title') :
                        activeSection === 'personalInfo' ? t('profile.personalInfo') :
                            activeSection === 'shopInfo' ? t('profile.shopDetails') :
                                activeSection === 'earnings' ? t('profile.earnings') : t('profile.jobHistory')}
                </Text>

                {activeSection === 'home' && (
                    <TouchableOpacity
                        onPress={() => setShowLanguageModal(true)}
                        className="p-2 bg-slate-100 rounded-full"
                    >
                        <Globe size={20} color="#475569" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content Area */}
            <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                {activeSection === 'home' && <HomeOverview />}
                {activeSection === 'personalInfo' && <PersonalInfo />}
                {activeSection === 'shopInfo' && <ShopInfo />}
                {activeSection === 'earnings' && <EarningsSection />}
                {activeSection === 'jobHistory' && <JobHistoryList />}
                <View className="h-10" />
            </ScrollView>

            <LanguageModal
                visible={showLanguageModal}
                onClose={() => setShowLanguageModal(false)}
            />
        </SafeAreaView>
    );
}