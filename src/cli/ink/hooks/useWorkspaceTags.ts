/**
 * Workspace Tags Hook
 *
 * React hook for scanning and caching workspace tags.
 * Fetches tags from project.json files asynchronously.
 *
 * @module monorepo-library-generator/cli/ink/hooks/useWorkspaceTags
 */

import { Effect } from "effect"
import { useEffect, useState } from "react"

import { scanWorkspaceTags, type WorkspaceTagsResult } from "../../../utils/workspace-tags"

/**
 * Hook to scan workspace for existing tags
 *
 * @param workspaceRoot - The root directory of the workspace
 * @returns WorkspaceTagsResult with allTags and customTags
 */
export function useWorkspaceTags(workspaceRoot: string) {
  const [result, setResult] = useState<WorkspaceTagsResult>({
    allTags: [],
    customTags: []
  })

  useEffect(() => {
    Effect.runPromise(scanWorkspaceTags(workspaceRoot))
      .then(setResult)
      .catch(() => {
        // Silently fail - return empty tags
      })
  }, [workspaceRoot])

  return result
}
