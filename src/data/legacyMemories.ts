import type { Memory } from '../types'

// Production memories live in the private database. Keep local preview empty so
// personal stories are never bundled into a public JavaScript asset.
export const legacyMemories: Memory[] = []
