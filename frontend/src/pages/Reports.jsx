import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import { FileText, Download, Calendar, ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react'

export default function Reports() {
  const { currency } = useAuth()
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [reportType, setReportType] = useState('monthly')

  const [monthlyReport, setMonthlyReport] = useState(null)
  const [yearlyReport, setYearlyReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchReport = async () => {
    try {
      setLoading(true)
      if (reportType === 'monthly') {
        const res = await api.get(`/reports/monthly?month=${selectedMonth}&year=${selectedYear}`)
        setMonthlyReport(res.data)
      } else {
        const res = await api.get(`/reports/yearly?year=${selectedYear}`)
        setYearlyReport(res.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [selectedMonth, selectedYear, reportType])

  const handleExport = async (format) => {
    setExporting(true)
    try {
      const response = await api.get(`/reports/export?format=${format}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `financial_report_${selectedYear}_${selectedMonth}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to generate export.')
    } finally {
      setExporting(false)
    }
  }

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Reports</h1>
          <p className="text-xs text-slate-500">Audit-ready monthly and yearly statements with CSV and PDF document export</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF Statement</span>
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setReportType('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              reportType === 'monthly' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Monthly Statement
          </button>
          <button
            onClick={() => setReportType('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              reportType === 'yearly' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Yearly Statement
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {reportType === 'monthly' && (
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
          )}

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
        </div>
      </div>

      {/* Report Body */}
      {loading ? (
        <div className="h-96 bg-white border border-slate-200 rounded-3xl animate-pulse"></div>
      ) : reportType === 'monthly' && monthlyReport ? (
        <div className="space-y-6">
          {/* Monthly KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Gross Income</span>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                {formatCurrency(monthlyReport.total_income, currency)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Gross Expenses</span>
              <p className="text-xl font-bold text-rose-600 mt-1">
                {formatCurrency(monthlyReport.total_expense, currency)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Net Retained Savings</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(monthlyReport.net_savings, currency)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Savings Rate</span>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {monthlyReport.savings_rate_percentage}%
              </p>
            </div>
          </div>

          {/* Itemized Transactions in Month */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-4">
              Itemized Records ({MONTHS[selectedMonth - 1]} {selectedYear})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {monthlyReport.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No transactions recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    monthlyReport.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-slate-500">{formatDate(t.date)}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{t.title}</td>
                        <td className="py-3 px-3 text-slate-600">{t.category}</td>
                        <td className="py-3 px-3 text-slate-500 capitalize">{t.payment_method?.replace('_', ' ')}</td>
                        <td className={`py-3 px-3 text-right font-bold ${
                          t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : yearlyReport ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">
            Annual Summary Statement ({selectedYear})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase">
                  <th className="py-3 px-3">Month</th>
                  <th className="py-3 px-3 text-right">Income</th>
                  <th className="py-3 px-3 text-right">Expenses</th>
                  <th className="py-3 px-3 text-right">Net Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {yearlyReport.months.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-semibold text-slate-800">{MONTHS[m.month - 1]}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(m.income, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-rose-600">
                      {formatCurrency(m.expense, currency)}
                    </td>
                    <td className={`py-3 px-3 text-right font-bold ${
                      parseFloat(m.savings) >= 0 ? 'text-slate-900' : 'text-rose-600'
                    }`}>
                      {formatCurrency(m.savings, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 text-xs font-bold text-slate-900 bg-slate-50/50">
                  <td className="py-3 px-3">Total Year</td>
                  <td className="py-3 px-3 text-right text-emerald-600">
                    {formatCurrency(yearlyReport.total_income, currency)}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-600">
                    {formatCurrency(yearlyReport.total_expense, currency)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {formatCurrency(yearlyReport.net_savings, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
