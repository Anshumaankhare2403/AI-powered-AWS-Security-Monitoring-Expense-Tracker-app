import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/formatters'
import { PlusCircle, PiggyBank, AlertTriangle, AlertOctagon, CheckCircle2, Trash2, Edit2, X } from 'lucide-react'

export default function Budgets() {
  const { currency } = useAuth()
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [alertThreshold, setAlertThreshold] = useState('80')
  const [submitting, setSubmitting] = useState(false)

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories?type=expense')
      setCategories(res.data)
      if (res.data.length > 0) setCategoryId(res.data[0].id)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchBudgets = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/budgets?month=${selectedMonth}&year=${selectedYear}`)
      setBudgets(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchBudgets()
  }, [selectedMonth, selectedYear])

  const openAddModal = () => {
    setEditingBudget(null)
    setAmount('')
    setAlertThreshold('80')
    if (categories.length > 0) setCategoryId(categories[0].id)
    setShowModal(true)
  }

  const openEditModal = (b) => {
    setEditingBudget(b)
    setCategoryId(b.category_id)
    setAmount(b.amount)
    setAlertThreshold(b.alert_threshold.toString())
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}`, {
          amount: parseFloat(amount),
          alert_threshold: parseInt(alertThreshold),
        })
      } else {
        await api.post('/budgets', {
          category_id: parseInt(categoryId),
          month: selectedMonth,
          year: selectedYear,
          amount: parseFloat(amount),
          alert_threshold: parseInt(alertThreshold),
        })
      }
      setShowModal(false)
      fetchBudgets()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to set budget.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget limit?')) return
    try {
      await api.delete(`/budgets/${id}`)
      fetchBudgets()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete budget.')
    }
  }

  const totalAllocated = budgets.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0)
  const totalSpent = budgets.reduce((acc, b) => acc + parseFloat(b.spent_amount || 0), 0)
  const overallUtilization = totalAllocated > 0 ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100)) : 0

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Budgets</h1>
          <p className="text-xs text-slate-500">Set and enforce spending thresholds for each expense category</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Month & Year Selectors */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600 transition"
          >
            {MONTHS.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600 transition"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {/* Overview Progress Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Total Budget Overview ({MONTHS[selectedMonth - 1]} {selectedYear})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cumulative allocated budget across all categories
            </p>
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <p className="text-xs text-slate-400">Total Budget</p>
              <p className="font-bold text-slate-800">{formatCurrency(totalAllocated, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Spent</p>
              <p className="font-bold text-rose-600">{formatCurrency(totalSpent, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Remaining</p>
              <p className="font-bold text-emerald-600">
                {formatCurrency(Math.max(0, totalAllocated - totalSpent), currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              overallUtilization >= 100
                ? 'bg-rose-500'
                : overallUtilization >= 80
                ? 'bg-amber-500'
                : 'bg-indigo-600'
            }`}
            style={{ width: `${overallUtilization}%` }}
          ></div>
        </div>
      </div>

      {/* Category Budgets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-200/80 rounded-2xl"></div>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
          <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No Budgets Configured for this Month</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Set limits for categories like Food, Entertainment or Shopping.</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Budget</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((b) => {
            const isExceeded = b.is_exceeded
            const isWarning = b.is_warning
            const pct = Math.min(b.utilization_percentage, 100)

            return (
              <div
                key={b.id}
                className={`bg-white border rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                  isExceeded
                    ? 'border-rose-300 bg-rose-50/20'
                    : isWarning
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                        style={{ backgroundColor: b.category?.color || '#6366f1' }}
                      >
                        {b.category?.name ? b.category.name[0] : 'B'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{b.category?.name}</h4>
                        <span className="text-[11px] text-slate-400">
                          Threshold Alert: {b.alert_threshold}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(b)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mt-4">
                    <div>
                      <span className="text-xl font-extrabold text-slate-900">
                        {formatCurrency(b.spent_amount, currency)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {' '}
                        / {formatCurrency(b.amount, currency)}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isExceeded
                          ? 'bg-rose-100 text-rose-700'
                          : isWarning
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {b.utilization_percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2.5">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs">
                  {isExceeded ? (
                    <span className="flex items-center text-rose-600 font-semibold space-x-1">
                      <AlertOctagon className="w-4 h-4 shrink-0" />
                      <span>Over budget by {formatCurrency(Math.abs(b.amount - b.spent_amount), currency)}!</span>
                    </span>
                  ) : isWarning ? (
                    <span className="flex items-center text-amber-600 font-semibold space-x-1">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Approaching limit ({b.alert_threshold}%+)</span>
                    </span>
                  ) : (
                    <span className="flex items-center text-emerald-600 font-medium space-x-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{formatCurrency(b.remaining_amount, currency)} remaining</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Set/Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {editingBudget ? 'Edit Budget' : 'Set Category Budget'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Period: {MONTHS[selectedMonth - 1]} {selectedYear}
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              {!editingBudget && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Limit Amount ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Threshold (%)</label>
                <input
                  type="number"
                  required
                  min="50"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Trigger notification when spending crosses this percentage.</span>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingBudget ? 'Update Budget' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
