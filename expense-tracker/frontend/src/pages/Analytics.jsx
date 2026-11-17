import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/formatters'
import { LineChart as LineChartIcon, PieChart as PieChartIcon, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'

export default function Analytics() {
  const { currency } = useAuth()
  const [monthsRange, setMonthsRange] = useState(6)
  const [monthlyData, setMonthlyData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [mRes, cRes, dRes, sRes] = await Promise.all([
        api.get(`/analytics/monthly?months=${monthsRange}`),
        api.get('/analytics/categories?type=expense'),
        api.get('/analytics/trends?days=30'),
        api.get('/analytics/summary'),
      ])
      setMonthlyData(mRes.data)
      setCategoryData(cRes.data)
      setDailyData(dRes.data)
      setSummary(sRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [monthsRange])

  const PIE_COLORS = ['#6366f1', '#ec4899', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e']

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Analytics & Intelligence</h1>
          <p className="text-xs text-slate-500">Visualize multi-period inflows, spending distribution, and behavioral patterns</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          {[6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonthsRange(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                monthsRange === m ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Last {m} Months
            </button>
          ))}
        </div>
      </div>

      {/* Top Trend Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <h3 className="font-bold text-slate-900 text-base mb-1">Inflow vs Outflow Trends</h3>
        <p className="text-xs text-slate-500 mb-6">Compare monthly revenue and expenses side-by-side</p>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month_name" tickLine={false} stroke="#94a3b8" fontSize={12} />
              <YAxis tickLine={false} stroke="#94a3b8" fontSize={12} />
              <Tooltip
                formatter={(val) => formatCurrency(val, currency)}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: 30-Day Daily Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Spending Waves */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-1">30-Day Daily Activity</h3>
          <p className="text-xs text-slate-500 mb-6">Daily expense and income waves</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} stroke="#94a3b8" fontSize={10} tickFormatter={(d) => d.slice(5)} />
                <YAxis tickLine={false} stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  formatter={(val) => formatCurrency(val, currency)}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="expense" name="Daily Expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-1">Category Spending Weights</h3>
          <p className="text-xs text-slate-500 mb-6">Relative percentage share of each category</p>
          <div className="h-72 w-full flex items-center justify-center">
            {categoryData.length === 0 ? (
              <p className="text-xs text-slate-400">No expense records available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="amount"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.category_color || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatCurrency(val, currency)}
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', maxHeight: '60px', overflowY: 'auto' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Highest Spending Categories Leaderboard */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <h3 className="font-bold text-slate-900 text-base mb-1">Spending Leaderboard</h3>
        <p className="text-xs text-slate-500 mb-6">Highest outflow categories ranked by total monetary volume</p>

        <div className="space-y-4">
          {categoryData.slice(0, 5).map((cat, i) => (
            <div key={cat.category_id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="w-6 text-center font-extrabold text-sm text-slate-400">#{i + 1}</span>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: cat.category_color || '#6366f1' }}
                >
                  {cat.category_name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{cat.category_name}</h4>
                  <p className="text-[11px] text-slate-400">{cat.transaction_count} transactions logged</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold text-slate-900 text-sm">{formatCurrency(cat.amount, currency)}</p>
                <p className="text-xs font-semibold text-indigo-600">{cat.percentage}% of expenses</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
