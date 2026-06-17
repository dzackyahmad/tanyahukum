"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function ChartPlaceholder({ trends = [] }) {
  const [timeRange, setTimeRange] = useState("30d");

  const ranges = [
    { id: "7d", label: "7 Hari", days: 7 },
    { id: "30d", label: "30 Hari", days: 30 },
    { id: "3m", label: "3 Bulan", days: 90 },
    { id: "1y", label: "1 Tahun", days: 365 },
  ];

  // Filter trends based on selected range by actual date
  const filteredTrends = useMemo(() => {
    if (!trends || trends.length === 0) return [];

    const rangeObj = ranges.find(r => r.id === timeRange);
    const daysToKeep = rangeObj ? rangeObj.days : 30;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    cutoff.setHours(0, 0, 0, 0);

    return trends.filter(d => new Date(d.date) >= cutoff);
  }, [trends, timeRange]);

  const chartData = useMemo(() => {
    if (filteredTrends.length === 1) {
      return [
        { date: "Sebelumnya", searches: 0 },
        ...filteredTrends,
        { date: "Sekarang", searches: filteredTrends[0].searches }
      ];
    }
    return filteredTrends;
  }, [filteredTrends]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800/80 p-4 border border-gray-100 dark:border-slate-700 shadow-2xl rounded-2xl animate-fadeIn transition-colors">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm" />
            <p className="text-sm font-bold text-gray-900 dark:text-white transition-colors">
              {payload[0].value} <span className="font-medium text-gray-500 dark:text-gray-400">Pencarian</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col h-full group transition-all duration-300 hover:shadow-md">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3 transition-colors">
            <div className="w-2 h-8 bg-blue-600 rounded-full" />
            Tren Pencarian Hukum
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Volume aktivitas dan interaksi chatbot</p>
        </div>
        
        {/* Modern Segmented Filter */}
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700 transition-colors">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id)}
              className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-300 ${
                timeRange === r.id 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-slate-600 scale-105" 
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', minHeight: '380px', height: '380px' }} className="relative">
        {filteredTrends && filteredTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
            >
              <defs>
                <linearGradient id="colorSearchesPremiumV2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                minTickGap={80}
                height={70}
                dy={25}
                tickFormatter={(val) => {
                  try {
                    const d = new Date(val);
                    if (isNaN(d.getTime())) return val;
                    return d.toLocaleDateString("id-ID", { 
                      day: 'numeric', 
                      month: 'short',
                      year: 'numeric'
                    });
                  } catch (e) {
                    return val;
                  }
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }}
                allowDecimals={false}
                dx={-10}
              />

              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '6 6' }}
                animationDuration={200}
              />

              <Area
                type="monotone"
                dataKey="searches"
                stroke="#2563eb"
                strokeWidth={5}
                fillOpacity={1}
                fill="url(#colorSearchesPremiumV2)"
                activeDot={{ 
                  r: 8, 
                  fill: "#2563eb", 
                  stroke: "#fff", 
                  strokeWidth: 4,
                  className: "shadow-2xl"
                }}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center p-12 text-center bg-gray-50/20 dark:bg-slate-800/20">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl shadow-sm flex items-center justify-center mb-6 text-blue-200 dark:text-blue-900 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 italic tracking-tight">Data tren belum tersedia untuk periode {ranges.find(r => r.id === timeRange)?.label}.</p>
          </div>
        )}
      </div>

      <div className="mt-10 pt-8 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between transition-colors">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
               <p className="text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors">Volume Pencarian</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-blue-200 dark:bg-blue-800" />
               <p className="text-xs font-bold text-gray-400 dark:text-gray-500 transition-colors">Target Kuartal</p>
            </div>
         </div>
         <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/30 transition-colors">
            Analytics Aktif
         </p>
      </div>
    </div>
  );
}