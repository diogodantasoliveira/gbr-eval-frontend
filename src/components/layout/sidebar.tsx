'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  BookOpen,
  Database,
  ListChecks,
  ScrollText,
  BarChart3,
  FileJson,
  Shield,
  Scale,
  AlertTriangle,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { GlobalSearch } from '@/components/search/global-search'

const STORAGE_KEY = 'gbr-eval-sidebar-collapsed'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/skills', label: 'Skills', icon: BookOpen },
  { href: '/golden-sets', label: 'Golden Sets', icon: Database },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/rubrics', label: 'Rubrics', icon: ScrollText },
  { href: '/runs', label: 'Runs', icon: BarChart3 },
  { href: '/contracts', label: 'Contracts', icon: FileJson },
  { href: '/conventions', label: 'Conventions', icon: Shield },
  { href: '/calibration', label: 'Calibration', icon: Scale },
  { href: '/alerts', label: 'Alerts', icon: AlertTriangle },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setCollapsed(stored === 'true')
    }
  }, [])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center px-3">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-foreground">
            gbr-eval
          </span>
        )}
      </div>

      <Separator />

      {/* Search */}
      {!collapsed && (
        <div className="px-2 pt-2">
          <GlobalSearch />
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Bottom controls */}
      <div className="flex flex-col gap-1 p-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
          title={collapsed ? 'Toggle theme' : undefined}
          type="button"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="size-4 shrink-0" />
          ) : (
            <Moon className="size-4 shrink-0" />
          )}
          {!collapsed && <span>Toggle theme</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={collapsed ? 'Expand sidebar' : undefined}
          type="button"
        >
          {collapsed ? (
            <ChevronRight className="size-4 shrink-0" />
          ) : (
            <ChevronLeft className="size-4 shrink-0" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
