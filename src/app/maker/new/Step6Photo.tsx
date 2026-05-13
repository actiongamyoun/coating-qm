'use client'

import { useRef, useState } from 'react'
import { compressImage, formatFileSize } from '@/lib/utils/imageCompress'

export type PhotoSlot = {
  id: string
  photo_id?: string
  type: 'test' | 'other'
  status: 'uploading' | 'done' | 'error'
  previewUrl?: string
  cloudUrl?: string
  errorMsg?: string
  width?: number
  height?: number
  bytes?: number
}

type Props = {
  sessionId: string | null
  userId: string
  photos: PhotoSlot[]
  setPhotos: React.Dispatch<React.SetStateAction<PhotoSlot[]>>
  onNext: () => void
  onBack: () => void
}

const TEST_REQUIRED = 2
const TEST_MAX = 6
const OTHER_MAX = 6

export default function Step6Photo({
  sessionId,
  userId,
  photos,
  setPhotos,
  onNext,
  onBack,
}: Props) {
  const testInputRef = useRef<HTMLInputElement>(null)
  const otherInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const testPhotos = photos.filter(p => p.type === 'test')
  const otherPhotos = photos.filter(p => p.type === 'other')

  const testDoneCount = testPhotos.filter(p => p.status === 'done').length
  const otherDoneCount = otherPhotos.filter(p => p.status === 'done').length
  const testOk = testDoneCount >= TEST_REQUIRED

  // 세션이 없으면 안내
  if (!sessionId) {
    return (
      <div className="space-y-4">
        <div className="bg-warning-light text-warning p-4 rounded-xl text-sm font-bold">
          <span className="material-icons align-middle mr-1">info</span>
          <strong>사진 첨부는 검사 저장 후 가능합니다.</strong><br /><br />
          1) Step 7로 가서 검사 저장<br />
          2) 검사 상세 화면에서 사진 추가<br /><br />
          또는 이 단계는 건너뛰고 저장하시면 됩니다.
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 py-3 border-2 border-primary text-primary rounded-lg font-black">
            이전
          </button>
          <button onClick={onNext} className="flex-1 bg-primary text-white py-3 rounded-lg font-black">
            건너뛰기 →
          </button>
        </div>
      </div>
    )
  }

  async function handleFiles(files: FileList | null, type: 'test' | 'other') {
    if (!files || files.length === 0) return
    setBusy(true)

    const max = type === 'test' ? TEST_MAX : OTHER_MAX
    const currentCount = photos.filter(p => p.type === type).length
    const remaining = max - currentCount
    const toUpload = Array.from(files).slice(0, remaining)

    if (toUpload.length === 0) {
      alert(`${type === 'test' ? '테스트' : '추가'} 사진은 최대 ${max}장입니다.`)
      setBusy(false)
      return
    }

    const newSlots: PhotoSlot[] = toUpload.map(file => ({
      id: 'tmp_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
      type,
      status: 'uploading',
      previewUrl: URL.createObjectURL(file),
    }))

    setPhotos(prev => [...prev, ...newSlots])

    await Promise.all(toUpload.map((file, i) => uploadOne(file, newSlots[i], type)))

    setBusy(false)
  }

  async function uploadOne(file: File, slot: PhotoSlot, type: 'test' | 'other') {
    try {
      const { blob, width, height } = await compressImage(file, 1920, 0.8)

      const fd = new FormData()
      fd.append('file', blob, 'photo.jpg')
      fd.append('session_id', sessionId!)
      fd.append('photo_type', type === 'test' ? 'test' : 'other')
      fd.append('is_required', type === 'test' ? 'true' : 'false')
      fd.append('user_id', userId)

      const res = await fetch('/api/photos/upload', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || '업로드 실패')
      }

      setPhotos(prev =>
        prev.map(p =>
          p.id === slot.id
            ? {
                ...p,
                status: 'done',
                photo_id: json.photo.id,
                cloudUrl: json.photo.file_url,
                width,
                height,
                bytes: json.photo.bytes,
              }
            : p
        )
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '업로드 실패'
      setPhotos(prev =>
        prev.map(p => (p.id === slot.id ? { ...p, status: 'error', errorMsg: msg } : p))
      )
    }
  }

  async function removeSlot(slotId: string) {
    let target: PhotoSlot | undefined
    setPhotos(prev => {
      target = prev.find(p => p.id === slotId)
      return prev.filter(p => p.id !== slotId)
    })

    setTimeout(() => {
      if (target && target.status === 'done' && target.photo_id) {
        fetch('/api/photos/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_id: target.photo_id }),
        }).catch(() => {})
      }
    }, 0)
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary-light text-primary-dark p-3 rounded-lg text-xs font-bold flex items-start gap-2">
        <span className="material-icons text-base">photo_camera</span>
        <div>
          <strong>참고 사진 첨부</strong> (검사 판정에는 영향 없음)<br />
          테스트 사진 <strong className="text-danger">{TEST_REQUIRED}장 필수</strong> · 추가 사진 최대 {OTHER_MAX}장
        </div>
      </div>

      <div className={`bg-white border-2 rounded-xl p-4 ${testOk ? 'border-success' : 'border-danger'}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="font-black text-sm flex items-center gap-1.5">
            <span className="material-icons text-base text-danger">science</span>
            테스트 사진
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ml-1 ${
              testOk ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
            }`}>
              {testDoneCount} / {TEST_REQUIRED} 필수
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {testPhotos.map(p => (
            <PhotoThumb key={p.id} photo={p} onRemove={() => removeSlot(p.id)} />
          ))}
          {testPhotos.length < TEST_MAX && (
            <button
              type="button"
              disabled={busy}
              onClick={() => testInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-danger bg-danger-light/30 rounded-lg flex flex-col items-center justify-center text-danger font-black text-xs gap-1 disabled:opacity-50"
            >
              <span className="material-icons text-3xl">add_photo_alternate</span>
              테스트 사진 추가
            </button>
          )}
        </div>

        <input
          ref={testInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            handleFiles(e.target.files, 'test')
            e.target.value = ''
          }}
        />

        {!testOk && (
          <div className="text-xs text-danger font-bold flex items-center gap-1">
            <span className="material-icons text-base">warning</span>
            테스트 사진 {TEST_REQUIRED}장은 반드시 첨부해야 합니다.
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-black text-sm flex items-center gap-1.5">
            <span className="material-icons text-base text-primary">photo_library</span>
            추가 사진 (선택)
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full ml-1 bg-gray-100 text-gray-700">
              {otherDoneCount} / {OTHER_MAX}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {otherPhotos.map(p => (
            <PhotoThumb key={p.id} photo={p} onRemove={() => removeSlot(p.id)} compact />
          ))}
          {otherPhotos.length < OTHER_MAX && (
            <button
              type="button"
              disabled={busy}
              onClick={() => otherInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-500 font-black text-[10px] gap-1 disabled:opacity-50"
            >
              <span className="material-icons text-2xl">add_a_photo</span>
              추가
            </button>
          )}
        </div>

        <input
          ref={otherInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            handleFiles(e.target.files, 'other')
            e.target.value = ''
          }}
        />

        <div className="text-[10px] text-gray-500 font-bold">
          전경, Batch 라벨, 환경계 등 자유롭게 첨부
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-[11px] text-gray-700 font-bold space-y-0.5">
        <div className="flex items-center gap-1">
          <span className="material-icons text-sm">info</span>
          업로드 시 자동 압축됩니다 (1920px / JPEG 80%)
        </div>
        <div className="flex items-center gap-1">
          <span className="material-icons text-sm">cloud_upload</span>
          저장소: Cloudinary
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button onClick={onBack} className="flex-1 py-3 border-2 border-primary text-primary rounded-lg font-black">
          이전
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-primary text-white py-3 rounded-lg font-black flex items-center justify-center gap-1"
        >
          다음 <span className="material-icons text-base">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

function PhotoThumb({
  photo, onRemove, compact,
}: {
  photo: PhotoSlot
  onRemove: () => void
  compact?: boolean
}) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
      {photo.previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
      )}

      {photo.status === 'uploading' && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
          <span className="material-icons animate-spin">refresh</span>
          <div className={`font-black mt-1 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            업로드 중...
          </div>
        </div>
      )}
      {photo.status === 'error' && (
        <div className="absolute inset-0 bg-danger/80 flex flex-col items-center justify-center text-white p-1">
          <span className="material-icons">error</span>
          <div className={`font-black mt-1 text-center ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
            {photo.errorMsg || '실패'}
          </div>
        </div>
      )}
      {photo.status === 'done' && (
        <div className="absolute top-1 left-1 bg-success text-white rounded-full w-5 h-5 flex items-center justify-center">
          <span className="material-icons text-[14px]">check</span>
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-danger"
        title="삭제"
      >
        <span className="material-icons text-[14px]">close</span>
      </button>

      {photo.status === 'done' && photo.bytes && !compact && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
          {formatFileSize(photo.bytes)}
        </div>
      )}
    </div>
  )
}
