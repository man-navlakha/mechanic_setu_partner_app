import { Pressable, Text, View } from 'react-native';

const DateFilter = ({ filter, onChange }) => {
    const filters = ['day', 'week', 'month'];
    return (
        <View className="flex-row bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-6 mx-4 self-center">
            {filters.map((f) => (
                <Pressable
                    key={f}
                    onPress={() => onChange(f)}
                    className={`px-8 py-2 rounded-lg ${filter === f ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
                >
                    <Text className={`text-sm font-bold capitalize ${filter === f ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {f}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
};

export default DateFilter;
