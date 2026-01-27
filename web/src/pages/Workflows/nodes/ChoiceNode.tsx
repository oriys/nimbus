import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch, Play } from 'lucide-react'
import { cn } from '../../../utils/format'

interface ChoiceNodeData {
  label: string
  state: {
    choices?: Array<{ variable?: string; next?: string }>
    default?: string
    comment?: string
  }
  isStart?: boolean
}

function ChoiceNode({ data, selected }: NodeProps<ChoiceNodeData>) {
  const choicesCount = data.state.choices?.length || 0

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg shadow-md bg-card border-2 min-w-[180px]',
        selected ? 'border-accent ring-2 ring-accent/20' : 'border-yellow-500',
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-500" />

      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-yellow-500/10">
          <GitBranch className="w-4 h-4 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
          </div>
          <p className="text-xs text-muted-foreground">条件分支</p>
        </div>
      </div>

      <div className="mt-2 px-2 py-1 bg-muted/50 rounded text-xs">
        {choicesCount} 个条件{data.state.default ? ' + 默认' : ''}
      </div>

      {data.state.comment && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {data.state.comment}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-yellow-500" />
    </div>
  )
}

export default memo(ChoiceNode)
