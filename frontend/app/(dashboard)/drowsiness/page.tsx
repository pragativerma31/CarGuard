'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/page-header'
import { StatsCard } from '@/components/stats-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { drowsinessService } from '@/services/firebase'
import { format, parse, isValid } from 'date-fns'
import { Eye, AlertTriangle, Clock, Activity, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type FirebaseAlert = {
  id: string
  is_drowsy: boolean
  timestamp: string   // "YYYY-MM-DD HH:mm:ss" from Python datetime.now().strftime(...)
  detected_at_speed: number
}

type Severity = 'mild' | 'moderate' | 'severe'

/**
 * Parse Python strftime string "2024-01-15 14:30:00" → Date object
 * Falls back gracefully if the string is malformed.
 */
function parseTimestamp(ts: string): Date | null {
  if (!ts) return null
  try {
    // date-fns parse: pattern must match Python's "%Y-%m-%d %H:%M:%S"
    const d = parse(ts, 'yyyy-MM-dd HH:mm:ss', new Date())
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

function safeFormat(ts: string, fmt: string): string {
  const d = parseTimestamp(ts)
  return d ? format(d, fmt) : 'Unknown time'
}

function getSeverity(speed: number): Severity {
  if (speed >= 50) return 'severe'
  if (speed >= 30) return 'moderate'
  return 'mild'
}

function buildChartData(alerts: FirebaseAlert[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const counts: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]))

  alerts.forEach(a => {
    const d = parseTimestamp(a.timestamp)
    if (d) {
      const day = days[d.getDay()]
      counts[day] = (counts[day] ?? 0) + 1
    }
  })

  return days.map(day => ({ day, alerts: counts[day] }))
}

function isToday(ts: string): boolean {
  const d = parseTimestamp(ts)
  if (!d) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

const severityColors: Record<Severity, string> = {
  mild:     'bg-[oklch(0.8_0.15_80)]/20 text-[oklch(0.8_0.15_80)] border-[oklch(0.8_0.15_80)]/30',
  moderate: 'bg-[oklch(0.65_0.2_40)]/20 text-[oklch(0.65_0.2_40)] border-[oklch(0.65_0.2_40)]/30',
  severe:   'bg-destructive/20 text-destructive border-destructive/30',
}

const severityTextColors: Record<Severity, string> = {
  mild:     'text-[oklch(0.8_0.15_80)]',
  moderate: 'text-[oklch(0.65_0.2_40)]',
  severe:   'text-destructive',
}

const severityBgColors: Record<Severity, string> = {
  mild:     'bg-[oklch(0.8_0.15_80)]/10',
  moderate: 'bg-[oklch(0.65_0.2_40)]/10',
  severe:   'bg-destructive/10',
}

export default function DrowsinessPage() {
  const [alerts, setAlerts] = useState<FirebaseAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    drowsinessService.getAlerts()
      .then((data) => {
        setAlerts(data as FirebaseAlert[])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const unsubscribe = drowsinessService.subscribeToAlerts((alert) => {
      setAlerts(prev => {
        if (prev.some(a => a.id === alert.id)) return prev
        return [alert as unknown as FirebaseAlert, ...prev]
      })
    })

    return () => unsubscribe()
  }, [])

  const severeCounts = {
    mild:     alerts.filter(a => getSeverity(a.detected_at_speed) === 'mild').length,
    moderate: alerts.filter(a => getSeverity(a.detected_at_speed) === 'moderate').length,
    severe:   alerts.filter(a => getSeverity(a.detected_at_speed) === 'severe').length,
  }

  const stats = {
    totalAlerts: alerts.length,
    alertsToday: alerts.filter(a => isToday(a.timestamp)).length,
    severeCounts,
  }

  const chartData = buildChartData(alerts)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Drowsiness Detection"
        description="Monitor driver alertness and view drowsiness alerts"
        showBackButton
        backHref="/dashboard"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Alerts"    value={stats.totalAlerts}           icon={Eye}           variant="accent"      />
        <StatsCard title="Alerts Today"    value={stats.alertsToday}           icon={Clock}         variant="warning"     />
        <StatsCard title="Severe Alerts"   value={stats.severeCounts.severe}   icon={AlertTriangle} variant="destructive" />
        <StatsCard title="Moderate Alerts" value={stats.severeCounts.moderate} icon={Activity}      variant="default"     />
      </div>

      {/* Chart Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.6 0 0)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.6 0 0)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.14 0.01 260)',
                    border: '1px solid oklch(0.25 0.01 260)',
                    borderRadius: '8px',
                    color: 'oklch(0.95 0 0)',
                  }}
                  cursor={{ fill: 'oklch(0.2 0.01 260)' }}
                />
                <Bar dataKey="alerts" fill="oklch(0.75 0.15 185)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Recent Drowsiness Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading alerts…</p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No drowsiness alerts recorded.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const severity = getSeverity(alert.detected_at_speed)
                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    {/* Severity */}
                    <Badge variant="outline" className={cn('capitalize shrink-0', severityColors[severity])}>
                      {severity}
                    </Badge>

                    {/* Speed */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                      <Gauge className="h-3.5 w-3.5" />
                      <span>{alert.detected_at_speed ?? 0} km/h</span>
                    </div>

                    {/* Timestamp */}
                    <p className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                      {safeFormat(alert.timestamp, 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}