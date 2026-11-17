import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import { Target, PlusCircle, Calendar, Coins, CheckCircle2, Trash2, Edit2, X, Trophy } from 'lucide-react'

export default function Goals() {
  const { currency } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  // Goal modal
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [title, setTitle] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [initialAmount, setInitialAmount] = useState('0')
  const [targetDate, setTargetDate] = useState('')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('#10b981')
  const [submitting, setSubmitting] = useState(false)

  // Contribution modal
  const [showContribModal, setShowContribModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const res = await api.get('/goals')
      setGoals(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const openAddModal = () => {
    setEditingGoal(null)
    setTitle('')
    setTargetAmount('')
    setInitialAmount('0')
    setTargetDate('')
    setCategory('General')
    setColor('#10b981')
    setShowGoalModal(true)
  }

  const openEditModal = (g) => {
    setEditingGoal(g)
    setTitle(g.title)
    setTargetAmount(g.target_amount)
    setTargetDate(g.target_date || '')
    setCategory(g.category || 'General')
    setColor(g.color || '#10b981')
    setShowGoalModal(true)
  }

  const handleSaveGoal = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingGoal) {
        await api.put(`/goals/${editingGoal.id}`, {
          title,
          target_amount: parseFloat(targetAmount),
          target_date: targetDate || null,
          category,
          color,
        })
      } else {
        await api.post('/goals', {
          title,
          target_amount: parseFloat(targetAmount),
          initial_amount: parseFloat(initialAmount || 0),
          target_date: targetDate || null,
          category,
          color,
        })
      }
      setShowGoalModal(false)
      fetchGoals()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save goal.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddContribution = async (e) => {
    e.preventDefault()
    if (!selectedGoal) return
    setSubmitting(true)
    try {
      await api.post(`/goals/${selectedGoal.id}/contributions`, {
        amount: parseFloat(contribAmount),
        note: contribNote,
      })
      setShowContribModal(false)
      setContribAmount('')
      setContribNote('')
      fetchGoals()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add contribution.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this savings goal and its deposit records?')) return
    try {
      await api.delete(`/goals/${id}`)
      fetchGoals()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete goal.')
    }
  }

  const COLOR_OPTIONS = ['#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Savings Goals</h1>
          <p className="text-xs text-slate-500">Plan and accumulate funds for major milestones, vacations, and emergency reserves</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Goal</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-slate-200/80 rounded-2xl"></div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
          <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No Savings Goals Set Yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Create your first goal like "Emergency Fund", "New Laptop", or "Dream Vacation".</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((g) => {
            const isCompleted = g.status === 'completed'
            return (
              <div
                key={g.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                        style={{ backgroundColor: g.color || '#10b981' }}
                      >
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{g.title}</h4>
                        <span className="text-[11px] text-slate-400">{g.category || 'Personal'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(g)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amount Progress */}
                  <div className="flex items-baseline justify-between mt-4">
                    <div>
                      <span className="text-xl font-extrabold text-slate-900">
                        {formatCurrency(g.current_amount, currency)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {' '}
                        / {formatCurrency(g.target_amount, currency)}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {g.progress_percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2.5">
                    <div
                      className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      style={{ width: `${g.progress_percentage}%` }}
                    ></div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{g.target_date ? formatDate(g.target_date) : 'No deadline'}</span>
                    </span>
                    <span className="font-semibold text-slate-700">
                      {isCompleted ? 'Target Achieved 🎉' : `${formatCurrency(g.remaining_amount, currency)} to go`}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    disabled={isCompleted}
                    onClick={() => {
                      setSelectedGoal(g)
                      setContribAmount('')
                      setContribNote('')
                      setShowContribModal(true)
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                      isCompleted
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>{isCompleted ? 'Goal Completed' : '+ Add Contribution'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowGoalModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {editingGoal ? 'Edit Goal' : 'New Savings Goal'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">Set a milestone and track deposits</p>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Vacation Fund, House Downpayment"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Amount ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="e.g. 5000.00"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              {!editingGoal && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Deposit ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category / Tag</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Travel, Emergency, Vehicle"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingGoal ? 'Update Goal' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contribution Modal */}
      {showContribModal && selectedGoal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowContribModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Add Deposit</h2>
            <p className="text-xs text-slate-500 mb-5">
              Contributing toward <span className="font-semibold text-indigo-600">{selectedGoal.title}</span>
            </p>

            <form onSubmit={handleAddContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contribution Amount ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  placeholder="e.g. Side project bonus"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowContribModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Deposit Amount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
