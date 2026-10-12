import { useEffect, useMemo, useRef } from 'react'
import { Marker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { divIcon, type LatLngBoundsExpression, type Marker as LeafletMarker } from 'leaflet'
import { MemoryMapPopup } from './MemoryMapPopup'
import type { Memory } from '../types'

interface MemoryMapProps {
  memories: Memory[]
  selectedId?: string | null
  onSelect: (memory: Memory) => void
  onClose: (memory: Memory) => void
}

const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors'

function MapMotion({ memories, selectedId }: Pick<MemoryMapProps, 'memories' | 'selectedId'>) {
  const map = useMap()

  useEffect(() => {
    if (memories.length === 0) return
    const bounds = memories.map((memory) => [memory.latitude, memory.longitude]) as LatLngBoundsExpression
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 6, animate: false })
  }, [map, memories])

  useEffect(() => {
    const selected = memories.find((memory) => memory.id === selectedId)
    if (selected) map.panTo([selected.latitude, selected.longitude], { animate: true, duration: 0.55 })
  }, [map, memories, selectedId])

  return null
}

function MapResize() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    let frame = 0
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false, debounceMoveend: true }))
    })

    observer.observe(container)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [map])

  return null
}

interface MemoryMarkerProps {
  memory: Memory
  index: number
  selected: boolean
  onSelect: (memory: Memory) => void
  onClose: (memory: Memory) => void
}

const pawSvg = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="7" cy="7.2" r="2.15" />
    <circle cx="12" cy="5.4" r="2.15" />
    <circle cx="17" cy="7.2" r="2.15" />
    <path d="M6.2 14.6c0-3.15 2.55-5.7 5.8-5.7s5.8 2.55 5.8 5.7c0 2.5-2.05 4.05-4.2 3.25a4.6 4.6 0 0 0-3.2 0c-2.15.8-4.2-.75-4.2-3.25Z" />
  </svg>
`

function MemoryMarker({ memory, index, selected, onSelect, onClose }: MemoryMarkerProps) {
  const markerRef = useRef<LeafletMarker | null>(null)
  const icon = useMemo(() => divIcon({
    className: 'paw-marker-shell',
    html: `<span class="paw-marker ${selected ? 'is-selected' : ''}">${pawSvg}</span>`,
    iconSize: [42, 48],
    iconAnchor: [21, 44],
    popupAnchor: [0, -39],
  }), [selected])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return
    if (selected) marker.openPopup()
    else if (marker.isPopupOpen()) marker.closePopup()
  }, [selected])

  return (
    <Marker
      ref={markerRef}
      position={[memory.latitude, memory.longitude]}
      icon={icon}
      eventHandlers={{
        popupopen: () => onSelect(memory),
        popupclose: () => onClose(memory),
      }}
    >
      <Tooltip direction="top" offset={[0, -37]} opacity={1}>
        <span className="map-tooltip__index">{String(index + 1).padStart(2, '0')}</span>
        <strong>{memory.city}</strong>
        <span>{memory.subtitle}</span>
      </Tooltip>
      <Popup closeButton={false} minWidth={300} maxWidth={390} autoPanPadding={[28, 28]}>
        <MemoryMapPopup memory={memory} onClose={() => onClose(memory)} />
      </Popup>
    </Marker>
  )
}

export function MemoryMap({ memories, selectedId, onSelect, onClose }: MemoryMapProps) {
  return (
    <div className="memory-map" aria-label="共同记忆地图">
      <MapContainer center={[30.5, 119]} zoom={5} minZoom={3} maxZoom={14} zoomControl={false}>
        <TileLayer url={tileUrl} attribution={attribution} />
        <MapMotion memories={memories} selectedId={selectedId} />
        <MapResize />
        {memories.length > 1 && (
          <Polyline
            positions={memories.map((memory) => [memory.latitude, memory.longitude])}
            pathOptions={{ color: '#b77967', weight: 2, opacity: 0.55, dashArray: '2 9' }}
          />
        )}
        {memories.map((memory, index) => (
          <MemoryMarker
            key={memory.id}
            memory={memory}
            index={index}
            selected={selectedId === memory.id}
            onSelect={onSelect}
            onClose={onClose}
          />
        ))}
      </MapContainer>
      <div className="map-vignette" aria-hidden="true" />
      <div className="map-caption">
        <span className="map-caption__dot" /> {memories.length} 串共同脚印，故事还在继续
      </div>
    </div>
  )
}
