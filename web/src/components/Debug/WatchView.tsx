/**
 * 表达式监视面板
 * 允许用户添加自定义表达式并实时查看求值结果
 */

import { useState, useCallback } from 'react'
import { Plus, X, RefreshCw, ChevronRight, ChevronDown, Eye } from 'lucide-react'
import type { Variable } from '../../types/debug'
import { cn } from '../../utils'

export interface WatchExpression {
  id: string
  expression: string
  result?: string
  type?: string
  variablesReference?: number
  error?: string
}

interface WatchViewProps {
  expressions: WatchExpression[]
  onAddExpression: (expression: string) => void
  onRemoveExpression: (id: string) => void
  onEditExpression: (id: string, expression: string) => void
  onRefresh: () => void
  onExpandVariable?: (variablesReference: number) => Promise<Variable[]>
  disabled?: boolean
  className?: string
}

export function WatchView({
  expressions,
  onAddExpression,
  onRemoveExpression,
  onEditExpression,
  onRefresh,
  onExpandVariable,
  disabled = false,
  className,
}: WatchViewProps) {
  const [newExpr, setNewExpr] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleAdd = () => {
    const expr = newExpr.trim()
    if (expr) {
      onAddExpression(expr)
      setNewExpr('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  const startEdit = (expr: WatchExpression) => {
    setEditingId(expr.id)
    setEditValue(expr.expression)
  }

  const commitEdit = (id: string) => {
    const val = editValue.trim()
    if (val) {
      onEditExpression(id, val)
    } else {
      onRemoveExpression(id)
    }
    setEditingId(null)
    setEditValue('')
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            监视
          </span>
          <span className="text-[10px] text-muted-foreground">({expressions.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            disabled={disabled}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            title="刷新所有表达式"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 表达式列表 */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {expressions.map((expr) => (
          <WatchExpressionItem
            key={expr.id}
            expression={expr}
            editing={editingId === expr.id}
            editValue={editValue}
            onStartEdit={() => startEdit(expr)}
            onEditChange={setEditValue}
            onCommitEdit={() => commitEdit(expr.id)}
            onCancelEdit={() => setEditingId(null)}
            onRemove={() => onRemoveExpression(expr.id)}
            onExpandVariable={onExpandVariable}
          />
        ))}
      </div>

      {/* 添加新表达式 */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border">
        <Plus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={newExpr}
          onChange={(e) => setNewExpr(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入表达式..."
          className="flex-1 bg-transparent text-[11px] font-mono outline-none placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  )
}

interface WatchExpressionItemProps {
  expression: WatchExpression
  editing: boolean
  editValue: string
  onStartEdit: () => void
  onEditChange: (value: string) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onRemove: () => void
  onExpandVariable?: (variablesReference: number) => Promise<Variable[]>
}

function WatchExpressionItem({
  expression,
  editing,
  editValue,
  onStartEdit,
  onEditChange,
  onCommitEdit,
  onCancelEdit,
  onRemove,
  onExpandVariable,
}: WatchExpressionItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<Variable[]>([])
  const [loadingChildren, setLoadingChildren] = useState(false)

  const hasChildren = (expression.variablesReference ?? 0) > 0

  const toggleExpand = useCallback(async () => {
    if (!hasChildren || !onExpandVariable) return

    if (!expanded && children.length === 0) {
      setLoadingChildren(true)
      try {
        const vars = await onExpandVariable(expression.variablesReference!)
        setChildren(vars)
      } catch {
        // ignore
      } finally {
        setLoadingChildren(false)
      }
    }
    setExpanded(!expanded)
  }, [hasChildren, expanded, children.length, expression.variablesReference, onExpandVariable])

  if (editing) {
    return (
      <div className="px-2 py-1">
        <input
          autoFocus
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitEdit()
            if (e.key === 'Escape') onCancelEdit()
          }}
          onBlur={onCommitEdit}
          className="w-full bg-input border border-accent rounded px-1.5 py-0.5 text-[11px] font-mono outline-none"
        />
      </div>
    )
  }

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-0.5 hover:bg-secondary/30 transition-colors group"
        onDoubleClick={onStartEdit}
      >
        {/* 展开/折叠图标 */}
        <span
          className="w-3 h-3 flex items-center justify-center flex-shrink-0 cursor-pointer"
          onClick={toggleExpand}
        >
          {hasChildren ? (
            loadingChildren ? (
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
            ) : expanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )
          ) : null}
        </span>

        {/* 表达式名称 */}
        <span className="text-[11px] text-purple-400 font-mono truncate">
          {expression.expression}
        </span>

        {/* 值 */}
        {expression.error ? (
          <span className="text-[11px] text-red-400 font-mono ml-auto truncate max-w-[50%]">
            {expression.error}
          </span>
        ) : expression.result !== undefined ? (
          <>
            <span className="text-muted-foreground mx-0.5">=</span>
            <span className={cn(
              'text-[11px] font-mono truncate flex-1',
              getWatchValueColor(expression.type, expression.result)
            )}>
              {expression.result}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground/50 italic ml-auto">未求值</span>
        )}

        {/* 删除按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-secondary rounded transition-opacity flex-shrink-0"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      {/* 子变量 */}
      {expanded && children.length > 0 && (
        <div className="pl-6">
          {children.map((child) => (
            <div key={child.name} className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono">
              <span className="text-blue-400">{child.name}</span>
              {child.type && <span className="text-muted-foreground text-[10px]">({child.type})</span>}
              <span className="text-muted-foreground">=</span>
              <span className={getWatchValueColor(child.type, child.value)}>{child.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getWatchValueColor(type?: string, value?: string): string {
  if (!value) return 'text-muted-foreground'
  if (type === 'str' || type === 'string' || value.startsWith("'") || value.startsWith('"')) return 'text-green-400'
  if (type === 'int' || type === 'float' || type === 'number' || /^-?\d+(\.\d+)?$/.test(value)) return 'text-yellow-400'
  if (value === 'True' || value === 'False' || value === 'true' || value === 'false') return 'text-orange-400'
  if (value === 'None' || value === 'null' || value === 'undefined') return 'text-red-400'
  return 'text-foreground'
}

export default WatchView
