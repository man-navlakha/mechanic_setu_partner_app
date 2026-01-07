import { MapPin } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, SafeAreaView, ScrollView, StatusBar, Text, View } from 'react-native';
import DateFilter from '../../components/History/DateFilter';
import EarningsChart from '../../components/History/EarningsChart';
import EarningsStats from '../../components/History/EarningsStats';
import api from '../../utils/api';

// --- HistoryContent (Container for logic) ---
const HistoryContent = React.memo(({ initialJobs, t }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [filter, setFilter] = useState('week');

    // Filter Logic
    const { filteredJobs, financialJobs, totalEarnings, totalJobsCount } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getDaysDiff = (dateStr) => {
            const jobDate = new Date(dateStr);
            jobDate.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - jobDate.getTime();
            return Math.floor(diffTime / (1000 * 60 * 60 * 24));
        };

        const listFiltered = initialJobs.filter(job => {
            if (!job.created_at) return false;
            const diffDays = getDaysDiff(job.created_at);

            if (filter === 'day') return diffDays === 0;
            if (filter === 'week') return diffDays >= 0 && diffDays < 7;
            if (filter === 'month') return diffDays >= 0 && diffDays < 28;
            return false;
        });

        const financialFiltered = listFiltered.filter(j => j.status === 'COMPLETED');
        const sum = financialFiltered.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);

        return {
            filteredJobs: listFiltered,
            financialJobs: financialFiltered,
            totalEarnings: sum,
            totalJobsCount: listFiltered.length
        };
    }, [initialJobs, filter]);

    return (
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
            {/* 1. DateFilter Component */}
            <DateFilter filter={filter} onChange={setFilter} />

            {/* 2. EarningsStats Component */}
            <EarningsStats
                totalEarnings={totalEarnings}
                totalJobs={totalJobsCount}
                filter={filter}
                isDark={isDark}
            />

            {/* 3. EarningsChart Component */}
            <EarningsChart
                jobs={financialJobs}
                currentFilter={filter}
                isDark={isDark}
            />

            {/* Job History List */}
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">{t('profile.jobHistory')}</Text>

            {filteredJobs.length === 0 ? (
                <View className="items-center py-10">
                    <Text className="text-slate-400 dark:text-slate-500 font-medium">{t('profile.noHistory')}</Text>
                </View>
            ) : (
                filteredJobs.map((job, index) => (
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
        </ScrollView>
    );
});

// --- HistoryScreen (Fetcher) ---
export default function HistoryScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { t } = useTranslation();
    const [historyData, setHistoryData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/Profile/MechanicHistory/');
            setHistoryData(res.data);
        } catch (error) {
            console.error("Failed to fetch history:", error);
            // Alert.alert("Error", "Could not load earnings history."); 
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (loading && !historyData) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-900">
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <ActivityIndicator size="large" color={isDark ? "#60a5fa" : "#2563eb"} />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View className="px-4 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('tabs.earnings')}</Text>
            </View>

            <HistoryContent initialJobs={historyData?.job_history || []} t={t} />
        </SafeAreaView>
    );
}
