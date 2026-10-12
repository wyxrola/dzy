import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { Camera, Crosshair, ImagePlus, MapPin, MousePointer2, X } from 'lucide-react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { NewMemoryInput } from '../types'
import { PetPair } from './PetPair'

interface MemoryFormProps {
  onClose: () => void
  onSave: (input: NewMemoryInput) => Promise<void>
}

const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors'

function LocationMarker({ latitude, longitude, onChange }: {
  latitude: number
  longitude: number
  onChange: (latitude: number, longitude: number) => void
}) {
  const map = useMap()
  useMapEvents({ click: (event) => onChange(event.latlng.lat, event.latlng.lng) })

  useEffect(() => {
    map.panTo([latitude, longitude], { animate: true })
  }, [map, latitude, longitude])

  return (
    <CircleMarker
      center={[latitude, longitude]}
      radius={9}
      pathOptions={{ color: '#fffaf1', weight: 4, fillColor: '#b85142', fillOpacity: 1 }}
    />
  )
}

export function MemoryForm({ onClose, onSave }: MemoryFormProps) {
  const [city, setCity] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [story, setStory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [latitude, setLatitude] = useState(31.2304)
  const [longitude, setLongitude] = useState(121.4737)
  const [photos, setPhotos] = useState<File[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)

  const previews = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    const imageFiles = selected.filter((file) => file.type.startsWith('image/'))
    setPhotos((current) => [...current, ...imageFiles].slice(0, 12))
    event.target.value = ''
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('当前浏览器不支持定位，请直接点击地图或输入经纬度。')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setLocating(false)
      },
      () => {
        setError('没有获取到当前位置，可以直接点击地图选点。')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!city.trim() || !subtitle.trim() || !story.trim() || !startDate) {
      setError('把地点、标题、日期和这段故事补充完整吧。')
      return
    }
    if (endDate && endDate < startDate) {
      setError('结束日期不能早于开始日期。')
      return
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('请填写有效的经纬度。')
      return
    }

    setSaving(true)
    try {
      await onSave({
        city: city.trim(),
        subtitle: subtitle.trim(),
        story: story.trim(),
        startDate,
        endDate: endDate || undefined,
        latitude,
        longitude,
        photos,
      })
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存时遇到了一点问题，请稍后再试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="memory-form" role="dialog" aria-modal="true" aria-labelledby="new-memory-title">
        <header className="memory-form__header">
          <div>
            <p className="eyebrow">A NEW PLACE FOR US</p>
            <h2 id="new-memory-title">记下一个共同坐标</h2>
            <p>不用写得完美，只要留下此刻真正想记住的东西。</p>
          </div>
          <PetPair compact pose="peek" />
          <button className="icon-button" onClick={onClose} aria-label="关闭"><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="memory-form__body">
          <div className="form-section">
            <div className="form-section__title"><span>01</span><h3>这是哪里</h3></div>
            <div className="form-grid form-grid--two">
              <label className="field">
                <span>地点名称</span>
                <span className="field__control"><MapPin size={17} /><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="例如：中国上海" /></span>
              </label>
              <label className="field">
                <span>一句话标题</span>
                <span className="field__control"><input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="这段记忆最像什么？" /></span>
              </label>
            </div>
            <div className="location-picker">
              <MapContainer center={[latitude, longitude]} zoom={5} zoomControl={false} attributionControl={false}>
                <TileLayer url={tileUrl} attribution={attribution} />
                <LocationMarker latitude={latitude} longitude={longitude} onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }} />
              </MapContainer>
              <div className="location-picker__hint"><MousePointer2 size={14} /> 点击地图，把坐标放在故事发生的地方</div>
            </div>
            <div className="coordinate-row">
              <label><span>纬度</span><input type="number" step="0.000001" value={latitude} onChange={(event) => setLatitude(event.target.valueAsNumber)} /></label>
              <label><span>经度</span><input type="number" step="0.000001" value={longitude} onChange={(event) => setLongitude(event.target.valueAsNumber)} /></label>
              <button type="button" className="quiet-button" onClick={useCurrentLocation} disabled={locating}><Crosshair size={16} />{locating ? '定位中…' : '用当前位置'}</button>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__title"><span>02</span><h3>什么时候发生</h3></div>
            <div className="form-grid form-grid--two">
              <label className="field"><span>开始日期</span><span className="field__control"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></span></label>
              <label className="field"><span>结束日期 <em>可不填</em></span><span className="field__control"><input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></span></label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__title"><span>03</span><h3>把故事带回来</h3></div>
            <label className="field">
              <span>想一起记住的话</span>
              <textarea value={story} onChange={(event) => setStory(event.target.value)} rows={7} placeholder={'可以写发生了什么，也可以只写一个当时的瞬间。\n\n分段写，会更像一封留给未来的信。'} />
            </label>

            <div className="photo-uploader">
              <div className="photo-uploader__head"><span><Camera size={16} /> 照片</span><small>最多 12 张，会在上传前自动压缩</small></div>
              <div className="photo-grid">
                {previews.map((preview, index) => (
                  <div className="photo-preview" key={`${photos[index].name}-${index}`}>
                    <img src={preview} alt={`待上传照片 ${index + 1}`} />
                    <button type="button" onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="移除照片"><X size={15} /></button>
                  </div>
                ))}
                {photos.length < 12 && (
                  <label className="photo-add">
                    <ImagePlus size={22} />
                    <span>选择照片</span>
                    <input type="file" accept="image/*" multiple onChange={handlePhotos} />
                  </label>
                )}
              </div>
            </div>
          </div>

          {error && <p className="form-message form-message--error" role="alert">{error}</p>}

          <footer className="memory-form__footer">
            <button type="button" className="quiet-button" onClick={onClose} disabled={saving}>先不写了</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? '正在把记忆带回来…' : '放进我们的地图'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
