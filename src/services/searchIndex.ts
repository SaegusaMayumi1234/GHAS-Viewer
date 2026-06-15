import Fuse from 'fuse.js'
import type { NormalizedGhasAlert, SearchHit } from '../types/ghas'

interface SearchDoc {
  rowKey: string
  indexedText: string
}

export class AlertSearchIndex {
  private fuse: Fuse<SearchDoc> | null = null

  public build(alerts: NormalizedGhasAlert[]): void {
    const docs: SearchDoc[] = alerts.map((alert) => ({
      rowKey: alert.rowKey,
      indexedText: alert.indexedText,
    }))

    this.fuse = new Fuse(docs, {
      includeScore: true,
      shouldSort: true,
      ignoreLocation: true,
      threshold: 0.28,
      keys: ['indexedText'],
      minMatchCharLength: 2,
    })
  }

  public query(input: string): SearchHit[] {
    const query = input.trim()
    if (!query || !this.fuse) {
      return []
    }

    return this.fuse.search(query).map((hit) => ({
      rowKey: hit.item.rowKey,
      score: hit.score,
    }))
  }
}
