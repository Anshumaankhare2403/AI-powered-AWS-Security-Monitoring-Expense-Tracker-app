import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import {
  Search,
  Filter,
  PlusCircle,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  FileSpreadsheet,
} from 'lucide-react'

export default function Transactions() {
  const { currency } = useAuth()
  const [searchParams] = useSearchParams()

  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtering, search, and pagination state
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('transaction_date')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, net_amount: 0 })

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('')
  const [dateVal, setDateVal] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete modal
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      openAddModal()
    }
  }, [searchParams])

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories')
      setCategories(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', 15)
      params.append('sort_by', sortBy)
      params.append('order', order)
      if (search) params.append('search', search)
      if (typeFilter) params.append('type', typeFilter)
      if (catFilter) params.append('category_id', catFilter)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const res = await api.get(`/transactions?${params.toString()}`)
      setTransactions(res.data.items)
      setTotalPages(res.data.total_pages)
      setTotalCount(res.data.total)
      setSummary({
        total_income: res.data.total_income,
        total_expense: res.data.total_expense,
        net_amount: res.data.net_amount,
      })
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
    fetchTransactions()
  }, [page, typeFilter, catFilter, sortBy, order, startDate, endDate])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchTransactions()
  }

  const openAddModal = () => {
    setEditingTx(null)
    setTitle('')
    setAmount('')
    setType('expense')
    const firstCat = categories.find((c) => c.type === 'expense')
    setCategory(firstCat ? firstCat.id : '')
    setDateVal(new Date().toISOString().split('T')[0])
    setPaymentMethod('credit_card')
    setNotes('')
    setShowModal(true)
  }

  const openEditModal = (tx) => {
    setEditingTx(tx)
    setTitle(tx.title)
    setAmount(tx.amount)
    setType(tx.type)
    setCategory(tx.category_id)
    setDateVal(tx.transaction_date)
    setPaymentMethod(tx.payment_method)
    setNotes(tx.notes || '')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        title,
        amount: parseFloat(amount),
        type,
        category_id: parseInt(category),
        transaction_date: dateVal,
        payment_method: paymentMethod,
        notes,
      }

      if (editingTx) {
        await api.put(`/transactions/${editingTx.id}`, payload)
      } else {
        await api.post('/transactions', payload)
      }

      setShowModal(false)
      fetchTransactions()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save transaction.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await api.delete(`/transactions/${deletingId}`)
      setDeletingId(null)
      fetchTransactions()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete transaction.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transaction Ledger</h1>
          <p className="text-xs text-slate-500">Track, filter, and audit every incoming and outgoing expense</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Transaction</span>
        </button>
      </div>

      {/* Filtered Aggregates Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-800">Filtered Inflow (Income)</p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">
            +{formatCurrency(summary.total_income, currency)}
          </p>
        </div>
        <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
          <p className="text-xs font-semibold text-rose-800">Filtered Outflow (Expense)</p>
          <p className="text-lg font-bold text-rose-600 mt-0.5">
            -{formatCurrency(summary.total_expense, currency)}
          </p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-600">Net Period Balance</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">
            {formatCurrency(summary.net_amount, currency)}
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, description or notes..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition"
            />
          </form>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition"
          >
            <option value="">All Types</option>
            <option value="expense">Expense Only</option>
            <option value="income">Income Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}-${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split('-')
              setSortBy(s)
              setOrder(o)
              setPage(1)
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition"
          >
            <option value="transaction_date-desc">Newest First</option>
            <option value="transaction_date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
            <option value="title-asc">Title (A-Z)</option>
          </select>
        </div>

        {/* Date Range Inputs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setPage(1)
            }}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
          />
          {(startDate || endDate || search || typeFilter || catFilter) && (
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setSearch('')
                setTypeFilter('')
                setCatFilter('')
                setPage(1)
              }}
              className="text-indigo-600 hover:text-indigo-700 ml-2 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Title</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No transactions match your search criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{tx.title}</p>
                      {tx.notes && <p className="text-[11px] text-slate-400 truncate max-w-xs">{tx.notes}</p>}
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(tx.transaction_date)}</td>
                    <td className="py-3.5 px-4 text-slate-500 capitalize">{tx.payment_method?.replace('_', ' ')}</td>
                    <td className={`py-3.5 px-4 text-right font-bold text-sm ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => openEditModal(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="Edit Transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(tx.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {transactions.length} of {totalCount} records
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {editingTx ? 'Edit Transaction' : 'New Transaction'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {editingTx ? 'Update financial ledger entry' : 'Record a new income or expense'}
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense')
                    const firstCat = categories.find((c) => c.type === 'expense')
                    if (firstCat) setCategory(firstCat.id)
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    type === 'expense'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('income')
                    const firstCat = categories.find((c) => c.type === 'income')
                    if (firstCat) setCategory(firstCat.id)
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    type === 'income'
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Supermarket, Monthly Rent, Client Fee"
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
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                  >
                    {categories
                      .filter((c) => c.type === type)
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
                    value={dateVal}
                    onChange={(e) => setDateVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional contextual details..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition"
                ></textarea>
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
                  {submitting ? 'Saving...' : editingTx ? 'Save Changes' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Delete Transaction?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              This action cannot be undone. It will remove the entry and update your balance and budget records.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
