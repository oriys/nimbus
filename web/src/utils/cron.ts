// Cron expression validation and description utilities

// Validate a cron expression (6-part with seconds)
export function validateCron(expression: string): { valid: boolean; error?: string } {
  if (!expression || expression.trim() === '') {
    return { valid: true } // Empty is valid (disabled)
  }

  const parts = expression.trim().split(/\s+/)

  if (parts.length !== 6) {
    return {
      valid: false,
      error: `需要 6 个字段 (秒 分 时 日 月 周)，当前有 ${parts.length} 个`
    }
  }

  const [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // Validate each field
  const errors: string[] = []

  if (!isValidCronField(second, 0, 59)) {
    errors.push('秒字段无效 (0-59)')
  }
  if (!isValidCronField(minute, 0, 59)) {
    errors.push('分字段无效 (0-59)')
  }
  if (!isValidCronField(hour, 0, 23)) {
    errors.push('时字段无效 (0-23)')
  }
  if (!isValidCronField(dayOfMonth, 1, 31)) {
    errors.push('日字段无效 (1-31)')
  }
  if (!isValidCronField(month, 1, 12)) {
    errors.push('月字段无效 (1-12)')
  }
  if (!isValidCronField(dayOfWeek, 0, 6)) {
    errors.push('周字段无效 (0-6, 0=周日)')
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') }
  }

  return { valid: true }
}

// Validate a single cron field
function isValidCronField(field: string, min: number, max: number): boolean {
  if (field === '*') return true

  // Handle */n (step)
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2))
    return !isNaN(step) && step > 0 && step <= max
  }

  // Handle n-m (range)
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number)
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end
  }

  // Handle comma-separated values
  if (field.includes(',')) {
    return field.split(',').every(v => {
      const num = parseInt(v)
      return !isNaN(num) && num >= min && num <= max
    })
  }

  // Handle single number
  const num = parseInt(field)
  return !isNaN(num) && num >= min && num <= max
}

// Generate a human-readable description of the cron expression
export function describeCron(expression: string): string {
  if (!expression || expression.trim() === '') {
    return '未启用定时触发'
  }

  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 6) {
    return '表达式格式无效'
  }

  const [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // Common patterns
  if (second.startsWith('*/')) {
    const step = parseInt(second.slice(2))
    if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `每 ${step} 秒执行一次`
    }
  }

  if (minute.startsWith('*/')) {
    const step = parseInt(minute.slice(2))
    if (second === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `每 ${step} 分钟执行一次`
    }
  }

  if (hour.startsWith('*/')) {
    const step = parseInt(hour.slice(2))
    if (second === '0' && minute === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `每 ${step} 小时执行一次`
    }
  }

  // Every minute
  if (second === '0' && minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return '每分钟执行一次'
  }

  // Every hour
  if (second === '0' && minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return '每小时执行一次'
  }

  // Daily at specific time
  if (second === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const h = parseInt(hour)
    const m = parseInt(minute)
    if (!isNaN(h) && !isNaN(m)) {
      return `每天 ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} 执行`
    }
  }

  // Weekly
  if (second === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const h = parseInt(hour)
    const m = parseInt(minute)
    const d = parseInt(dayOfWeek)
    if (!isNaN(h) && !isNaN(m) && !isNaN(d)) {
      return `每${days[d]} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} 执行`
    }
  }

  // Build generic description
  const descriptions: string[] = []

  if (second !== '*' && second !== '0') {
    descriptions.push(`秒: ${second}`)
  }
  if (minute !== '*') {
    descriptions.push(`分: ${minute}`)
  }
  if (hour !== '*') {
    descriptions.push(`时: ${hour}`)
  }
  if (dayOfMonth !== '*') {
    descriptions.push(`日: ${dayOfMonth}`)
  }
  if (month !== '*') {
    descriptions.push(`月: ${month}`)
  }
  if (dayOfWeek !== '*') {
    descriptions.push(`周: ${dayOfWeek}`)
  }

  return descriptions.length > 0 ? `自定义: ${descriptions.join(', ')}` : '每秒执行'
}

// Calculate next execution times
export function getNextExecutions(expression: string, count: number = 3): Date[] {
  // This is a simplified implementation that doesn't handle all cron expressions
  // For production, consider using a proper cron library
  const dates: Date[] = []
  const now = new Date()

  if (!expression || expression.trim() === '') {
    return dates
  }

  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 6) {
    return dates
  }

  const [second, minute, hour] = parts

  // Simple implementation for common patterns
  let interval = 0

  if (second.startsWith('*/')) {
    interval = parseInt(second.slice(2)) * 1000
  } else if (minute.startsWith('*/') && second === '0') {
    interval = parseInt(minute.slice(2)) * 60 * 1000
  } else if (hour.startsWith('*/') && second === '0' && minute === '0') {
    interval = parseInt(hour.slice(2)) * 60 * 60 * 1000
  } else if (second === '0' && minute === '*') {
    interval = 60 * 1000
  } else if (second === '0' && minute === '0' && hour === '*') {
    interval = 60 * 60 * 1000
  }

  if (interval > 0) {
    for (let i = 0; i < count; i++) {
      dates.push(new Date(now.getTime() + interval * (i + 1)))
    }
  }

  return dates
}
