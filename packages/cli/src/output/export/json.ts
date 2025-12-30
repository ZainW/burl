import type { BenchmarkResult } from '../../stats/types'

export function exportJson(result: BenchmarkResult): string {
  return JSON.stringify(result, null, 2)
}
