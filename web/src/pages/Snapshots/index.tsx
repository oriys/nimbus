import { useState, useEffect } from 'react'
import { RefreshCw, Trash2, Search, Camera, Clock, HardDrive, Zap, X, Plus } from 'lucide-react'
import { snapshotService, type SnapshotInfo, type SnapshotStats } from '../../services/sessions'
import { formatDate, cn, formatBytes } from '../../utils'

export default function SnapshotsPage() {
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [stats, setStats] = useState<SnapshotStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [functionId, setFunctionId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showBuildModal, setShowBuildModal] = useState(false)
  const [buildVersion, setBuildVersion] = useState(1)
  const [building, setBuilding] = useState(false)

  const loadSnapshots = async () => {
    if (!functionId) return
    try {
      setLoading(true)
      const result = await snapshotService.list(functionId)
      setSnapshots(result || [])
    } catch (error) {
      console.error('Failed to load snapshots:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await snapshotService.getStats()
      setStats(result)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleSearch = () => {
    setFunctionId(searchInput)
  }

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (functionId) {
      loadSnapshots()
    }
  }, [functionId])

  const handleDelete = async (snapshotId: string) => {
    if (!confirm('确定要删除这个快照吗？')) return
    try {
      await snapshotService.delete(functionId, snapshotId)
      await loadSnapshots()
      await loadStats()
    } catch (error) {
      console.error('Failed to delete snapshot:', error)
      alert('删除失败')
    }
  }

  const handleBuild = async () => {
    if (!functionId || buildVersion < 1) return
    try {
      setBuilding(true)
      await snapshotService.build(functionId, buildVersion)
      setShowBuildModal(false)
      await loadSnapshots()
      await loadStats()
    } catch (error) {
      console.error('Failed to build snapshot:', error)
      alert('构建失败')
    } finally {
      setBuilding(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
      ready: 'bg-green-500/20 text-green-400',
      building: 'bg-yellow-500/20 text-yellow-400',
      failed: 'bg-red-500/20 text-red-400',
      expired: 'bg-gray-500/20 text-gray-400',
    }
    const labels: { [key: string]: string } = {
      ready: '就绪',
      building: '构建中',
      failed: '失败',
      expired: '已过期',
    }
    return (
      <span className={cn('px-2 py-0.5 text-xs rounded', styles[status] || styles.expired)}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">快照管理</h1>
          <p className="text-muted-foreground mt-1">管理函数执行快照，实现毫秒级冷启动</p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新统计
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Camera className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">就绪快照</p>
                <p className="text-2xl font-bold text-foreground">{stats.ready_snapshots}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">构建中</p>
                <p className="text-2xl font-bold text-foreground">{stats.building_snapshots}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <HardDrive className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总存储</p>
                <p className="text-2xl font-bold text-foreground">{formatBytes(stats.total_size_bytes)}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">平均恢复时间</p>
                <p className="text-2xl font-bold text-foreground">{stats.avg_restore_ms.toFixed(1)} ms</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入函数 ID 查询快照..."
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchInput || loading}
            className="flex items-center px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Search className="w-4 h-4 mr-2" />
            查询
          </button>
          {functionId && (
            <>
              <button
                onClick={loadSnapshots}
                disabled={loading}
                className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
                刷新
              </button>
              <button
                onClick={() => setShowBuildModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                构建快照
              </button>
            </>
          )}
        </div>
        {functionId && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Camera className="w-4 h-4" />
            当前函数: <span className="text-foreground font-mono">{functionId}</span>
            <button
              onClick={() => {
                setFunctionId('')
                setSnapshots([])
                setSearchInput('')
              }}
              className="ml-2 p-1 hover:bg-secondary rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Snapshots List */}
      {functionId && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              该函数暂无快照，点击"构建快照"创建
            </div>
          ) : (
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    版本
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    运行时
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    大小
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    恢复统计
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">v{snapshot.version}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {snapshot.code_hash.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(snapshot.status)}
                      {snapshot.error_message && (
                        <div className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={snapshot.error_message}>
                          {snapshot.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-foreground">{snapshot.runtime}</span>
                      <div className="text-xs text-muted-foreground">{snapshot.memory_mb} MB</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {formatBytes(snapshot.mem_file_size + snapshot.state_file_size)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        内存: {formatBytes(snapshot.mem_file_size)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{snapshot.restore_count} 次</div>
                      <div className="text-xs text-muted-foreground">
                        平均: {snapshot.avg_restore_ms.toFixed(1)} ms
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{formatDate(snapshot.created_at)}</div>
                      {snapshot.last_used_at && (
                        <div className="text-xs text-muted-foreground">
                          最后使用: {formatDate(snapshot.last_used_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleDelete(snapshot.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Help */}
      {!functionId && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">关于快照</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>函数快照是预初始化的虚拟机状态，可以显著减少冷启动时间：</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>快照包含已加载代码和初始化完成的运行时环境</li>
              <li>从快照恢复比全新启动快 10-100 倍</li>
              <li>快照会在函数代码或配置更新后自动失效</li>
              <li>系统会自动清理过期快照释放存储空间</li>
            </ul>
          </div>
        </div>
      )}

      {/* Build Modal */}
      {showBuildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">构建快照</h3>
              <button
                onClick={() => setShowBuildModal(false)}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  函数 ID
                </label>
                <input
                  type="text"
                  value={functionId}
                  disabled
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  版本号
                </label>
                <input
                  type="number"
                  min={1}
                  value={buildVersion}
                  onChange={(e) => setBuildVersion(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  选择要构建快照的函数版本
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-secondary/30 flex justify-end gap-3">
              <button
                onClick={() => setShowBuildModal(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBuild}
                disabled={building}
                className="px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {building ? '构建中...' : '开始构建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
