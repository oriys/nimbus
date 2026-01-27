/**
 * 调试控制台 REPL
 * 交互式执行表达式，查看输出
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Terminal, Trash2 } from 'lucide-react'
import { cn } from '../../utils'

export interface ConsoleEntry {
  id: number
  type: 'input' | 'output' | 'error' | 'system' | 'stdout' | 'stderr'
  content: string
  timestamp?: number
}

interface DebugConsoleProps {
  entries: ConsoleEntry[]
  onEvaluate: (expression: string) => Promise<void>
  onClear: () => void
  disabled?: boolean
  className?: string
}

export function DebugConsole({
  entries,
  onEvaluate,
  onClear,
  disabled = false,
  className,
}: DebugConsoleProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [evaluating, setEvaluating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  const handleSubmit = useCallback(async () => {
    const expr = input.trim()
    if (!expr || evaluating || disabled) return

    setInput('')
    setHistory((prev) => {
      const next = prev.filter((h) => h !== expr)
      next.push(expr)
      return next.slice(-50)
    })
    setHistoryIndex(-1)

    setEvaluating(true)
    try {
      await onEvaluate(expr)
    } finally {
      setEvaluating(false)
    }
  }, [input, evaluating, disabled, onEvaluate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const idx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(idx)
        setInput(history[idx])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex >= 0) {
        const idx = historyIndex + 1
        if (idx >= history.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(idx)
          setInput(history[idx])
        }
      }
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            调试控制台
          </span>
        </div>
        <button
          onClick={onClear}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title="清空控制台"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* 输出区 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto custom-scrollbar bg-black/40 font-mono text-[11px]"
        onClick={() => inputRef.current?.focus()}
      >
        {entries.length === 0 ? (
          <div className="p-4 text-muted-foreground/50 italic text-center">
            在下方输入表达式进行求值（仅在暂停状态下有效）
          </div>
        ) : (
          <div className="p-1 space-y-0.5">
            {entries.map((entry) => (
              <ConsoleEntryLine key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-t border-border bg-card/30">
        <span className="text-accent text-xs font-bold">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? '调试器未暂停' : '输入表达式...'}
          disabled={disabled}
          className="flex-1 bg-transparent text-[11px] font-mono outline-none placeholder:text-muted-foreground/40 disabled:opacity-50"
        />
        {evaluating && (
          <span className="text-[10px] text-muted-foreground animate-pulse">求值中...</span>
        )}
      </div>
    </div>
  )
}

function ConsoleEntryLine({ entry }: { entry: ConsoleEntry }) {
  return (
    <div
      className={cn(
        'px-2 py-0.5 rounded whitespace-pre-wrap break-all',
        entry.type === 'input' && 'text-accent',
        entry.type === 'output' && 'text-foreground',
        entry.type === 'error' && 'text-red-400 bg-red-500/10',
        entry.type === 'system' && 'text-blue-400',
        entry.type === 'stdout' && 'text-foreground',
        entry.type === 'stderr' && 'text-yellow-400',
      )}
    >
      {entry.type === 'input' && (
        <span className="text-muted-foreground mr-1">&gt; </span>
      )}
      {entry.type === 'system' && (
        <span className="text-muted-foreground mr-1">[system] </span>
      )}
      {entry.type === 'error' && (
        <span className="text-red-500 mr-1">[error] </span>
      )}
      {entry.content}
    </div>
  )
}

export default DebugConsole
