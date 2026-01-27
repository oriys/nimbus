import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { AlertTriangle, Play } from 'lucide-react'
import { cn } from '../../../utils/format'

interface FailNodeData {
  label: string
  state: {
    error?: string
    cause?: string
    comment?: string
  }
  isStart?: boolean
}

function FailNode({ data, selected }: NodeProps<FailNodeData>) {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg shadow-md bg-card border-2 min-w-[180px]',
        selected ? 'border-accent ring-2 ring-accent/20' : 'border-red-500',
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-red-500" />

      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-red-500/10">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
          </div>
          <p className="text-xs text-muted-foreground">失败终止</p>
        </div>
      </div>

      {data.state.error && (
        <div className="mt-2 px-2 py-1 bg-red-500/10 rounded text-xs text-red-600 truncate">
          {data.state.error}
        </div>
      )}

      {data.state.cause && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {data.state.cause}
        </p>
      )}

      {/* Fail nodes don't have output handles - they terminate the workflow */}
    </div>
  )
}

export default memo(FailNode)
