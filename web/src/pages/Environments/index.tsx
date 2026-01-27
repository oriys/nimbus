import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Trash2, X, Star } from 'lucide-react'
import { environmentService } from '../../services/functions'
import type { Environment, CreateEnvironmentRequest } from '../../types/function'
import { formatDate, cn } from '../../utils'

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<CreateEnvironmentRequest>({
    name: '',
    description: '',
    is_default: false,
  })
  const [creating, setCreating] = useState(false)

  const loadEnvironments = async () => {
    try {
      setLoading(true)
      const result = await environmentService.list()
      setEnvironments(result.environments || [])
    } catch (error) {
      console.error('Failed to load environments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEnvironments()
  }, [])

  const handleCreate = async () => {
    if (!createForm.name) {
      alert('请填写环境名称')
      return
    }
    try {
      setCreating(true)
      await environmentService.create(createForm)
      setShowCreateModal(false)
      setCreateForm({ name: '', description: '', is_default: false })
      await loadEnvironments()
    } catch (error) {
      console.error('Failed to create environment:', error)
      alert('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除环境 "${name}" 吗？此操作不可恢复。`)) return
    try {
      await environmentService.delete(id)
      await loadEnvironments()
    } catch (error) {
      console.error('Failed to delete environment:', error)
      alert('删除失败')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">环境管理</h1>
          <p className="text-muted-foreground mt-1">管理部署环境，实现 dev/staging/prod 隔离</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadEnvironments}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            刷新
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            创建环境
          </button>
        </div>
      </div>

      {/* Environments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : environments.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          暂无环境，点击"创建环境"开始
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {environments.map((env) => (
            <div
              key={env.id}
              className="bg-card rounded-xl border border-border p-6 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{env.name}</h3>
                  {env.is_default && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-yellow-400/10 text-yellow-400">
                      <Star className="w-3 h-3" />
                      默认
                    </span>
                  )}
                </div>
                {!env.is_default && (
                  <button
                    onClick={() => handleDelete(env.id, env.name)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {env.description && (
                <p className="text-sm text-muted-foreground mb-4">{env.description}</p>
              )}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  创建于 {formatDate(env.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">创建环境</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  环境名称 *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="例如: staging"
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  描述
                </label>
                <input
                  type="text"
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="可选描述"
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={createForm.is_default}
                  onChange={(e) => setCreateForm({ ...createForm, is_default: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="is_default" className="text-sm text-muted-foreground">
                  设为默认环境
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-secondary/30 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
