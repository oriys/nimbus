import { useState } from 'react'
import { Bell, Search, User, ChevronDown, Sun, Moon, Palette } from 'lucide-react'
import { cn } from '../../utils/format'
import { useTheme, colorThemes } from '../../hooks/useTheme'

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showColorMenu, setShowColorMenu] = useState(false)
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme()

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索函数、调用..."
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-3">
        {/* Color theme picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorMenu(!showColorMenu)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="选择主题色"
          >
            <Palette className="w-5 h-5" />
          </button>

          {showColorMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowColorMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-40 bg-popover rounded-lg shadow-lg border border-border py-2 z-50 animate-fade-in">
                <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">主题色</div>
                {colorThemes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setColorTheme(t.id)
                      setShowColorMenu(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                      colorTheme === t.id
                        ? 'bg-secondary text-foreground'
                        : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: t.color }}
                    />
                    <span>{t.name}</span>
                    {colorTheme === t.id && (
                      <span className="ml-auto text-accent">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors',
              showUserMenu ? 'bg-secondary' : 'hover:bg-secondary'
            )}
          >
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">Admin</span>
            <ChevronDown className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              showUserMenu && 'rotate-180'
            )} />
          </button>

          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-popover rounded-lg shadow-lg border border-border py-1 z-50 animate-fade-in">
                <a
                  href="#profile"
                  className="block px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  个人设置
                </a>
                <a
                  href="#api-keys"
                  className="block px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  API Keys
                </a>
                <hr className="my-1 border-border" />
                <button className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors">
                  退出登录
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
