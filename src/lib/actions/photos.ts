'use server'

import { createClient } from '@/lib/supabase/server'

export type PhotoItem = {
  id: string
  session_id: string
  photo_type: string
  file_url: string
  public_id: string | null
  width: number | null
  height: number | null
  bytes: number | null
  format: string | null
  is_required: boolean
  caption: string | null
  taken_at: string | null
  created_at: string
}

/**
 * 특정 세션의 사진 전체 조회
 */
export async function getSessionPhotos(sessionId: string): Promise<PhotoItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('photos')
    .select('id, session_id, photo_type, file_url, public_id, width, height, bytes, format, is_required, caption, taken_at, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getSessionPhotos error:', error)
    return []
  }
  return data || []
}

/**
 * 세션의 사진 통계
 */
export async function getSessionPhotoStats(sessionId: string) {
  const photos = await getSessionPhotos(sessionId)
  return {
    total: photos.length,
    test: photos.filter(p => p.photo_type === 'test').length,
    env: photos.filter(p => p.photo_type === 'env').length,
    batch: photos.filter(p => p.photo_type === 'batch').length,
    other: photos.filter(p => !['test', 'env', 'batch'].includes(p.photo_type)).length,
  }
}
