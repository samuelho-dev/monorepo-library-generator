/**
 * Terminal Dimensions Hook
 *
 * Tracks terminal size and triggers re-renders on resize.
 *
 * @module monorepo-library-generator/cli/tui/hooks/useTerminalDimensions
 */

import { useStdout } from 'ink'
import { useEffect, useState } from 'react'

/**
 * Terminal dimension information
 */
export interface TerminalDimensions {
  readonly columns: number
  readonly rows: number
}

/**
 * Hook for tracking terminal dimensions
 */
export function useTerminalDimensions(): TerminalDimensions {
  const { stdout } = useStdout()

  const [dimensions, setDimensions] = useState(() => ({
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24
  }))

  useEffect(() => {
    if (!stdout) return

    const handleResize = () => {
      setDimensions({
        columns: stdout.columns ?? 80,
        rows: stdout.rows ?? 24
      })
    }

    stdout.on('resize', handleResize)
    return () => {
      stdout.off('resize', handleResize)
    }
  }, [stdout])

  return dimensions
}
