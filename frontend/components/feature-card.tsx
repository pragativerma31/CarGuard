'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon, ChevronRight } from 'lucide-react'

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  variant?: 'default' | 'accent'
  className?: string
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  href,
  variant = 'default',
  className,
}: FeatureCardProps) {
  return (
    <Link href={href} className="block group">
      <Card
        className={cn(
          'border transition-all duration-300 cursor-pointer',
          'hover:scale-[1.02] hover:border-primary/50',
          variant === 'accent' && 'gradient-border glow-sm',
          className
        )}
      >
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div
                className={cn(
                  'inline-flex rounded-xl p-4 transition-colors',
                  variant === 'accent'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-foreground'
                )}
              >
                <Icon className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
