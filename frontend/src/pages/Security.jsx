import React, { useState, useEffect } from 'react'
import api from '../services/api'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Cloud,
  Network,
  RefreshCw,
  FileText,
  DollarSign,
  Lock,
  ExternalLink,
  Bot,
  Zap,
} from 'lucide-react'

export default function Security() {
  const [summary, setSummary] = useState(null)
  const [findings, setFindings] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [showDiagram, setShowDiagram] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [sumRes, findRes, repRes] = await Promise.all([
        api.get('/security/summary'),
        api.get('/security/findings'),
        api.get('/security/reports'),
      ])
      setSummary(sumRes.data)
      setFindings(findRes.data)
      setReports(repRes.data)
    } catch (err) {
      console.error('Failed to load security telemetry:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRunScan = async () => {
    try {
      setScanning(true)
      setMessage(null)
      const res = await api.post('/security/scan')
      setMessage({ type: 'success', text: res.data.message })
      await fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to initiate AI security scan.' })
    } finally {
      setScanning(false)
    }
  }

  const filteredFindings = findings.filter((f) => {
    if (activeTab === 'all') return true
    if (activeTab === 'open') return f.status === 'OPEN'
    if (activeTab === 'resolved') return f.status === 'RESOLVED'
    if (activeTab === 'guardrail') return f.source?.includes('guardrail') || f.finding_type?.includes('Prompt')
    return true
  })

  const getSeverityBadge = (sev) => {
    const s = String(sev).toUpperCase()
    if (s === 'CRITICAL' || s === 'HIGH') {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          {s}
        </span>
      )
    }
    if (s === 'MEDIUM') {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          MEDIUM
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        LOW / AUDIT
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Querying AWS Security Findings & AI Telemetry...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cloud Security & AI FinOps Hub</h1>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              AWS Production Architecture
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time GuardDuty threat detection, Amazon Bedrock Guardrail sanitization, and autonomous FinOps remediations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition shadow-sm disabled:opacity-50"
          >
            {scanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running Bedrock AI Scan...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Run AI Security Audit
              </>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5" />
            {message.text}
          </div>
          <button onClick={() => setMessage(null)} className="text-xs underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Threats</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{summary?.open_threats ?? 0}</span>
            <span className="ml-2 text-xs text-rose-600 font-medium">Requires Action</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Ingested via Amazon GuardDuty & EventBridge
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bedrock Guardrails</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{summary?.guardrail_interventions ?? 0}</span>
            <span className="ml-2 text-xs text-emerald-600 font-medium">100% Intervened</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            PII Masking & Prompt Injection Block active
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FinOps Optimization</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">Optimal</span>
            <span className="ml-2 text-xs text-emerald-600 font-medium">VPC Endpoints ON</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Zero NAT fee on S3 & DynamoDB queries
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Reasoning Engine</span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold text-slate-900 truncate block">Claude 3 Haiku</span>
            <span className="text-xs text-indigo-600 font-medium">Bedrock Runtime v1.0</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 truncate">
            Automated remediation recommendations
          </p>
        </div>
      </div>

      {/* Cloud Architecture Health Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">AWS Cloud Tier Infrastructure Status</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live operational status of provisioned AWS resources across 2 Availability Zones</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDiagram(!showDiagram)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
            >
              {showDiagram ? 'Hide Architecture Diagram' : 'View Architecture Diagram'}
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              High Availability
            </span>
          </div>
        </div>

        {showDiagram && (
          <div className="mt-4 p-3 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
            <img
              src="/architecture-diagram.jpg"
              alt="AWS Architecture Diagram"
              className="w-full rounded-xl object-contain max-h-[500px]"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Virtual Private Cloud</p>
              <p className="text-sm font-bold text-slate-800">{summary?.cloud_status?.vpc || 'VPC 10.0.0.0/16 Multi-AZ'}</p>
              <p className="text-xs text-slate-500 mt-0.5">2 Public, 2 Private & 2 Isolated DB subnets</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Edge & Ingress</p>
              <p className="text-sm font-bold text-slate-800">{summary?.cloud_status?.api_gateway || 'CloudFront + API Gateway v2'}</p>
              <p className="text-xs text-slate-500 mt-0.5">OAC Protected S3 + VPC Link</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Compute Layer</p>
              <p className="text-sm font-bold text-slate-800">{summary?.cloud_status?.compute || 'Internal ALB + Auto Scaling Group'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Private Subnets, Zero Public Ingress</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Relational Database</p>
              <p className="text-sm font-bold text-slate-800">{summary?.cloud_status?.database || 'MySQL 8.0 / Aurora Serverless v2'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Isolated Subnet Tier, KMS Encrypted</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Threat Detection</p>
              <p className="text-sm font-bold text-slate-800">{summary?.cloud_status?.guardduty || 'Amazon GuardDuty Detector'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Continuous DNS & CloudTrail Analysis</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 text-rose-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Security Perimeter</p>
              <p className="text-sm font-bold text-slate-800">{summary?.cloud_status?.waf || 'AWS WAF WebACL Active'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Rate Limiting & OWASP Core Defense</p>
            </div>
          </div>
        </div>
      </div>

      {/* Findings Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Security Findings & AI Remediations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Threats analyzed by Amazon Bedrock Claude 3 with Guardrail PII masking
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All ({findings.length})
            </button>
            <button
              onClick={() => setActiveTab('open')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'open' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Open Threats
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'resolved' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Resolved Audits
            </button>
            <button
              onClick={() => setActiveTab('guardrail')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'guardrail' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Guardrail Events
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredFindings.map((finding) => (
            <div key={finding.finding_id} className="p-6 hover:bg-slate-50/50 transition">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSeverityBadge(finding.ai_severity || finding.severity)}
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {finding.finding_id}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Source: {finding.source}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {new Date(finding.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 pt-1">{finding.title}</h3>
                  <p className="text-sm text-slate-600">{finding.description}</p>
                </div>
                <div className="shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      finding.status === 'OPEN'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {finding.status}
                  </span>
                </div>
              </div>

              {/* Bedrock AI Insights Card */}
              <div className="mt-4 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs uppercase tracking-wider">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  Amazon Bedrock AI Analysis & Remediation Plan
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/80 p-3 rounded-lg border border-indigo-100/50">
                    <span className="font-bold text-slate-700 block mb-1">Root Cause & Risk Assessment:</span>
                    <p className="text-slate-600 leading-relaxed">{finding.ai_risk_analysis}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg border border-indigo-100/50">
                    <span className="font-bold text-slate-700 block mb-1">FinOps & Exposure Impact:</span>
                    <p className="text-slate-600 leading-relaxed">{finding.ai_financial_impact}</p>
                  </div>
                </div>

                {finding.remediation_steps && finding.remediation_steps.length > 0 && (
                  <div className="pt-1">
                    <span className="text-xs font-bold text-slate-700 block mb-1.5">
                      Prescribed Step-by-Step Remediation:
                    </span>
                    <ul className="space-y-1">
                      {finding.remediation_steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredFindings.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-sm font-medium">No findings match the selected filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* S3 Audit Scan Reports */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Archived S3 Security & FinOps Audit Reports</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated 6-hour EventBridge reports persisted in Amazon S3 ScanReportsBucket
            </p>
          </div>
          <FileText className="w-5 h-5 text-slate-400" />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                <th className="pb-3">Report ID</th>
                <th className="pb-3">Generated At</th>
                <th className="pb-3">Findings</th>
                <th className="pb-3">Format</th>
                <th className="pb-3">S3 Storage Path</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((rep) => (
                <tr key={rep.report_id} className="hover:bg-slate-50/60">
                  <td className="py-3 font-mono font-bold text-slate-800">{rep.report_id}</td>
                  <td className="py-3 text-slate-600">{new Date(rep.generated_at).toLocaleString()}</td>
                  <td className="py-3 font-medium text-slate-700">{rep.findings_count} Items</td>
                  <td className="py-3 text-slate-500">{rep.format}</td>
                  <td className="py-3 font-mono text-indigo-600 truncate max-w-xs">{rep.s3_uri}</td>
                  <td className="py-3 text-right">
                    <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {rep.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
