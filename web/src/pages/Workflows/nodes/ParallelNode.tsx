import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Boxes, Play } from 'lucide-react'
import { cn } from '../../../utils/format'

interface ParallelNodeData {
  label: string
  state: {
    branches?: Array<{ start_at: string }>
    comment?: string
  }
  isStart?: boolean
}

function ParallelNode({ data, selected }: NodeProps<ParallelNodeData>) {
  const branchesCount = data.state.branches?.length || 0

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg shadow-md bg-card border-2 min-w-[180px]',
        selected ? 'border-accent ring-2 ring-accent/20' : 'border-green-500',
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500" />

      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-green-500/10">
          <Boxes className="w-4 h-4 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
          </div>
          <p className="text-xs text-muted-foreground">并行</p>
        </div>
      </div>

      <div className="mt-2 px-2 py-1 bg-muted/50 rounded text-xs">
        {branchesCount} 个分支
      </div>

      {data.state.comment && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {data.state.comment}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  )
}

export default memo(ParallelNode)
