import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { layerService } from '../../services/functions'
import type { Layer, CreateLayerRequest } from '../../types/function'
import { formatDate, cn } from '../../utils'

export default function LayersPage() {
  const [layers, setLayers] = useState<Layer[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CreateLayerRequest>({
    name: '',
    description: '',
    compatible_runtimes: [],
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)

  const loadLayers = async () => {
    try {
      setLoading(true)
      const result = await layerService.list()
      setLayers(result.layers || [])
    } catch (error) {
      console.error('Failed to load layers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLayers()
  }, [])

  const handleCreate = async () => {
    if (!createForm.name || createForm.compatible_runtimes.length === 0) {
      alert('请填写层名称并选择至少一个兼容运行时')
      return
    }
    try {
      setCreating(true)
      await layerService.create(createForm)
      setShowCreateModal(false)
      setCreateForm({ name: '', description: '', compatible_runtimes: [] })
      await loadLayers()
    } catch (error) {
      console.error('Failed to create layer:', error)
      alert('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除层 "${name}" 吗？此操作不可恢复。`)) return
    try {
      await layerService.delete(id)
      await loadLayers()
    } catch (error) {
      console.error('Failed to delete layer:', error)
      alert('删除失败')
    }
  }

  const handleUpload = async () => {
    if (!selectedLayerId || !uploadFile) return
    try {
      setUploading(true)
      await layerService.uploadVersion(selectedLayerId, uploadFile)
      setShowUploadModal(false)
      setUploadFile(null)
      setSelectedLayerId(null)
      await loadLayers()
    } catch (error) {
      console.error('Failed to upload layer version:', error)
      alert('上传失败')
    } finally {
      setUploading(false)
    }
  }

  const toggleRuntime = (runtime: string) => {
    setCreateForm(prev => ({
      ...prev,
      compatible_runtimes: prev.compatible_runtimes.includes(runtime)
        ? prev.compatible_runtimes.filter(r => r !== runtime)
        : [...prev.compatible_runtimes, runtime]
    }))
  }

  const runtimes = ['python3.11', 'nodejs20', 'go1.24', 'wasm', 'rust1.75']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">层管理</h1>
          <p className="text-muted-foreground mt-1">管理共享依赖层，可被多个函数复用</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadLayers}
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
            创建层
          </button>
        </div>
      </div>

      {/* Layers List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : layers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            暂无层，点击"创建层"开始
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  兼容运行时
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  最新版本
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  更新时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {layers.map((layer) => (
                <tr key={layer.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-foreground">{layer.name}</div>
                      {layer.description && (
                        <div className="text-sm text-muted-foreground">{layer.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {layer.compatible_runtimes.map((runtime) => (
                        <span
                          key={runtime}
                          className="px-2 py-0.5 text-xs rounded bg-secondary text-muted-foreground"
                        >
                          {runtime}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-foreground">v{layer.latest_version}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(layer.updated_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedLayerId(layer.id)
                          setShowUploadModal(true)
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                        title="上传新版本"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(layer.id, layer.name)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">创建层</h3>
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
                  层名称 *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="例如: common-utils"
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
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  兼容运行时 *
                </label>
                <div className="flex flex-wrap gap-2">
                  {runtimes.map((runtime) => (
                    <button
                      key={runtime}
                      onClick={() => toggleRuntime(runtime)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                        createForm.compatible_runtimes.includes(runtime)
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-secondary text-muted-foreground border-border hover:border-accent/50'
                      )}
                    >
                      {runtime}
                    </button>
                  ))}
                </div>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">上传层版本</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                  setSelectedLayerId(null)
                }}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  层内容文件 (zip/tar.gz)
                </label>
                <input
                  type="file"
                  accept=".zip,.tar.gz,.tgz"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  上传包含依赖的压缩文件，最大 100MB
                </p>
              </div>
              {uploadFile && (
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm text-foreground">已选择: {uploadFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    大小: {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-secondary/30 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                  setSelectedLayerId(null)
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
                className="px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {uploading ? '上传中...' : '上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
