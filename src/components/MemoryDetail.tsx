import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, MapPin, PawPrint, X } from 'lucide-react'
import type { Memory } from '../types'

interface MemoryDetailProps {
  memory: Memory
  index: number
  total: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

export function MemoryDetail({ memory, index, total, onClose, onPrevious, onNext }: MemoryDetailProps) {
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => setActivePhoto(0), [memory.id])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function previousPhoto() {
    setActivePhoto((current) => (current - 1 + memory.photos.length) % memory.photos.length)
  }

  function nextPhoto() {
    setActivePhoto((current) => (current + 1) % memory.photos.length)
  }

  return (
    <aside className="memory-detail" aria-label={`${memory.city}的记忆`}>
      <header className="memory-detail__header">
        <button className="memory-detail__back" onClick={onClose}>
          <ArrowLeft size={17} /> 返回地图
        </button>
        <span>地点故事</span>
        <button className="icon-button" onClick={onClose} aria-label="关闭详情">
          <X size={18} />
        </button>
      </header>

      <div className="memory-detail__scroll">
        <div className="memory-gallery">
          {memory.photos.length > 0 ? (
            <>
              <img src={memory.photos[activePhoto]?.url} alt={`${memory.city}的第 ${activePhoto + 1} 张照片`} />
              <div className="memory-gallery__shade" />
              {memory.photos.length > 1 && (
                <>
                  <button className="gallery-arrow gallery-arrow--left" onClick={previousPhoto} aria-label="上一张照片"><ChevronLeft /></button>
                  <button className="gallery-arrow gallery-arrow--right" onClick={nextPhoto} aria-label="下一张照片"><ChevronRight /></button>
                  <div className="gallery-dots" aria-label={`共 ${memory.photos.length} 张照片`}>
                    {memory.photos.map((photo, photoIndex) => (
                      <button
                        key={photo.id}
                        className={photoIndex === activePhoto ? 'is-active' : ''}
                        onClick={() => setActivePhoto(photoIndex)}
                        aria-label={`查看第 ${photoIndex + 1} 张照片`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="memory-gallery__empty"><MapPin size={28} /><span>这段记忆没有照片，但坐标还在。</span></div>
          )}
          <div className="memory-gallery__number">{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</div>
        </div>

        <article className="memory-story">
          <p className="eyebrow">A PLACE WE SHARE</p>
          <h2>{memory.city}</h2>
          <p className="memory-story__subtitle">{memory.subtitle}</p>
          <div className="memory-story__meta">
            <span><CalendarDays size={15} />{memory.dateLabel}</span>
            <span><MapPin size={15} />{memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}</span>
          </div>
          <div className="memory-story__body">
            {memory.story.split(/\n\n+/).map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{paragraph}</p>
            ))}
          </div>
          <div className="memory-story__end"><span /><PawPrint size={13} /> 我们还会再来 <span /></div>
        </article>
      </div>

      <div className="memory-detail__footer">
        <button className="quiet-button" onClick={onPrevious} disabled={total <= 1}><ChevronLeft size={17} /> 上一个坐标</button>
        <button className="quiet-button" onClick={onNext} disabled={total <= 1}>下一个坐标 <ChevronRight size={17} /></button>
      </div>
    </aside>
  )
}
