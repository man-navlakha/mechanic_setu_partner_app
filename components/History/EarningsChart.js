import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

const EarningsChart = React.memo(({ jobs, currentFilter, isDark }) => {
    // Memoize chart data calculation to prevent heavy re-run
    const { chartData, title, subtitle, maxValue } = useMemo(() => {
        let data = [];
        let t = "";
        let s = "";
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (currentFilter === 'day') {
            t = "Today's Earnings";
            s = today.toDateString();
            const buckets = [
                { label: '0-4', start: 0, end: 4 },
                { label: '4-8', start: 4, end: 8 },
                { label: '8-12', start: 8, end: 12 },
                { label: '12-16', start: 12, end: 16 },
                { label: '16-20', start: 16, end: 20 },
                { label: '20-24', start: 20, end: 24 },
            ];

            data = buckets.map(b => {
                const total = jobs
                    .filter(j => {
                        const jobDate = new Date(j.created_at);
                        return jobDate.getHours() >= b.start && jobDate.getHours() < b.end;
                    })
                    .reduce((sum, j) => sum + (parseFloat(j.price) || 0), 0);
                return { day: b.label, value: total };
            });

        } else if (currentFilter === 'week') {
            t = "Weekly Earnings";
            s = "Last 7 Days";
            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayLabel = daysOfWeek[d.getDay()];

                const dayTotal = jobs
                    .filter(j => new Date(j.created_at).toISOString().split('T')[0] === dateStr)
                    .reduce((sum, j) => sum + (parseFloat(j.price) || 0), 0);

                data.push({ day: dayLabel, value: dayTotal });
            }
        } else if (currentFilter === 'month') {
            t = "Monthly Earnings";
            s = "Last 4 Weeks";
            const labels = ["3 Wk ago", "2 Wk ago", "Last Wk", "This Wk"];

            for (let i = 3; i >= 0; i--) {
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - (i * 7) - 6);
                weekStart.setHours(0, 0, 0, 0);

                const weekEnd = new Date(today);
                weekEnd.setDate(today.getDate() - (i * 7));
                weekEnd.setHours(23, 59, 59, 999);

                let chunkTotal = jobs
                    .filter(j => {
                        const jobDate = new Date(j.created_at);
                        return jobDate >= weekStart && jobDate <= weekEnd;
                    })
                    .reduce((sum, j) => sum + (parseFloat(j.price) || 0), 0);

                data.push({ day: labels[3 - i], value: chunkTotal });
            }
        }

        const max = Math.max(...data.map(d => d.value), 100);
        return { chartData: data, title: t, subtitle: s, maxValue: max };
    }, [jobs, currentFilter]);

    return (
        <View className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 shadow-sm">
            <View className="mb-6">
                <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</Text>
                <Text className="text-slate-400 dark:text-slate-500 text-xs text-bold mt-1">{subtitle}</Text>
            </View>

            <View className="flex-row justify-between items-end h-40 px-1">
                {chartData.map((item, index) => {
                    const heightPct = (item.value / maxValue) * 100;

                    const activeColor = isDark ? '#3b82f6' : '#2563eb';
                    const inactiveColor = isDark ? '#334155' : '#f1f5f9';
                    const bgColor = item.value > 0 ? activeColor : inactiveColor;

                    return (
                        <View key={index} className="items-center flex-1 mx-1">
                            {item.value > 0 && (
                                <Text className="text-[9px] text-slate-400 dark:text-slate-500 mb-1 font-bold">
                                    {item.value >= 1000 ? (item.value / 1000).toFixed(1) + 'k' : item.value}
                                </Text>
                            )}
                            <View
                                style={{
                                    height: `${Math.max(heightPct, 4)}%`,
                                    width: '100%',
                                    borderTopLeftRadius: 6,
                                    borderTopRightRadius: 6,
                                    backgroundColor: bgColor,
                                }}
                            />
                            <Text className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase text-center" numberOfLines={1}>
                                {item.day}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
});

export default EarningsChart;
