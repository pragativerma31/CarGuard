'use client'

import { PageHeader } from '@/components/page-header'
import { FeatureCard } from '@/components/feature-card'
import { Bell, Calendar, Video, Moon } from 'lucide-react'

const features = [
  {
    title: 'Alerts',
    description: 'View and manage all intrusion alerts with detailed information and captured images.',
    icon: Bell,
    href: '/intrusion/alerts',
  },
  {
    title: 'Daily Logs',
    description: 'Access comprehensive daily access logs showing authorized and unauthorized attempts.',
    icon: Calendar,
    href: '/intrusion/daily-logs',
  },
  {
    title: 'Live Inspection',
    description: 'Capture real-time images and trigger the buzzer for immediate vehicle inspection.',
    icon: Video,
    href: '/intrusion/live-inspection',
  },
  {
    title: 'Relax Mode',
    description: 'Temporarily disable alerts for a set duration or manually when you are near the vehicle.',
    icon: Moon,
    href: '/intrusion/relax-mode',
  },
]

export default function IntrusionPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Intrusion Detection"
        description="Monitor and manage your vehicle security system"
        showBackButton
        backHref="/dashboard"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {features.map((feature) => (
          <FeatureCard
            key={feature.href}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            href={feature.href}
            variant="accent"
          />
        ))}
      </div>
    </div>
  )
}
