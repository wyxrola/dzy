import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart, ImageOff, X } from 'lucide-react'
import { useMap } from 'react-leaflet'
import { PetPair } from './PetPair'
import type { Memory } from '../types'

interface MemoryMapPopupProps {
  memory: Memory
  onClose: () => void
}

export function MemoryMapPopup({ memory, onClose }: MemoryMapPopupProps) {
  const map = useMap()
  const [activePhoto, setActivePhoto] = useState(0)
  const photo = memory.photos[activePhoto]

  useEffect(() => setActivePhoto(0), [memory.id])

  const closePopup = useCallback(() => {
    map.closePopup()
    onClose()
  }, [map, onClose])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePopup()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closePopup])

  function previousPhoto() {
    setActivePhoto((current) => (current - 1 + memory.photos.length) % memory.photos.length)
  }

  function nextPhoto() {
    setActivePhoto((current) => (current + 1) % memory.photos.length)
  }

  return (
    <article className="memory-map-popup" aria-label={`${memory.city}的照片记忆`}>
      <header className="memory-map-popup__header">
        <div>
          <h2>{memory.city.replace(/^中国/, '')}</h2>
          <p>{memory.dateLabel}</p>
        </div>
        <button type="button" className="memory-map-popup__close" onClick={closePopup} aria-label="关闭照片卡片">
          <X size={22} />
        </button>
      </header>

      <div className="memory-map-popup__photo">
        {photo ? (
          <img src={photo.url} alt={`${memory.city}的第 ${activePhoto + 1} 张照片`} />
        ) : (
          <div className="memory-map-popup__empty"><ImageOff size={25} /><span>这个坐标还没有照片</span></div>
        )}

        {memory.photos.length > 1 && (
          <>
            <button type="button" className="memory-map-popup__arrow memory-map-popup__arrow--left" onClick={previousPhoto} aria-label="上一张照片">
              <ChevronLeft size={19} />
            </button>
            <button type="button" className="memory-map-popup__arrow memory-map-popup__arrow--right" onClick={nextPhoto} aria-label="下一张照片">
              <ChevronRight size={19} />
            </button>
            <div className="memory-map-popup__dots" aria-label={`共 ${memory.photos.length} 张照片`}>
              {memory.photos.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={index === activePhoto ? 'is-active' : ''}
                  onClick={() => setActivePhoto(index)}
                  aria-label={`查看第 ${index + 1} 张照片`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="memory-map-popup__copy">
        <p>{memory.subtitle}</p>
        <span><Heart size={17} fill="currentColor" /> 我们记得这一天</span>
      </div>
      <PetPair compact pose="together" className="memory-map-popup__pets" />
    </article>
  )
}
