/**
 * 条件断点编辑对话框
 * 支持编辑断点条件、命中次数、日志消息
 */

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { BreakpointState } from '../../types/debug'
import { cn } from '../../utils'

type BreakpointDialogTab = 'condition' | 'hitCount' | 'logMessage'

interface BreakpointDialogProps {
  breakpoint: BreakpointState | null
  position?: { x: number; y: number }
  onSave: (id: string, condition?: string, hitCondition?: string, logMessage?: string) => void
  onClose: () => void
}

export function BreakpointDialog({
  breakpoint,
  position,
  onSave,
  onClose,
}: BreakpointDialogProps) {
  const [activeTab, setActiveTab] = useState<BreakpointDialogTab>('condition')
  const [condition, setCondition] = useState('')
  const [hitCondition, setHitCondition] = useState('')
  const [logMessage, setLogMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (breakpoint) {
      setCondition(breakpoint.condition || '')
      setHitCondition(breakpoint.hitCondition || '')
      setLogMessage(breakpoint.logMessage || '')
      // 自动选择有值的 tab
      if (breakpoint.logMessage) setActiveTab('logMessage')
      else if (breakpoint.hitCondition) setActiveTab('hitCount')
      else setActiveTab('condition')
    }
  }, [breakpoint])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [activeTab, breakpoint])

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!breakpoint) return null

  const handleSave = () => {
    onSave(
      breakpoint.id,
      condition || undefined,
      hitCondition || undefined,
      logMessage || undefined
    )
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  const tabs: { id: BreakpointDialogTab; label: string }[] = [
    { id: 'condition', label: '表达式' },
    { id: 'hitCount', label: '命中次数' },
    { id: 'logMessage', label: '日志消息' },
  ]

  const style: React.CSSProperties = position
    ? { position: 'fixed', left: position.x, top: position.y, zIndex: 9999 }
    : {}

  return (
    <div
      ref={dialogRef}
      style={style}
      className="w-[400px] bg-card border border-border rounded-lg shadow-xl overflow-hidden"
    >
      {/* Tab 头部 */}
      <div className="flex items-center border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 px-3 py-2 text-[11px] font-medium transition-colors border-b-2',
              activeTab === tab.id
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={onClose}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 输入区 */}
      <div className="p-3">
        {activeTab === 'condition' && (
          <div>
            <input
              ref={inputRef}
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="当表达式为 true 时暂停，如: x > 10"
              className="w-full bg-input border border-border rounded px-2.5 py-1.5 text-xs font-mono outline-none focus:border-accent transition-colors"
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              输入 Python/JS 表达式，当求值为 true 时触发断点
            </p>
          </div>
        )}

        {activeTab === 'hitCount' && (
          <div>
            <input
              ref={inputRef}
              type="text"
              value={hitCondition}
              onChange={(e) => setHitCondition(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="如: 5、>10、%3"
              className="w-full bg-input border border-border rounded px-2.5 py-1.5 text-xs font-mono outline-none focus:border-accent transition-colors"
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              输入命中次数条件。数字表示等于，也支持 &gt;N、&gt;=N、%N 等
            </p>
          </div>
        )}

        {activeTab === 'logMessage' && (
          <div>
            <input
              ref={inputRef}
              type="text"
              value={logMessage}
              onChange={(e) => setLogMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="如: x = {x}, len = {len(arr)}"
              className="w-full bg-input border border-border rounded px-2.5 py-1.5 text-xs font-mono outline-none focus:border-accent transition-colors"
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              程序运行到此行时输出日志而不中断。用 {'{ }'} 包裹表达式进行插值
            </p>
          </div>
        )}

        {/* 位置信息 + 保存 */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            第 {breakpoint.line} 行
            {breakpoint.verified && <span className="text-green-400 ml-1">(已验证)</span>}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BreakpointDialog
