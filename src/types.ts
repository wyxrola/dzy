export interface MemoryPhoto {
  id: string
  storagePath: string
  url: string
  sortOrder: number
  caption?: string | null
}

export interface Memory {
  id: string
  title: string
  city: string
  subtitle: string
  story: string
  latitude: number
  longitude: number
  dateLabel: string
  startDate?: string | null
  endDate?: string | null
  sortDate: string
  photos: MemoryPhoto[]
  createdAt: string
  isPreview?: boolean
}

export interface CoupleSpace {
  id: string
  name: string
  displayName: string
  anniversary?: string | null
}

export interface NewMemoryInput {
  city: string
  subtitle: string
  story: string
  latitude: number
  longitude: number
  startDate: string
  endDate?: string
  photos: File[]
}

