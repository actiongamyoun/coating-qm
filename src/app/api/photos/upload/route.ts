import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// 허용 사진 타입
const ALLOWED_TYPES = ['test', 'env', 'batch', 'panorama', 'other', 'dft', 'surface'] as const

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const file = formData.get('file')
    const sessionId = formData.get('session_id') as string | null
    const photoType = formData.get('photo_type') as string | null
    const isRequired = formData.get('is_required') === 'true'
    const caption = (formData.get('caption') as string | null) || null
    const userId = formData.get('user_id') as string | null

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, error: '파일이 없습니다' }, { status: 400 })
    }
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'session_id 누락' }, { status: 400 })
    }
    if (!photoType || !ALLOWED_TYPES.includes(photoType as typeof ALLOWED_TYPES[number])) {
      return NextResponse.json({ success: false, error: 'photo_type 유효하지 않음' }, { status: 400 })
    }

    // 파일을 buffer로
    const buffer = Buffer.from(await file.arrayBuffer())

    // Cloudinary 업로드
    type UploadResult = {
      public_id: string
      secure_url: string
      width: number
      height: number
      bytes: number
      format: string
    }

    const uploadResult = await new Promise<UploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `coating-qm/sessions/${sessionId}`,
          resource_type: 'image',
          tags: [photoType, sessionId],
          // Cloudinary 측에서도 추가 압축 (제한)
          transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error)
          else if (result) resolve(result as UploadResult)
          else reject(new Error('업로드 결과 없음'))
        }
      ).end(buffer)
    })

    // Supabase에 메타 저장
    const supabase = await createClient()
    const { data: inserted, error: dbErr } = await supabase
      .from('photos')
      .insert({
        session_id: sessionId,
        photo_type: photoType,
        file_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        bytes: uploadResult.bytes,
        format: uploadResult.format,
        is_required: isRequired,
        caption,
        taken_at: new Date().toISOString(),
        uploaded_by: userId,
      })
      .select('id, public_id, file_url, photo_type, is_required, caption, width, height, bytes')
      .single()

    if (dbErr) {
      // Cloudinary 업로드 롤백 (Supabase 저장 실패 시)
      try {
        await cloudinary.uploader.destroy(uploadResult.public_id)
      } catch (rollbackErr) {
        console.error('Cloudinary 롤백 실패:', rollbackErr)
      }
      console.error('Supabase 저장 실패:', dbErr)
      return NextResponse.json(
        { success: false, error: 'DB 저장 실패: ' + dbErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, photo: inserted })
  } catch (error: unknown) {
    console.error('Photo upload error:', error)
    const msg = error instanceof Error ? error.message : '업로드 실패'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
