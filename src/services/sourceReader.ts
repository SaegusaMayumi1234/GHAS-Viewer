import type { AlertLocation } from '../types/ghas'

export interface SourceSnippet {
  resolvedPath: string
  startLine: number
  focusLine: number
  focusColumnStart: number
  focusColumnEnd: number
  endLine: number
  lines: string[]
}

interface IndexedFile {
  key: string
  path: string
  handle: FileSystemFileHandle
}

const normalizePath = (value: string): string => value.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()

const collectFilesRecursive = async (
  dir: FileSystemDirectoryHandle,
  pathPrefix: string,
  sink: IndexedFile[],
): Promise<void> => {
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'file') {
      const relPath = pathPrefix ? `${pathPrefix}/${name}` : name
      sink.push({
        key: normalizePath(relPath),
        path: relPath,
        handle,
      })
      continue
    }

    const childPrefix = pathPrefix ? `${pathPrefix}/${name}` : name
    await collectFilesRecursive(handle, childPrefix, sink)
  }
}

export class LocalSourceReader {
  private rootHandle: FileSystemDirectoryHandle | null = null
  private files: IndexedFile[] = []
  private indexed = false

  public get hasFolder(): boolean {
    return this.rootHandle != null
  }

  public get isIndexed(): boolean {
    return this.indexed
  }

  public async connect(): Promise<void> {
    const picker = (window as Window & {
      showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
    }).showDirectoryPicker

    if (typeof picker !== 'function') {
      throw new Error('This browser does not support folder access. Use a Chromium-based browser for this feature.')
    }

    this.rootHandle = await picker({ mode: 'read' })
    this.files = []
    this.indexed = false
  }

  public async buildIndex(onProgress?: (processed: number) => void): Promise<void> {
    if (!this.rootHandle) {
      throw new Error('No folder connected yet.')
    }

    const buffer: IndexedFile[] = []
    await collectFilesRecursive(this.rootHandle, '', buffer)

    this.files = buffer
    this.indexed = true
    onProgress?.(this.files.length)
  }

  public disconnect(): void {
    this.rootHandle = null
    this.files = []
    this.indexed = false
  }

  private resolveFile(candidatePath: string): IndexedFile | null {
    const normalized = normalizePath(candidatePath)
    const exact = this.files.find((file) => file.key === normalized)
    if (exact) return exact

    const suffix = this.files.find((file) => file.key.endsWith(`/${normalized}`) || file.key.endsWith(normalized))
    return suffix ?? null
  }

  public async readSnippet(location: AlertLocation, contextRadius = 6): Promise<SourceSnippet | null> {
    if (!this.indexed || this.files.length === 0) {
      return null
    }

    if (!location.filePath || location.lineStart == null) {
      return null
    }

    const resolved = this.resolveFile(location.filePath)
    if (!resolved) {
      return null
    }

    const file = await resolved.handle.getFile()
    const text = await file.text()
    const allLines = text.split(/\r?\n/)

    const focusLine = Math.max(location.lineStart, 1)
    const focusColumnStart = Math.max(location.columnStart ?? 1, 1)
    const focusColumnEnd = Math.max(location.columnEnd ?? focusColumnStart, focusColumnStart)
    const startLine = Math.max(focusLine - contextRadius, 1)
    const endLine = Math.min(focusLine + contextRadius, allLines.length)

    return {
      resolvedPath: resolved.path,
      startLine,
      focusLine,
      focusColumnStart,
      focusColumnEnd,
      endLine,
      lines: allLines.slice(startLine - 1, endLine),
    }
  }
}
