/**
 * 调用栈面板组件
 * 显示当前的函数调用栈
 */

import { useState } from 'react'
import { ChevronRight, ChevronDown, Layers, RefreshCw } from 'lucide-react'
import type { Thread, StackFrame } from '../../types/debug'
import { cn } from '../../utils'

interface CallStackViewProps {
  threads: Thread[]
  stackFrames: StackFrame[]
  activeThreadId: number | null
  activeFrameId: number | null
  onSelectThread: (threadId: number) => void
  onSelectFrame: (frameId: number) => void
  onRefresh?: () => void
  loading?: boolean
  className?: string
}

export function CallStackView({
  threads,
  stackFrames,
  activeThreadId,
  activeFrameId,
  onSelectThread,
  onSelectFrame,
  onRefresh,
  loading = false,
  className,
}: CallStackViewProps) {
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set([1]))

  const toggleThread = (threadId: number) => {
    const newExpanded = new Set(expandedThreads)
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId)
    } else {
      newExpanded.add(threadId)
      onSelectThread(threadId)
    }
    setExpandedThreads(newExpanded)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            调用栈
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title="刷新"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          </button>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {threads.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground text-center italic">
            暂无调用栈信息
          </div>
        ) : (
          threads.map((thread) => (
            <ThreadSection
              key={thread.id}
              thread={thread}
              stackFrames={activeThreadId === thread.id ? stackFrames : []}
              isActive={activeThreadId === thread.id}
              isExpanded={expandedThreads.has(thread.id)}
              activeFrameId={activeFrameId}
              onToggle={() => toggleThread(thread.id)}
              onSelectFrame={onSelectFrame}
            />
          ))
        )}
      </div>
    </div>
  )
}

/** 线程区块 */
interface ThreadSectionProps {
  thread: Thread
  stackFrames: StackFrame[]
  isActive: boolean
  isExpanded: boolean
  activeFrameId: number | null
  onToggle: () => void
  onSelectFrame: (frameId: number) => void
}

function ThreadSection({
  thread,
  stackFrames,
  isActive,
  isExpanded,
  activeFrameId,
  onToggle,
  onSelectFrame,
}: ThreadSectionProps) {
  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* 线程标题 */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-1 px-2 py-1.5 transition-colors',
          isActive ? 'bg-accent/10' : 'hover:bg-secondary/50'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
        <span className={cn('text-[11px] font-medium', isActive && 'text-accent')}>
          {thread.name}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          Thread #{thread.id}
        </span>
      </button>

      {/* 栈帧列表 */}
      {isExpanded && stackFrames.length > 0 && (
        <div className="bg-secondary/20">
          {stackFrames.map((frame, index) => (
            <StackFrameItem
              key={frame.id}
              frame={frame}
              isActive={activeFrameId === frame.id}
              isTopFrame={index === 0}
              onClick={() => onSelectFrame(frame.id)}
            />
          ))}
        </div>
      )}

      {isExpanded && stackFrames.length === 0 && (
        <div className="px-4 py-2 text-[10px] text-muted-foreground italic">
          无栈帧信息
        </div>
      )}
    </div>
  )
}

/** 栈帧项 */
interface StackFrameItemProps {
  frame: StackFrame
  isActive: boolean
  isTopFrame: boolean
  onClick: () => void
}

function StackFrameItem({ frame, isActive, isTopFrame, onClick }: StackFrameItemProps) {
  // 解析源文件名
  const fileName = frame.source?.name || frame.source?.path?.split('/').pop() || '<unknown>'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-1 flex items-start gap-2 transition-colors',
        isActive
          ? 'bg-yellow-500/20 border-l-2 border-yellow-500'
          : 'hover:bg-secondary/50 border-l-2 border-transparent'
      )}
    >
      {/* 帧指示器 */}
      <span className={cn(
        'w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold flex-shrink-0 mt-0.5',
        isTopFrame
          ? 'bg-yellow-500 text-yellow-950'
          : 'bg-secondary text-muted-foreground'
      )}>
        {isTopFrame ? '>' : ' '}
      </span>

      <div className="flex-1 min-w-0">
        {/* 函数名 */}
        <div className="text-[11px] font-mono text-foreground truncate">
          {frame.name}
        </div>

        {/* 文件位置 */}
        <div className="text-[10px] text-muted-foreground truncate">
          {fileName}
          {frame.line && (
            <span className="text-accent ml-1">
              :{frame.line}
              {frame.column && `:${frame.column}`}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default CallStackView
