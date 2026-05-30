'use client'

import { PageHeader } from '@/components/page-header'
import { StatsCard } from '@/components/stats-card'
import { FeatureCard } from '@/components/feature-card'
import { getDashboardStats } from '@/lib/mock-data'
import { Bell, FileText, Wifi, Activity, Shield, Eye } from 'lucide-react'

export default function DashboardPage() {
  const stats = getDashboardStats()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your vehicle security system"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Alerts"
          value={stats.totalAlerts}
          icon={Bell}
          variant="destructive"
          trend={{ value: 12, isPositive: false }}
        />
        <StatsCard
          title="Daily Logs"
          value={stats.totalDailyLogs}
          icon={FileText}
          variant="accent"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="System Status"
          value={stats.systemStatus === 'active' ? 'Active' : 'Inactive'}
          icon={Activity}
          variant={stats.systemStatus === 'active' ? 'accent' : 'warning'}
        />
      </div>

      {/* Feature Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Access</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="Intrusion Detection"
            description="Monitor and manage security alerts, view daily access logs, perform live inspections, and configure relax mode for your vehicle."
            icon={Shield}
            href="/intrusion"
            variant="accent"
          />
          <FeatureCard
            title="Drowsiness Detection"
            description="Track driver alertness levels, view drowsiness alerts and analytics, and ensure safe driving conditions."
            icon={Eye}
            href="/drowsiness"
            variant="accent"
          />
        </div>
      </div>
    </div>
  )
}
