import { ArrowUpRight, CalendarDays, MapPin, PawPrint } from 'lucide-react'
import type { Memory } from '../types'
import { PetPair } from './PetPair'

interface TimelineViewProps {
  memories: Memory[]
  onSelect: (memory: Memory) => void
}

export function TimelineView({ memories, onSelect }: TimelineViewProps) {
  return (
    <section className="timeline-view">
      <header className="timeline-heading">
        <PetPair compact pose="sleep" />
        <p className="eyebrow"><PawPrint size={12} /> OUR SHARED JOURNEY</p>
        <h1>沿着脚印，慢慢往回走</h1>
        <p>不是为了计算去了多少地方，只是想在某一天回头时，看见我们已经一起生活出了这么多故事。</p>
      </header>

      <div className="timeline-list">
        {memories.map((memory, index) => (
          <article className="timeline-card" key={memory.id} onClick={() => onSelect(memory)}>
            <div className="timeline-card__photo">
              {memory.photos[0]?.url ? <img src={memory.photos[0].url} alt="" /> : <MapPin />}
            </div>
            <div className="timeline-card__copy">
              <span className="timeline-card__number">{String(index + 1).padStart(2, '0')}</span>
              <span className="timeline-card__date"><CalendarDays size={14} /> {memory.dateLabel}</span>
              <h2>{memory.city}</h2>
              <p>{memory.subtitle}</p>
              <button className="timeline-card__open" aria-label={`打开${memory.city}的故事`}><ArrowUpRight size={18} /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
