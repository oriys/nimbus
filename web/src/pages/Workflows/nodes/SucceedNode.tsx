import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { CheckCircle, Play } from 'lucide-react'
import { cn } from '../../../utils/format'

interface SucceedNodeData {
  label: string
  state: {
    comment?: string
  }
  isStart?: boolean
}

function SucceedNode({ data, selected }: NodeProps<SucceedNodeData>) {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg shadow-md bg-card border-2 min-w-[180px]',
        selected ? 'border-accent ring-2 ring-accent/20' : 'border-emerald-500',
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-emerald-500" />

      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-emerald-500/10">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
          </div>
          <p className="text-xs text-muted-foreground">成功结束</p>
        </div>
      </div>

      {data.state.comment && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {data.state.comment}
        </p>
      )}

      {/* Succeed nodes don't have output handles - they terminate the workflow */}
    </div>
  )
}

export default memo(SucceedNode)
