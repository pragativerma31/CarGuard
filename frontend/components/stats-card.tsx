'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'destructive'
  className?: string
}

const variantStyles = {
  default: 'bg-card border-border',
  accent: 'bg-card border-primary/30 glow-sm',
  success: 'bg-card border-[oklch(0.7_0.18_145)]/30',
  warning: 'bg-card border-[oklch(0.8_0.15_80)]/30',
  destructive: 'bg-card border-destructive/30',
}

const iconVariantStyles = {
  default: 'text-muted-foreground bg-secondary',
  accent: 'text-primary bg-primary/10',
  success: 'text-[oklch(0.7_0.18_145)] bg-[oklch(0.7_0.18_145)]/10',
  warning: 'text-[oklch(0.8_0.15_80)] bg-[oklch(0.8_0.15_80)]/10',
  destructive: 'text-destructive bg-destructive/10',
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        'border transition-all duration-300 hover:scale-[1.02]',
        variantStyles[variant],
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-[oklch(0.7_0.18_145)]' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : '-'}{trend.value}% from last week
              </p>
            )}
          </div>
          <div
            className={cn(
              'rounded-xl p-3 transition-colors',
              iconVariantStyles[variant]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
