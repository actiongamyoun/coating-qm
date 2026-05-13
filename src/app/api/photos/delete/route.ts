import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { photo_id } = await req.json()
    if (!photo_id) {
      return NextResponse.json({ success: false, error: 'photo_id 누락' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. 사진 정보 조회
    const { data: photo, error: fetchErr } = await supabase
      .from('photos')
      .select('id, public_id')
      .eq('id', photo_id)
      .maybeSingle()

    if (fetchErr || !photo) {
      return NextResponse.json({ success: false, error: '사진을 찾을 수 없음' }, { status: 404 })
    }

    // 2. Cloudinary 삭제
    if (photo.public_id) {
      try {
        await cloudinary.uploader.destroy(photo.public_id)
      } catch (err) {
        console.error('Cloudinary 삭제 실패:', err)
        // 계속 진행 (DB는 지움)
      }
    }

    // 3. DB 삭제
    const { error: delErr } = await supabase.from('photos').delete().eq('id', photo_id)
    if (delErr) {
      return NextResponse.json({ success: false, error: 'DB 삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Photo delete error:', error)
    const msg = error instanceof Error ? error.message : '삭제 실패'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
