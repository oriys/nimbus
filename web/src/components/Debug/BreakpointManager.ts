/**
 * 断点状态管理器
 * 管理前端的断点状态，与调试服务同步
 */

import { v4 as uuidv4 } from 'uuid'
import type { BreakpointState, Breakpoint, SourceBreakpoint } from '../../types/debug'

/** 断点变更监听器 */
type BreakpointChangeListener = (breakpoints: BreakpointState[]) => void

/**
 * 断点管理器类
 * 管理断点的添加、删除、启用/禁用等操作
 */
export class BreakpointManager {
  private breakpoints = new Map<string, BreakpointState>()
  private listeners = new Set<BreakpointChangeListener>()

  /**
   * 添加断点
   */
  addBreakpoint(
    path: string,
    line: number,
    options?: {
      condition?: string
      hitCondition?: string
      logMessage?: string
    }
  ): BreakpointState {
    const id = uuidv4()
    const bp: BreakpointState = {
      id,
      path,
      line,
      enabled: true,
      condition: options?.condition,
      hitCondition: options?.hitCondition,
      logMessage: options?.logMessage,
      verified: false,
    }

    this.breakpoints.set(id, bp)
    this.notifyListeners()
    return bp
  }

  /**
   * 删除断点
   */
  removeBreakpoint(id: string): boolean {
    const result = this.breakpoints.delete(id)
    if (result) {
      this.notifyListeners()
    }
    return result
  }

  /**
   * 切换断点
   * 如果存在则删除，否则添加
   */
  toggleBreakpoint(path: string, line: number): BreakpointState | null {
    // 查找该位置是否已有断点
    const existing = this.findBreakpoint(path, line)
    if (existing) {
      this.removeBreakpoint(existing.id)
      return null
    } else {
      return this.addBreakpoint(path, line)
    }
  }

  /**
   * 启用/禁用断点
   */
  setBreakpointEnabled(id: string, enabled: boolean): boolean {
    const bp = this.breakpoints.get(id)
    if (bp) {
      bp.enabled = enabled
      this.notifyListeners()
      return true
    }
    return false
  }

  /**
   * 更新断点条件
   */
  updateBreakpointCondition(
    id: string,
    condition?: string,
    hitCondition?: string,
    logMessage?: string
  ): boolean {
    const bp = this.breakpoints.get(id)
    if (bp) {
      bp.condition = condition
      bp.hitCondition = hitCondition
      bp.logMessage = logMessage
      this.notifyListeners()
      return true
    }
    return false
  }

  /**
   * 更新断点验证状态（从后端同步）
   */
  updateVerificationStatus(
    path: string,
    verifiedBreakpoints: Breakpoint[]
  ): void {
    // 获取该文件的所有断点
    const fileBps = this.getBreakpointsByPath(path)

    // 根据行号匹配并更新状态
    for (const bp of fileBps) {
      const verified = verifiedBreakpoints.find(
        (vbp) => vbp.line === bp.line || vbp.id === bp.backendId
      )

      if (verified) {
        bp.verified = verified.verified
        bp.backendId = verified.id
        // 如果后端返回了实际行号（可能有调整），更新行号
        if (verified.line && verified.line !== bp.line) {
          bp.line = verified.line
        }
      } else {
        bp.verified = false
        bp.backendId = undefined
      }
    }

    this.notifyListeners()
  }

  /**
   * 查找指定位置的断点
   */
  findBreakpoint(path: string, line: number): BreakpointState | undefined {
    for (const bp of this.breakpoints.values()) {
      if (bp.path === path && bp.line === line) {
        return bp
      }
    }
    return undefined
  }

  /**
   * 获取指定文件的所有断点
   */
  getBreakpointsByPath(path: string): BreakpointState[] {
    const result: BreakpointState[] = []
    for (const bp of this.breakpoints.values()) {
      if (bp.path === path) {
        result.push(bp)
      }
    }
    return result.sort((a, b) => a.line - b.line)
  }

  /**
   * 获取所有断点
   */
  getAllBreakpoints(): BreakpointState[] {
    return Array.from(this.breakpoints.values())
  }

  /**
   * 获取启用的断点
   */
  getEnabledBreakpoints(): BreakpointState[] {
    return this.getAllBreakpoints().filter((bp) => bp.enabled)
  }

  /**
   * 转换为 DAP SourceBreakpoint 格式
   */
  toSourceBreakpoints(path: string): SourceBreakpoint[] {
    return this.getBreakpointsByPath(path)
      .filter((bp) => bp.enabled)
      .map((bp) => ({
        line: bp.line,
        condition: bp.condition,
        hitCondition: bp.hitCondition,
        logMessage: bp.logMessage,
      }))
  }

  /**
   * 获取所有有断点的文件路径
   */
  getFilesWithBreakpoints(): string[] {
    const files = new Set<string>()
    for (const bp of this.breakpoints.values()) {
      files.add(bp.path)
    }
    return Array.from(files)
  }

  /**
   * 清除所有断点
   */
  clearAll(): void {
    this.breakpoints.clear()
    this.notifyListeners()
  }

  /**
   * 清除指定文件的所有断点
   */
  clearFile(path: string): void {
    for (const [id, bp] of this.breakpoints) {
      if (bp.path === path) {
        this.breakpoints.delete(id)
      }
    }
    this.notifyListeners()
  }

  /**
   * 添加监听器
   */
  addListener(listener: BreakpointChangeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const breakpoints = this.getAllBreakpoints()
    this.listeners.forEach((listener) => listener(breakpoints))
  }

  /**
   * 从 JSON 恢复断点
   */
  restore(data: BreakpointState[]): void {
    this.breakpoints.clear()
    for (const bp of data) {
      this.breakpoints.set(bp.id, bp)
    }
    this.notifyListeners()
  }

  /**
   * 导出为 JSON
   */
  export(): BreakpointState[] {
    return this.getAllBreakpoints()
  }
}

// 创建单例实例
export const breakpointManager = new BreakpointManager()
