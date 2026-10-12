import type { User } from '@supabase/supabase-js'
import type { CoupleSpace, Memory, NewMemoryInput } from '../types'
import { preparePhoto } from './images'
import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Supabase 尚未配置')
  return supabase
}

export async function fetchCoupleSpace(user: User): Promise<CoupleSpace> {
  const client = requireClient()
  const { data, error } = await client
    .from('couple_members')
    .select('couple_id, display_name, couples(id, name, anniversary)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('这个账户还没有加入共同空间，请先完成成员配置。')

  const related = Array.isArray(data.couples) ? data.couples[0] : data.couples
  if (!related) throw new Error('没有找到共同空间。')

  return {
    id: related.id,
    name: related.name,
    anniversary: related.anniversary,
    displayName: data.display_name,
  }
}

export async function fetchMemories(coupleId: string): Promise<Memory[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('memories')
    .select('id, title, city, subtitle, story, latitude, longitude, date_label, date_start, date_end, sort_date, created_at, memory_photos(id, storage_path, sort_order, caption)')
    .eq('couple_id', coupleId)
    .order('sort_date', { ascending: true })

  if (error) throw error

  const paths = (data ?? []).flatMap((memory) =>
    (memory.memory_photos ?? []).map((photo) => photo.storage_path),
  )
  const signedByPath = new Map<string, string>()
  const encryptedPaths = paths.filter((path) => path.startsWith('encrypted:'))
  const storagePaths = paths.filter((path) => !path.startsWith('encrypted:'))

  if (storagePaths.length > 0) {
    const { data: signed, error: signedError } = await client.storage
      .from('memory-photos')
      .createSignedUrls(storagePaths, 60 * 60)
    if (signedError) throw signedError
    signed?.forEach((item) => {
      if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl)
    })
  }

  if (encryptedPaths.length > 0) {
    const { data: secret, error: secretError } = await client
      .from('couple_secrets')
      .select('encryption_key')
      .eq('couple_id', coupleId)
      .single()
    if (secretError) throw secretError

    const keyBytes = Uint8Array.from(atob(secret.encryption_key), (character) => character.charCodeAt(0))
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])
    const assetBase = new URL(import.meta.env.BASE_URL, window.location.origin)

    await Promise.all(encryptedPaths.map(async (encodedPath) => {
      const [relativePath, ivBase64, contentType = 'image/jpeg'] = encodedPath.slice('encrypted:'.length).split('|')
      if (!relativePath || !ivBase64) throw new Error('加密照片信息不完整。')
      const response = await fetch(new URL(relativePath, assetBase))
      if (!response.ok) throw new Error('暂时没有加载出一张加密照片。')
      const iv = Uint8Array.from(atob(ivBase64), (character) => character.charCodeAt(0))
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, await response.arrayBuffer())
      signedByPath.set(encodedPath, URL.createObjectURL(new Blob([decrypted], { type: contentType })))
    }))
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    city: row.city,
    subtitle: row.subtitle,
    story: row.story,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    dateLabel: row.date_label,
    startDate: row.date_start,
    endDate: row.date_end,
    sortDate: row.sort_date,
    createdAt: row.created_at,
    photos: [...(row.memory_photos ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => ({
        id: photo.id,
        storagePath: photo.storage_path,
        url: signedByPath.get(photo.storage_path) ?? '',
        sortOrder: photo.sort_order,
        caption: photo.caption,
      })),
  }))
}

function formatDateLabel(startDate: string, endDate?: string) {
  if (!endDate || endDate === startDate) return startDate
  return `${startDate} 至 ${endDate}`
}

function safeFilename(file: File) {
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  return `${crypto.randomUUID()}.${extension}`
}

export async function createMemory(
  coupleId: string,
  userId: string,
  input: NewMemoryInput,
): Promise<void> {
  const client = requireClient()
  const memoryId = crypto.randomUUID()
  const uploadedPaths: string[] = []

  const { error: insertError } = await client.from('memories').insert({
    id: memoryId,
    couple_id: coupleId,
    created_by: userId,
    title: input.city,
    city: input.city,
    subtitle: input.subtitle,
    story: input.story,
    latitude: input.latitude,
    longitude: input.longitude,
    date_start: input.startDate,
    date_end: input.endDate || null,
    sort_date: input.startDate,
    date_label: formatDateLabel(input.startDate, input.endDate),
  })

  if (insertError) throw insertError

  try {
    const prepared = await Promise.all(input.photos.map(preparePhoto))
    const photoRows = []

    for (let index = 0; index < prepared.length; index += 1) {
      const photo = prepared[index]
      const storagePath = `${coupleId}/${memoryId}/${safeFilename(photo)}`
      const { error: uploadError } = await client.storage
        .from('memory-photos')
        .upload(storagePath, photo, { contentType: photo.type, upsert: false })
      if (uploadError) throw uploadError
      uploadedPaths.push(storagePath)
      photoRows.push({
        memory_id: memoryId,
        couple_id: coupleId,
        storage_path: storagePath,
        sort_order: index,
      })
    }

    if (photoRows.length > 0) {
      const { error: photosError } = await client.from('memory_photos').insert(photoRows)
      if (photosError) throw photosError
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await client.storage.from('memory-photos').remove(uploadedPaths)
    }
    await client.from('memories').delete().eq('id', memoryId)
    throw error
  }
}

