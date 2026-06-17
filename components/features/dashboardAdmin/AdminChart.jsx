import { useState, useMemo } from "react";
import { useTheme } from "@/components/shared/ThemeProvider";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const FILTERS = [
  { label: "7 Hari", days: 7 },
  { label: "30 Hari", days: 30 },
  { label: "3 Bulan", days: 90 },
  { label: "1 Tahun", days: 365 },
];

function formatDateLabel(dateStr, days) {
  const d = new Date(dateStr);
  if (days <= 30) {
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }
  if (days <= 90) {
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

export default function AdminChart({ dataTren = [] }) {
  const [filterDays, setFilterDays] = useState(30);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const chartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filterDays);
    cutoff.setHours(0, 0, 0, 0);

    const filtered = dataTren.filter(d => new Date(d.date) >= cutoff);

    if (filtered.length === 0) return [];
    if (filtered.length === 1) {
      return [
        { date: filtered[0].date, searches: 0, label: "" },
        { ...filtered[0], label: formatDateLabel(filtered[0].date, filterDays) },
      ];
    }

    // For 1 year, group by month to reduce noise
    if (filterDays === 365) {
      const monthMap = {};
      filtered.forEach(d => {
        const key = d.date.slice(0, 7); // YYYY-MM
        monthMap[key] = (monthMap[key] || 0) + d.searches;
      });
      return Object.keys(monthMap).sort().map(key => {
        const d = new Date(key + "-01");
        return {
          date: key,
          searches: monthMap[key],
          label: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
        };
      });
    }

    return filtered.map(d => ({
      ...d,
      label: formatDateLabel(d.date, filterDays),
    }));
  }, [dataTren, filterDays]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col h-full group transition-all duration-300 hover:shadow-md transition-colors">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white transition-colors">
              Tren Pencarian Hukum
            </h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-5">Volume aktivitas dan interaksi chatbot</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
          {FILTERS.map(f => (
            <button
              key={f.days}
              onClick={() => setFilterDays(f.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterDays === f.days
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", minHeight: "300px", height: "300px" }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e5e7eb"} />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? "#94a3b8" : "#6b7280", fontSize: 12 }}
                dy={10}
                interval="preserveStartEnd"
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? "#94a3b8" : "#6b7280", fontSize: 12 }}
                allowDecimals={false}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: isDark ? "1px solid #334155" : "none",
                  backgroundColor: isDark ? "#0f172a" : "#ffffff",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ fontWeight: "bold", color: isDark ? "#f8fafc" : "#374151", marginBottom: "4px" }}
                itemStyle={{ color: "#3b82f6", fontWeight: "500" }}
                formatter={(value) => [`${value} Pencarian`, "Total"]}
              />

              <Area
                type="monotone"
                dataKey="searches"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSearches)"
                activeDot={{ r: 6, fill: "#1e40af", stroke: isDark ? "#0f172a" : "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full border border-dashed border-gray-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm transition-colors">
            Data tren belum tersedia
          </div>
        )}
      </div>
    </div>
  );
}
