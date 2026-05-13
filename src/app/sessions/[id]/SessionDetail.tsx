'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { compressImage, formatFileSize } from '@/lib/utils/imageCompress'

type Zone = {
  zone_id: string
  zone_name: string
  zone_code: string
  is_pspc: boolean
  area_total: number | null
  paint_name: string
  dft_target: number | null
  maker_name: string
  surface: {
    salt: number | null
    dust_size: number | null
    dust_quantity: number | null
    profile: number | null
  } | null
  dft: {
    avg: number | null
    min: number | null
    max: number | null
    count: number | null
  } | null
}

type Photo = {
  id: string
  photo_type: string
  file_url: string
  public_id: string | null
  width: number | null
  height: number | null
  bytes: number | null
  is_required: boolean
  caption: string | null
}

type Detail = {
  id: string
  ship_id: string
  block_id: string
  coat_order: number
  coat_label: string
  inspected_at: string
  ship_name: string
  ship_type: string | null
  block_code: string
  vendor_name: string
  recorder_name: string
  recorder_role: string
  recorder_maker: string
  env: {
    air_temp: number | null
    surface_temp: number | null
    humidity: number | null
    dew_point: number | null
    delta_t: number | null
  } | null
  batches: Array<{
    paint_name: string
    base_no: string | null
    hardener_no: string | null
  }>
  zones: Zone[]
  photos: Photo[]
}

export default function SessionDetail({ detail }: { detail: Detail }) {
  const router = useRouter()
  const isFirst = detail.coat_order === 1
  const isFinal = detail.coat_order === 99

  const [photos, setPhotos] = useState<Photo[]>(detail.photos)
  const [userId, setUserId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const testInputRef = useRef<HTMLInputElement>(null)
  const otherInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setUserId(localStorage.getItem('coating_qm_user_id'))
    setMounted(true)
  }, [])

  // 미입력 체크
  const envMissing = !detail.env
  const batchMissing = !isFinal && detail.batches.length === 0
  const measureMissing = detail.zones.filter(z => {
    if (isFirst) {
      return !z.surface || (
        z.surface.salt === null && z.surface.dust_size === null &&
        z.surface.dust_quantity === null && z.surface.profile === null
      )
    }
    return !z.dft || (z.dft.avg === null && z.dft.min === null && z.dft.max === null)
  }).length

  const testPhotos = photos.filter(p => p.photo_type === 'test')
  const otherPhotos = photos.filter(p => p.photo_type !== 'test')

  async function handleUpload(files: FileList | null, type: 'test' | 'other') {
    if (!files || files.length === 0 || !userId) return
    setUploading(true)

    for (const file of Array.from(files)) {
      try {
        const { blob } = await compressImage(file, 1920, 0.8)
        const fd = new FormData()
        fd.append('file', blob, 'photo.jpg')
        fd.append('session_id', detail.id)
        fd.append('photo_type', type)
        fd.append('is_required', type === 'test' ? 'true' : 'false')
        fd.append('user_id', userId)

        const res = await fetch('/api/photos/upload', { method: 'POST', body: fd })
        const json = await res.json()
        if (res.ok && json.success) {
          setPhotos(prev => [...prev, json.photo])
        } else {
          alert('업로드 실패: ' + (json.error || '알 수 없음'))
        }
      } catch (err) {
        alert('업로드 오류: ' + (err instanceof Error ? err.message : ''))
      }
    }

    setUploading(false)
  }

  async function handleDelete(photoId: string) {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return

    const res = await fetch('/api/photos/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_id: photoId }),
    })
    const json = await res.json()
    if (res.ok && json.success) {
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } else {
      alert('삭제 실패: ' + (json.error || ''))
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      <div className="sticky top-0 z-20 bg-gray-900 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <button onClick={() => router.back()} className="text-white">
          <span className="material-icons">arrow_back</span>
        </button>
        <div className="flex-1">
          <div className="text-xs opacity-70 font-bold">검사 상세</div>
          <div className="text-sm font-black">
            {detail.block_code} · {detail.coat_label}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-3">
        {/* 요약 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="font-black text-sm text-gray-700 mb-3 flex items-center gap-1">
            <span className="material-icons text-base text-primary">summarize</span>요약
          </div>
          <Row label="호선" value={`${detail.ship_name}${detail.ship_type ? ` · ${detail.ship_type}` : ''}`} />
          <Row label="블록 / 회차" value={`${detail.block_code} / ${detail.coat_label}`} />
          <Row label="협력사" value={detail.vendor_name || '-'} />
          <Row
            label="기록자"
            value={`${detail.recorder_maker ? detail.recorder_maker + ' · ' : ''}${detail.recorder_name}`}
          />
          <Row
            label="검사 일시"
            value={format(new Date(detail.inspected_at), 'yyyy-MM-dd HH:mm')}
            last
          />
        </div>

        {/* 환경 */}
        <div className={`bg-white border-2 rounded-xl p-4 ${envMissing ? 'border-danger' : 'border-paint'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="font-black text-sm flex items-center gap-1">
              <span className="material-icons text-base text-paint">thermostat</span>환경 측정
            </div>
            {envMissing && <MissingBadge />}
          </div>
          {detail.env ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <EnvCell label="대기" value={fmt(detail.env.air_temp, '℃')} />
              <EnvCell label="표면" value={fmt(detail.env.surface_temp, '℃')} />
              <EnvCell label="습도" value={fmt(detail.env.humidity, '%')} />
              <EnvCell label="이슬점" value={fmt(detail.env.dew_point, '℃')} />
              <EnvCell label="표면-이슬점" value={fmt(detail.env.delta_t, '℃')} />
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500 py-3 font-bold">미입력</div>
          )}
        </div>

        {/* Batch */}
        {!isFinal && (
          <div className={`bg-white border-2 rounded-xl p-4 ${batchMissing ? 'border-danger' : 'border-paint'}`}>
            <div className="flex justify-between items-center mb-3">
              <div className="font-black text-sm flex items-center gap-1">
                <span className="material-icons text-base text-paint">format_paint</span>Batch No.
              </div>
              {batchMissing && <MissingBadge />}
            </div>
            {detail.batches.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-3 font-bold">미입력</div>
            ) : (
              detail.batches.map((b, i) => (
                <div key={i} className="py-2 border-b border-gray-200 last:border-0">
                  <div className="font-black text-sm text-paint">{b.paint_name}</div>
                  <div className="text-xs mt-1 grid grid-cols-2 gap-2 font-bold">
                    <span>주제 · <strong>{b.base_no || '미입력'}</strong></span>
                    <span>경화제 · <strong>{b.hardener_no || '미입력'}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 측정 */}
        <div className={`bg-white border-2 rounded-xl p-4 ${measureMissing > 0 ? 'border-danger' : 'border-primary'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="font-black text-sm flex items-center gap-1">
              <span className="material-icons text-base text-primary">
                {isFirst ? 'science' : 'straighten'}
              </span>
              {isFirst ? '표면 측정 (1ST)' : 'DFT 측정'}
            </div>
            {measureMissing > 0 && <MissingBadge text={`${measureMissing}건 미입력`} />}
          </div>

          {detail.zones.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-3 font-bold">구역 정보 없음</div>
          ) : (
            <div className="space-y-3">
              {detail.zones.map(z => (
                <ZoneCard key={z.zone_id} zone={z} isFirst={isFirst} />
              ))}
            </div>
          )}
        </div>

        {/* 사진 갤러리 */}
        <div className="bg-white border-2 border-primary rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="font-black text-sm flex items-center gap-1">
              <span className="material-icons text-base text-primary">photo_library</span>
              사진 ({photos.length})
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              testPhotos.length >= 2 ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
            }`}>
              테스트 {testPhotos.length} / 2
            </span>
          </div>

          {/* 테스트 사진 */}
          <div className="mb-4">
            <div className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1">
              <span className="material-icons text-sm text-danger">science</span>
              테스트 사진 (필수)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {testPhotos.map(p => (
                <PhotoCard
                  key={p.id}
                  photo={p}
                  onClick={() => setLightbox(p)}
                  onDelete={() => handleDelete(p.id)}
                />
              ))}
              {mounted && userId && testPhotos.length < 6 && (
                <button
                  onClick={() => testInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square border-2 border-dashed border-danger bg-danger-light/30 rounded-lg flex flex-col items-center justify-center text-danger font-black text-[10px] gap-1 disabled:opacity-50"
                >
                  <span className="material-icons text-2xl">add_photo_alternate</span>
                  추가
                </button>
              )}
            </div>
            <input
              ref={testInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { handleUpload(e.target.files, 'test'); e.target.value = '' }}
            />
          </div>

          {/* 기타 사진 */}
          <div>
            <div className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1">
              <span className="material-icons text-sm text-primary">photo_library</span>
              추가 사진
            </div>
            <div className="grid grid-cols-3 gap-2">
              {otherPhotos.map(p => (
                <PhotoCard
                  key={p.id}
                  photo={p}
                  onClick={() => setLightbox(p)}
                  onDelete={() => handleDelete(p.id)}
                />
              ))}
              {mounted && userId && otherPhotos.length < 6 && (
                <button
                  onClick={() => otherInputRef.current?.click()}
                  disabled={uploading}
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
              onChange={e => { handleUpload(e.target.files, 'other'); e.target.value = '' }}
            />
          </div>

          {uploading && (
            <div className="text-xs text-primary font-bold mt-3 flex items-center gap-1">
              <span className="material-icons text-base animate-spin">refresh</span>
              업로드 중...
            </div>
          )}
        </div>

        {(envMissing || batchMissing || measureMissing > 0) && (
          <div className="bg-warning-light text-warning p-3 rounded-lg text-xs font-bold flex items-start gap-2">
            <span className="material-icons text-base">info</span>
            <div>
              미입력 항목이 있습니다. 도료사에게 보완 요청 또는 직접 입력 기능은 추후 추가됩니다.
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.file_url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center"
          >
            <span className="material-icons">close</span>
          </button>
          {lightbox.bytes && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold">
              {lightbox.width}×{lightbox.height} · {formatFileSize(lightbox.bytes)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PhotoCard({
  photo, onClick, onDelete,
}: {
  photo: Photo
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.file_url}
        alt=""
        className="w-full h-full object-cover cursor-pointer"
        onClick={onClick}
      />
      <button
        onClick={onDelete}
        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-danger"
        title="삭제"
      >
        <span className="material-icons text-[14px]">close</span>
      </button>
    </div>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-2 ${last ? '' : 'border-b border-gray-200'} text-sm`}>
      <span className="text-gray-700 font-bold">{label}</span>
      <span className="font-black text-right">{value}</span>
    </div>
  )
}

function EnvCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="text-[10px] text-gray-700 font-bold">{label}</div>
      <div className="text-base font-black mt-0.5">{value}</div>
    </div>
  )
}

function ZoneCard({ zone, isFirst }: { zone: Zone; isFirst: boolean }) {
  return (
    <div className={`border rounded-lg p-3 ${zone.is_pspc ? 'border-pink-200 bg-pink-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="font-black text-sm flex items-center gap-1 flex-1">
          {zone.is_pspc && <span className="material-icons text-base text-pink-700">lock</span>}
          {zone.zone_name}
          {zone.is_pspc && (
            <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[9px] font-black ml-1">
              PSPC
            </span>
          )}
        </div>
        {zone.dft_target !== null && !isFirst && (
          <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">
            목표 {zone.dft_target}㎛
          </span>
        )}
      </div>

      <div className="text-xs text-gray-700 font-bold mb-2">
        {zone.paint_name}
      </div>

      {isFirst ? (
        zone.surface ? (
          <div className="grid grid-cols-4 gap-1 text-center">
            <SmallCell label="Salt" value={fmt(zone.surface.salt, '')} unit="mg/m²" />
            <SmallCell label="Dust Sz" value={zone.surface.dust_size?.toString() || '—'} />
            <SmallCell label="Dust Qty" value={zone.surface.dust_quantity?.toString() || '—'} />
            <SmallCell label="Profile" value={fmt(zone.surface.profile, '')} unit="㎛" />
          </div>
        ) : (
          <div className="text-center text-xs text-danger font-bold py-2">측정 미입력</div>
        )
      ) : (
        zone.dft ? (
          <div className="grid grid-cols-4 gap-1 text-center">
            <SmallCell label="평균" value={fmt(zone.dft.avg, '')} unit="㎛" highlight />
            <SmallCell label="최소" value={fmt(zone.dft.min, '')} unit="㎛" />
            <SmallCell label="최대" value={fmt(zone.dft.max, '')} unit="㎛" />
            <SmallCell label="횟수" value={zone.dft.count?.toString() || '—'} />
          </div>
        ) : (
          <div className="text-center text-xs text-danger font-bold py-2">측정 미입력</div>
        )
      )}
    </div>
  )
}

function SmallCell({
  label, value, unit, highlight,
}: {
  label: string
  value: string
  unit?: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded p-1.5 ${highlight ? 'bg-primary-light' : 'bg-gray-50'}`}>
      <div className="text-[9px] text-gray-700 font-bold">{label}</div>
      <div className={`text-sm font-black ${highlight ? 'text-primary-dark' : ''}`}>
        {value}
      </div>
      {unit && <div className="text-[9px] text-gray-500">{unit}</div>}
    </div>
  )
}

function MissingBadge({ text = '미입력' }: { text?: string }) {
  return (
    <span className="bg-danger-light text-danger px-2 py-1 rounded-full text-[11px] font-black border border-dashed border-danger flex items-center gap-0.5">
      <span className="material-icons text-[14px]">warning</span>
      {text}
    </span>
  )
}

function fmt(value: number | null, unit: string): string {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (Number.isInteger(n)) return `${n}${unit}`
  return `${n.toFixed(1)}${unit}`
}
