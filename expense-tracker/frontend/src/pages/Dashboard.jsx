import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Receipt,
  AlertTriangle,
  Calendar,
  X,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export default function Dashboard() {
  const { currency, user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [monthlyData, setMonthlyData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Quick Add Transaction Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newType, setNewType] = useState('expense')
  const [newCategory, setNewCategory] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newMethod, setNewMethod] = useState('credit_card')
  const [modalLoading, setModalLoading] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [sumRes, monthRes, catRes, txRes, allCatRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/monthly?months=6'),
        api.get('/analytics/categories?type=expense'),
        api.get('/transactions?limit=6'),
        api.get('/categories'),
      ])
      setSummary(sumRes.data)
      setMonthlyData(
        (monthRes.data || []).map((m) => ({
          ...m,
          income: parseFloat(m.income || 0),
          expense: parseFloat(m.expense || 0),
          net_savings: parseFloat(m.net_savings || 0),
        }))
      )
      setCategoryData(
        (catRes.data || []).map((c) => ({
          ...c,
          amount: parseFloat(c.amount || 0),
        }))
      )
      setRecentTransactions(txRes.data.items || [])
      setCategories(allCatRes.data || [])
      if (allCatRes.data && allCatRes.data.length > 0) {
        const defaultCat = allCatRes.data.find((c) => c.type === 'expense') || allCatRes.data[0]
        setNewCategory(defaultCat.id)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    try {
      await api.post('/transactions', {
        title: newTitle,
        amount: parseFloat(newAmount),
        type: newType,
        category_id: parseInt(newCategory),
        transaction_date: newDate,
        payment_method: newMethod,
      })
      setShowAddModal(false)
      setNewTitle('')
      setNewAmount('')
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to record transaction.')
    } finally {
      setModalLoading(false)
    }
  }

  const PIE_COLORS = ['#6366f1', '#ec4899', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e']

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200/80 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200/80 rounded-2xl"></div>
          <div className="h-80 bg-slate-200/80 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  const budgetProgress = summary?.budget_total > 0
    ? Math.min(100, Math.round((summary.budget_spent / summary.budget_total) * 100))
    : 0

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              Financial Overview
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Hello, {user?.full_name?.split(' ')[0] || 'Friend'} 👋
            </h1>
            <p className="text-sm text-indigo-200 mt-1 max-w-xl">
              Here is your live personal finance snapshot. You have saved{' '}
              <span className="font-semibold text-white">
                {formatCurrency(summary?.monthly_savings, currency)}
              </span>{' '}
              this month.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl font-semibold text-sm bg-white text-indigo-900 hover:bg-indigo-50 shadow-md transition"
          >
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Balance */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Balance</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(summary?.total_balance, currency)}
          </p>
          <div className="mt-2 flex items-center text-xs text-slate-500">
            <span>All-time net liquidity</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">
            {formatCurrency(summary?.total_income, currency)}
          </p>
          <div className="mt-2 flex items-center text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-4 h-4 mr-0.5" />
            <span>Cumulative inflows</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600">
            {formatCurrency(summary?.total_expenses, currency)}
          </p>
          <div className="mt-2 flex items-center text-xs text-rose-600 font-medium">
            <ArrowDownRight className="w-4 h-4 mr-0.5" />
            <span>Cumulative spending</span>
          </div>
        </div>

        {/* Monthly Savings Rate */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Savings Rate</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-purple-600">
            {summary?.savings_rate_percentage || 0}%
          </p>
          <div className="mt-2 flex items-center text-xs text-slate-500">
            <span>Saved {formatCurrency(summary?.monthly_savings, currency)} this month</span>
          </div>
        </div>
      </div>

      {/* Monthly Budget Progress Card */}
      {summary?.budget_total > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Monthly Budget Utilization</h3>
              <p className="text-xs text-slate-500">
                Spent {formatCurrency(summary.budget_spent, currency)} of {formatCurrency(summary.budget_total, currency)} total allocated budget
              </p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              budgetProgress >= 100
                ? 'bg-rose-100 text-rose-700'
                : budgetProgress >= 80
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {budgetProgress}% Utilized
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                budgetProgress >= 100
                  ? 'bg-rose-500'
                  : budgetProgress >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${budgetProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Income vs Expenses</h3>
              <p className="text-xs text-slate-500">Last 6 months comparison</p>
            </div>
            <Link to="/analytics" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
              Deep Analytics →
            </Link>
          </div>
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

        {/* Category Breakdown Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-base">Expense Breakdown</h3>
            <p className="text-xs text-slate-500">Distribution by category</p>
          </div>
          <div className="h-72 w-full min-w-0">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400">No expense records yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="amount"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
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

      {/* Recent Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Transactions</h3>
            <p className="text-xs text-slate-500">Latest recorded income & expense movements</p>
          </div>
          <Link to="/transactions" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
            View All ({summary?.transaction_count || 0}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Title</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No transactions recorded yet. Click "Record Transaction" above to add one!
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-3 font-semibold text-slate-800">{tx.title}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                        style={{
                          backgroundColor: `${tx.category?.color || '#6366f1'}15`,
                          color: tx.category?.color || '#6366f1',
                        }}
                      >
                        {tx.category?.name || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">{formatDate(tx.transaction_date)}</td>
                    <td className="py-3.5 px-3 text-slate-500 capitalize">{tx.payment_method?.replace('_', ' ')}</td>
                    <td className={`py-3.5 px-3 text-right font-bold ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Record Transaction</h2>
            <p className="text-xs text-slate-500 mb-6">Log an income or expense movement directly to your ledger</p>

            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNewType('expense')
                    const match = categories.find((c) => c.type === 'expense')
                    if (match) setNewCategory(match.id)
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    newType === 'expense'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewType('income')
                    const match = categories.find((c) => c.type === 'income')
                    if (match) setNewCategory(match.id)
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    newType === 'income'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Income (+)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Grocery Store, Client Invoice"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                  >
                    {categories
                      .filter((c) => c.type === newType)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
