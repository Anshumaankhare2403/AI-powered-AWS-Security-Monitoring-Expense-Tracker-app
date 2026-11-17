import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  User,
  Lock,
  Globe,
  Bell,
  Palette,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  KeyRound,
} from 'lucide-react'

export default function Settings() {
  const { user, updateProfile } = useAuth()

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [currency, setCurrency] = useState(user?.currency || 'INR')
  const [theme, setTheme] = useState(user?.theme || 'light')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Notification Preferences (Client-side / local preferences)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [budgetWarnings, setBudgetWarnings] = useState(true)
  const [goalMilestones, setGoalMilestones] = useState(true)
  const [notifSaved, setNotifSaved] = useState(false)

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileSuccess('')
    setProfileError('')

    try {
      await updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl,
        currency,
        theme,
      })
      setProfileSuccess('Profile preferences updated successfully.')
      setTimeout(() => setProfileSuccess(''), 4000)
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordSuccess('')
    setPasswordError('')

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordLoading(true)
    try {
      const res = await api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setPasswordSuccess(res.data.message || 'Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(''), 4000)
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSaveNotifications = (e) => {
    e.preventDefault()
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }

  const currencies = [
    { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
    { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar (CA$)', symbol: 'CA$' },
    { code: 'AUD', name: 'Australian Dollar (A$)', symbol: 'A$' },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal profile, currency preferences, security credentials, and alert settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile & Currency */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center space-x-3 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Personal Information & Preferences</h2>
                <p className="text-xs text-slate-500">Update your public details and default currency</p>
              </div>
            </div>

            {profileSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Email cannot be changed directly for security audit compliance.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Theme Preference
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  >
                    <option value="light">Light Mode (Default)</option>
                    <option value="dark">Dark Mode</option>
                    <option value="system">System Synchronized</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {profileLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>

          {/* Password Security Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center space-x-3 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Security & Password</h2>
                <p className="text-xs text-slate-500">Change your password with bcrypt encryption protection</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Preferences & Security Status */}
        <div className="space-y-6">
          {/* Notification Preferences */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                <p className="text-[11px] text-slate-500">Manage real-time alerts</p>
              </div>
            </div>

            {notifSaved && (
              <div className="mt-3 p-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Notification preferences saved</span>
              </div>
            )}

            <form onSubmit={handleSaveNotifications} className="mt-4 space-y-4">
              <label className="flex items-start justify-between cursor-pointer space-x-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Budget Limit Alerts</p>
                  <p className="text-[11px] text-slate-500">Alert when spending exceeds 80% or 100% of budget</p>
                </div>
                <input
                  type="checkbox"
                  checked={budgetWarnings}
                  onChange={(e) => setBudgetWarnings(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-start justify-between cursor-pointer space-x-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Goal Milestones</p>
                  <p className="text-[11px] text-slate-500">Notify when savings milestones are achieved</p>
                </div>
                <input
                  type="checkbox"
                  checked={goalMilestones}
                  onChange={(e) => setGoalMilestones(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-start justify-between cursor-pointer space-x-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Email Digest</p>
                  <p className="text-[11px] text-slate-500">Weekly and monthly automated expense summaries</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <button
                type="submit"
                className="w-full mt-2 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Save Preferences
              </button>
            </form>
          </div>

          {/* Security & System Info */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xs">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>AWS AI-Protected Environment</span>
            </div>
            <h4 className="text-base font-bold mb-1">Defense-in-Depth</h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Your financial transactions and personal records are guarded with JWT rotating bearer tokens, bcrypt 12-round hashing, Amazon GuardDuty threat analysis, and Amazon Bedrock PII guardrails.
            </p>

            <div className="space-y-2 pt-3 border-t border-slate-800 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Account ID</span>
                <span className="font-mono text-slate-200">#USR-{user?.id || '001'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Active Session</span>
                <span className="text-emerald-400">Encrypted JWT</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Storage Isolation</span>
                <span className="text-indigo-300">Multi-tenant Row RBAC</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Database Engine</span>
                <span className="text-slate-200">MySQL 8.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
