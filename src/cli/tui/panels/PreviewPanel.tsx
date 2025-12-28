/**
 * Preview Panel Component
 *
 * Panel showing file tree preview that updates on hover.
 *
 * @module monorepo-library-generator/cli/tui/panels/PreviewPanel
 */

import { Box, Text, useInput } from 'ink'
import { useEffect, useMemo, useState } from 'react'

import {
  countFiles,
  type FilePreview,
  getFilePreview,
  getTargetDirectory,
  isWizardAction,
  type LibraryType
} from '../../core'
import { Panel } from '../components'
import type { TUIAction, TUIState } from '../state'
import { colors } from '../theme/colors'

interface PreviewPanelProps {
  readonly state: TUIState
  readonly dispatch: React.Dispatch<TUIAction>
}

/** Tree node for directory structure */
interface TreeNode {
  name: string
  isDirectory: boolean
  isOptional?: boolean
  children: Map<string, TreeNode>
}

/** Flattened tree line for rendering */
interface TreeLine {
  name: string
  prefix: string
  isDirectory: boolean
  isOptional?: boolean
}

/**
 * Build a tree structure from flat file paths
 */
function buildTree(files: readonly FilePreview[]): TreeNode {
  const root: TreeNode = { name: '', isDirectory: true, children: new Map() }

  for (const file of files) {
    const parts = file.path.split('/').filter((p) => p.length > 0)
    if (parts.length === 0) continue

    let current = root
    const isDirectoryPath = file.path.endsWith('/')

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          isDirectory: !isLast || isDirectoryPath,
          isOptional: isLast ? file.isOptional : undefined,
          children: new Map()
        })
      }
      const next = current.children.get(part)
      if (next) current = next
    }
  }

  return root
}

/**
 * Flatten tree into lines with proper prefixes for rendering
 */
function flattenTree(node: TreeNode, prefix = ''): TreeLine[] {
  const lines: TreeLine[] = []

  const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

  sortedChildren.forEach((child, index) => {
    const isLastChild = index === sortedChildren.length - 1
    const connector = isLastChild ? '└─' : '├─'
    const childPrefix = prefix + (isLastChild ? '   ' : '│  ')

    lines.push({
      name: child.isDirectory ? `${child.name}/` : child.name,
      prefix: prefix + connector,
      isDirectory: child.isDirectory,
      isOptional: child.isOptional
    })

    if (child.isDirectory && child.children.size > 0) {
      lines.push(...flattenTree(child, childPrefix))
    }
  })

  return lines
}

/**
 * Preview panel showing files to be generated
 */
export function PreviewPanel({ state, dispatch }: PreviewPanelProps) {
  const isActive = state.activePanel === 'preview'
  const [scrollOffset, setScrollOffset] = useState(0)

  const previewType = state.hoveredType ?? state.selectedType
  const previewName = state.libraryName || '<name>'
  const isNx = state.workspace?.isNx ?? true

  // Get files for preview
  const files = useMemo(() => {
    if (!previewType) return []

    if (previewType === 'init') {
      const allFiles: FilePreview[] = []
      for (const name of ['kysely', 'supabase']) {
        const providerFiles = getFilePreview('provider', name, {}, isNx)
        allFiles.push(...providerFiles.map((f) => ({ ...f, path: `provider/${name}/${f.path}` })))
      }
      const envFiles = getFilePreview('infra', 'env', {}, isNx)
      allFiles.push(...envFiles.map((f) => ({ ...f, path: `env/${f.path}` })))
      for (const name of [
        'cache',
        'database',
        'logging',
        'metrics',
        'queue',
        'pubsub',
        'auth',
        'storage',
        'rpc'
      ]) {
        const infraFiles = getFilePreview('infra', name, {}, isNx)
        allFiles.push(...infraFiles.map((f) => ({ ...f, path: `infra/${name}/${f.path}` })))
      }
      return allFiles
    }

    if (previewType === 'domain') {
      return getFilePreview('domain', previewName, state.options, isNx)
    }

    return getFilePreview(previewType as LibraryType, previewName, state.options, isNx)
  }, [previewType, previewName, state.options, isNx])

  useEffect(() => {
    dispatch({ type: 'SET_FILES_TO_CREATE', payload: files })
  }, [dispatch, files])

  const targetDir = useMemo(() => {
    if (!(previewType && state.workspace)) return ''
    if (isWizardAction(previewType)) {
      return state.workspace.librariesRoot
    }
    return getTargetDirectory(
      state.workspace.librariesRoot,
      previewType as LibraryType,
      previewName
    )
  }, [previewType, previewName, state.workspace])

  const counts = useMemo(() => countFiles(files), [files])

  const treeLines = useMemo(() => {
    if (files.length === 0) return []
    const tree = buildTree(files)
    return flattenTree(tree)
  }, [files])

  useEffect(() => {
    setScrollOffset(0)
  }, [treeLines.length])

  const maxScrollOffset = Math.max(0, treeLines.length - 10)

  useInput(
    (input, key) => {
      if (!isActive) return
      if (input === 'j' || key.downArrow) {
        setScrollOffset((prev) => Math.min(prev + 1, maxScrollOffset))
      }
      if (input === 'k' || key.upArrow) {
        setScrollOffset((prev) => Math.max(prev - 1, 0))
      }
    },
    { isActive }
  )

  if (!previewType) {
    return (
      <Panel id="preview" isActive={isActive}>
        <Text color={colors.muted}>Select a type to preview</Text>
      </Panel>
    )
  }

  const visibleLines = treeLines.slice(scrollOffset, scrollOffset + 15)

  return (
    <Panel id="preview" isActive={isActive}>
      <Box flexDirection="column">
        <Text color={colors.root}>{targetDir}/</Text>

        {scrollOffset > 0 && <Text color={colors.muted}>↑ {scrollOffset} more</Text>}

        {visibleLines.map((line, index) => (
          <Box key={`${line.name}-${index}`}>
            <Text color={colors.muted}>{line.prefix} </Text>
            <Text
              color={
                line.isDirectory ? colors.root : line.isOptional ? colors.muted : colors.secondary
              }
            >
              {line.name}
            </Text>
            {line.isOptional && <Text color={colors.muted}> (opt)</Text>}
          </Box>
        ))}

        {scrollOffset < maxScrollOffset && (
          <Text color={colors.muted}>↓ {treeLines.length - scrollOffset - 15} more</Text>
        )}

        <Text color={colors.muted}>
          Files: {counts.total}
          {counts.optional > 0 && ` (${counts.required} req, ${counts.optional} opt)`}
        </Text>
      </Box>
    </Panel>
  )
}
