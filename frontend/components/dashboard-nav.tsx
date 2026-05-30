'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import {
  LayoutDashboard,
  Shield,
  Eye,
  Bell,
  Calendar,
  Video,
  Moon,
  Menu,
  LogOut,
  Car,
} from 'lucide-react'
import { useState } from 'react'

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Intrusion Detection',
    href: '/intrusion',
    icon: Shield,
    children: [
      { title: 'Alerts', href: '/intrusion/alerts', icon: Bell },
      { title: 'Daily Logs', href: '/intrusion/daily-logs', icon: Calendar },
      { title: 'Live Inspection', href: '/intrusion/live-inspection', icon: Video },
      { title: 'Relax Mode', href: '/intrusion/relax-mode', icon: Moon },
    ],
  },
  {
    title: 'Drowsiness Detection',
    href: '/drowsiness',
    icon: Eye,
  },
]

function NavLink({
  href,
  icon: Icon,
  title,
  isActive,
  isChild = false,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  isActive: boolean
  isChild?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isChild && 'ml-6',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      <Icon className={cn('h-5 w-5', isChild && 'h-4 w-4')} />
      {title}
    </Link>
  )
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Car className="h-5 w-5" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight">CarGuard</span>
          <p className="text-xs text-muted-foreground">Security System</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigationItems.map((item) => (
          <div key={item.href}>
            <NavLink
              href={item.href}
              icon={item.icon}
              title={item.title}
              isActive={pathname === item.href}
            />
            {item.children?.map((child) => (
              <NavLink
                key={child.href}
                href={child.href}
                icon={child.icon}
                title={child.title}
                isActive={pathname === child.href}
                isChild
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={() => {
            logout()
            onNavigate?.()
          }}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  )
}

export function DashboardNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Nav */}
      <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background px-4 md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar">
            <VisuallyHidden.Root>
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Main navigation for CarGuard dashboard</SheetDescription>
            </VisuallyHidden.Root>
            <Navigation onNavigate={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="h-4 w-4" />
          </div>
          <span className="font-bold">CarGuard</span>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-border bg-sidebar md:block">
        <Navigation />
      </aside>
    </>
  )
}
