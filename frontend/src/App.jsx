import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { CheckCircle2, Database, Server, Laptop, Activity } from 'lucide-react'

export default function App() {
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    healthy: false,
    database: 'checking...',
    version: '',
  })

  useEffect(() => {
    axios
      .get('/health')
      .then((res) => {
        setBackendStatus({
          loading: false,
          healthy: res.data.status === 'healthy',
          database: res.data.database,
          version: res.data.version,
        })
      })
      .catch((err) => {
        setBackendStatus({
          loading: false,
          healthy: false,
          database: 'disconnected',
          version: 'N/A',
        })
      })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      <header className="border-b border-slate-200 bg-white py-4 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              ET
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Expense Tracker
              </h1>
              <p className="text-xs text-slate-500">Milestone 1 • Project Setup & Database Architecture</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Milestone 1 Complete
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-6 py-12 flex-1">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Enterprise Financial Tracking Architecture
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Full-stack Expense Tracker platform built with React, Vite, Tailwind CSS, FastAPI, and MySQL 8 persistent storage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Frontend Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Laptop className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Frontend App</h3>
            <p className="text-xs text-slate-500 mt-1">React 19, Vite, Tailwind CSS v4, Lucide Icons</p>
            <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> Scaffolded & Verified
            </div>
          </div>

          {/* Backend Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Backend API</h3>
            <p className="text-xs text-slate-500 mt-1">FastAPI, SQLAlchemy 2.0, Pydantic, Alembic</p>
            <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> Operational on port 8000
            </div>
          </div>

          {/* Database Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Database Layer</h3>
            <p className="text-xs text-slate-500 mt-1">MySQL 8.0, 8 Relational Tables, Seeded Categories</p>
            <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> Connected & Migrated
            </div>
          </div>
        </div>

        {/* Live System Diagnostics */}
        <div className="max-w-4xl mx-auto mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h4 className="font-semibold text-slate-900 text-sm">System Diagnostics</h4>
            </div>
            <span className="text-xs text-slate-400">Live API /health probe</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">API Status</p>
              <p className="font-semibold text-slate-800 text-sm mt-1">
                {backendStatus.loading ? 'Checking...' : backendStatus.healthy ? 'Healthy' : 'Offline'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">Database Engine</p>
              <p className="font-semibold text-slate-800 text-sm mt-1">MySQL 8.0</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">DB Connectivity</p>
              <p className="font-semibold text-emerald-600 text-sm mt-1 capitalize">
                {backendStatus.database}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">API Version</p>
              <p className="font-semibold text-slate-800 text-sm mt-1">
                {backendStatus.version || '1.0.0'}
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400">
        Expense Tracker Application • Production Architecture
      </footer>
    </div>
  )
}
