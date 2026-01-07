import { DollarSign, History } from 'lucide-react-native';
import { Text, View } from 'react-native';

const StatsCard = ({ title, value, icon: Icon, colorClass, isDark }) => (
    <View className={`w-[48%] p-5 rounded-2xl border mb-4 items-center ${colorClass}`}>
        <Icon size={28} color={isDark ? "#ffffff" : "#000000"} className="mb-2" style={{ opacity: 0.7 }} />
        <Text className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</Text>
        <Text className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase mt-1">
            {title}
        </Text>
    </View>
);

const EarningsStats = ({ totalEarnings, totalJobs, filter, isDark }) => {
    return (
        <View className="flex-row flex-wrap justify-between mb-4">
            <StatsCard
                title={filter === 'day' ? 'Earned Today' : filter === 'week' ? 'Earned This Week' : 'Earned This Month'}
                value={`₹${totalEarnings}`}
                icon={DollarSign}
                colorClass="bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800"
                isDark={isDark}
            />
            <StatsCard
                title={filter === 'day' ? 'Jobs Today' : filter === 'week' ? 'Jobs This Week' : 'Jobs This Month'}
                value={totalJobs}
                icon={History}
                colorClass="bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800"
                isDark={isDark}
            />
        </View>
    );
};

export default EarningsStats;
