'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { compressImage, formatFileSize } from '@/lib/utils/imageCompress'
import {
  updateEnvMeasurement,
  updateBatchRecord,
  updateSurfaceMeasurement,
  updateDftMeasurement,
} from '@/lib/actions/inspection-update'
import AppHeader from '@/components/AppHeader'

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
  const [userRole, setUserRole] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [editingEnv, setEditingEnv] = useState(false)
  const [editingBatch, setEditingBatch] = useState<string | null>(null)
  const [editingZone, setEditingZone] = useState<string | null>(null)

  const testInputRef = useRef<HTMLInputElement>(null)
  const otherInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setUserId(localStorage.getItem('coating_qm_user_id'))
    setUserRole(localStorage.getItem('coating_qm_user_role'))
    setMounted(true)
  }, [])

  const canEdit = !!userId && (userRole === 'qm' || userRole === 'admin' || userRole === 'maker')

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
      <AppHeader
        roleLabel="검사 상세"
        shipName={detail.ship_name}
        subtitle={`${detail.block_code} · ${detail.coat_label}`}
        showBack
        showSettings={false}
      />

      <div className="max-w-md mx-auto p-4 space-y-3">
        {/* 요약 (수정 불가) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="font-black text-sm text-[#1a2332] mb-3 flex items-center gap-1">
            <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>summarize</span>
            요약
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
        <div
          className="bg-white border-2 rounded-xl p-4"
          style={{ borderColor: envMissing ? '#dc2626' : '#5ecbd6' }}
        >
          <div className="flex justify-between items-center mb-3">
            <div className="font-black text-sm flex items-center gap-1 text-[#1a2332]">
              <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>thermostat</span>
              환경 측정
            </div>
            <div className="flex items-center gap-2">
              {envMissing && !editingEnv && <MissingBadge />}
              {mounted && canEdit && !editingEnv && (
                <EditButton onClick={() => setEditingEnv(true)} />
              )}
            </div>
          </div>

          {editingEnv ? (
            <EnvEdit
              initial={detail.env}
              sessionId={detail.id}
              userId={userId!}
              onCancel={() => setEditingEnv(false)}
              onSave={() => {
                setEditingEnv(false)
                router.refresh()
              }}
            />
          ) : detail.env ? (
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
          <div
            className="bg-white border-2 rounded-xl p-4"
            style={{ borderColor: batchMissing ? '#dc2626' : '#5ecbd6' }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="font-black text-sm flex items-center gap-1 text-[#1a2332]">
                <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>format_paint</span>
                Batch No.
              </div>
              {batchMissing && <MissingBadge />}
            </div>
            {detail.batches.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-3 font-bold">
                미입력
                {mounted && canEdit && (
                  <div className="text-xs text-gray-400 mt-1">
                    (도료별 Batch는 측정값과 함께 자동 생성됩니다)
                  </div>
                )}
              </div>
            ) : (
              detail.batches.map((b, i) => (
                <div key={i} className="py-2 border-b border-gray-200 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-black text-sm" style={{ color: '#0891a3' }}>{b.paint_name}</div>
                    {mounted && canEdit && editingBatch !== b.paint_name && (
                      <EditButton onClick={() => setEditingBatch(b.paint_name)} small />
                    )}
                  </div>
                  {editingBatch === b.paint_name ? (
                    <BatchEdit
                      paintName={b.paint_name}
                      initial={b}
                      sessionId={detail.id}
                      userId={userId!}
                      onCancel={() => setEditingBatch(null)}
                      onSave={() => {
                        setEditingBatch(null)
                        router.refresh()
                      }}
                    />
                  ) : (
                    <div className="text-xs mt-1 grid grid-cols-2 gap-2 font-bold text-[#1a2332]">
                      <span>주제 · <strong>{b.base_no || '미입력'}</strong></span>
                      <span>경화제 · <strong>{b.hardener_no || '미입력'}</strong></span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 측정 */}
        <div
          className="bg-white border-2 rounded-xl p-4"
          style={{ borderColor: measureMissing > 0 ? '#dc2626' : '#5ecbd6' }}
        >
          <div className="flex justify-between items-center mb-3">
            <div className="font-black text-sm flex items-center gap-1 text-[#1a2332]">
              <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>
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
                <ZoneCard
                  key={z.zone_id}
                  zone={z}
                  isFirst={isFirst}
                  canEdit={mounted && canEdit}
                  isEditing={editingZone === z.zone_id}
                  onEditClick={() => setEditingZone(z.zone_id)}
                  onCancel={() => setEditingZone(null)}
                  onSave={() => {
                    setEditingZone(null)
                    router.refresh()
                  }}
                  sessionId={detail.id}
                  userId={userId!}
                />
              ))}
            </div>
          )}
        </div>

        {/* 사진 갤러리 */}
        <div className="bg-white border-2 rounded-xl p-4" style={{ borderColor: '#5ecbd6' }}>
          <div className="flex justify-between items-center mb-3">
            <div className="font-black text-sm flex items-center gap-1 text-[#1a2332]">
              <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>photo_library</span>
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
            <div className="text-xs font-black text-[#1a2332] mb-2 flex items-center gap-1">
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
            <div className="text-xs font-black text-[#1a2332] mb-2 flex items-center gap-1">
              <span className="material-icons text-sm" style={{ color: '#5ecbd6' }}>photo_library</span>
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
                  className="aspect-square border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-500 font-black text-[10px] gap-1 disabled:opacity-50 hover:border-[#5ecbd6] transition-colors"
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
            <div className="text-xs font-bold mt-3 flex items-center gap-1" style={{ color: '#0891a3' }}>
              <span className="material-icons text-base animate-spin">refresh</span>
              업로드 중...
            </div>
          )}
        </div>

        {(envMissing || batchMissing || measureMissing > 0) && (
          <div className="bg-warning-light text-warning p-3 rounded-lg text-xs font-bold flex items-start gap-2">
            <span className="material-icons text-base">info</span>
            <div>
              미입력 항목이 있습니다. {canEdit ? '각 카드의 ✏️ 수정 버튼으로 보완할 수 있습니다.' : '도료사 또는 QM에게 보완 요청하세요.'}
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

// ============================================
// 수정 버튼 (공통)
// ============================================
function EditButton({ onClick, small }: { onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full font-black flex items-center gap-0.5 transition-colors hover:bg-[#1a2332] hover:text-white ${
        small ? 'px-2 py-0.5 text-[11px]' : 'px-2 py-1 text-[11px]'
      }`}
      style={{
        background: 'rgba(94, 203, 214, 0.15)',
        color: '#0891a3',
      }}
    >
      <span className="material-icons text-[14px]">edit</span>
      수정
    </button>
  )
}

// ============================================
// 환경 측정 편집 폼
// ============================================
function EnvEdit({
  initial, sessionId, userId, onCancel, onSave,
}: {
  initial: Detail['env']
  sessionId: string
  userId: string
  onCancel: () => void
  onSave: () => void
}) {
  const [airTemp, setAirTemp] = useState(initial?.air_temp?.toString() || '')
  const [surfaceTemp, setSurfaceTemp] = useState(initial?.surface_temp?.toString() || '')
  const [humidity, setHumidity] = useState(initial?.humidity?.toString() || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    if (!airTemp || !surfaceTemp || !humidity) {
      setError('모든 값을 입력하세요')
      return
    }
    setSaving(true)
    const res = await updateEnvMeasurement(sessionId, userId, {
      air_temp: airTemp,
      surface_temp: surfaceTemp,
      humidity,
    })
    setSaving(false)
    if (res.success) onSave()
    else setError(res.error || '저장 실패')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <NumInput label="대기 (℃)" value={airTemp} onChange={setAirTemp} />
        <NumInput label="표면 (℃)" value={surfaceTemp} onChange={setSurfaceTemp} />
        <NumInput label="습도 (%)" value={humidity} onChange={setHumidity} />
      </div>
      {error && (
        <div className="bg-danger-light text-danger px-2 py-1.5 rounded text-xs font-bold">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-black"
        >
          취소
        </button>
        <SaveButton onClick={handleSave} saving={saving} />
      </div>
    </div>
  )
}

// ============================================
// Batch 편집 폼
// ============================================
function BatchEdit({
  paintName, initial, sessionId, userId, onCancel, onSave,
}: {
  paintName: string
  initial: { base_no: string | null; hardener_no: string | null }
  sessionId: string
  userId: string
  onCancel: () => void
  onSave: () => void
}) {
  const [baseNo, setBaseNo] = useState(initial.base_no || '')
  const [hardenerNo, setHardenerNo] = useState(initial.hardener_no || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    setSaving(true)
    const res = await updateBatchRecord(sessionId, userId, paintName, {
      base_no: baseNo,
      hardener_no: hardenerNo,
    })
    setSaving(false)
    if (res.success) onSave()
    else setError(res.error || '저장 실패')
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <TxtInput label="주제 Batch" value={baseNo} onChange={setBaseNo} placeholder="예: A2451-25" />
        <TxtInput label="경화제 Batch" value={hardenerNo} onChange={setHardenerNo} placeholder="예: H1820-09" />
      </div>
      {error && (
        <div className="bg-danger-light text-danger px-2 py-1.5 rounded text-xs font-bold">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-1.5 border-2 border-gray-300 text-gray-700 rounded-lg text-xs font-black">
          취소
        </button>
        <SaveButton onClick={handleSave} saving={saving} small />
      </div>
    </div>
  )
}

// ============================================
// 구역 카드 (편집 가능)
// ============================================
function ZoneCard({
  zone, isFirst, canEdit, isEditing, onEditClick, onCancel, onSave, sessionId, userId,
}: {
  zone: Zone
  isFirst: boolean
  canEdit: boolean
  isEditing: boolean
  onEditClick: () => void
  onCancel: () => void
  onSave: () => void
  sessionId: string
  userId: string
}) {
  return (
    <div
      className="border rounded-lg p-3"
      style={
        zone.is_pspc
          ? { borderColor: '#fbcfe8', background: 'rgba(253, 242, 248, 0.5)' }
          : { borderColor: '#e5e7eb', background: '#ffffff' }
      }
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-black text-sm flex items-center gap-1 flex-1 text-[#1a2332]">
          {zone.is_pspc && <span className="material-icons text-base text-pink-700">lock</span>}
          {zone.zone_name}
          {zone.is_pspc && (
            <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[9px] font-black ml-1">
              PSPC
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {zone.dft_target !== null && !isFirst && (
            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-[#1a2332]">
              목표 {zone.dft_target}㎛
            </span>
          )}
          {canEdit && !isEditing && (
            <EditButton onClick={onEditClick} />
          )}
        </div>
      </div>

      <div className="text-xs text-gray-700 font-bold mb-2">{zone.paint_name}</div>

      {isEditing ? (
        isFirst ? (
          <SurfaceEdit
            zoneId={zone.zone_id}
            initial={zone.surface}
            sessionId={sessionId}
            userId={userId}
            onCancel={onCancel}
            onSave={onSave}
          />
        ) : (
          <DftEdit
            zoneId={zone.zone_id}
            initial={zone.dft}
            sessionId={sessionId}
            userId={userId}
            onCancel={onCancel}
            onSave={onSave}
          />
        )
      ) : isFirst ? (
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
      ) : zone.dft ? (
        <div className="grid grid-cols-4 gap-1 text-center">
          <SmallCell label="평균" value={fmt(zone.dft.avg, '')} unit="㎛" highlight />
          <SmallCell label="최소" value={fmt(zone.dft.min, '')} unit="㎛" />
          <SmallCell label="최대" value={fmt(zone.dft.max, '')} unit="㎛" />
          <SmallCell label="횟수" value={zone.dft.count?.toString() || '—'} />
        </div>
      ) : (
        <div className="text-center text-xs text-danger font-bold py-2">측정 미입력</div>
      )}
    </div>
  )
}

// ============================================
// 표면 측정 편집 폼
// ============================================
function SurfaceEdit({
  zoneId, initial, sessionId, userId, onCancel, onSave,
}: {
  zoneId: string
  initial: Zone['surface']
  sessionId: string
  userId: string
  onCancel: () => void
  onSave: () => void
}) {
  const [salt, setSalt] = useState(initial?.salt?.toString() || '')
  const [dustSize, setDustSize] = useState(initial?.dust_size?.toString() || '')
  const [dustQty, setDustQty] = useState(initial?.dust_quantity?.toString() || '')
  const [profile, setProfile] = useState(initial?.profile?.toString() || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    setSaving(true)
    const res = await updateSurfaceMeasurement(sessionId, userId, zoneId, {
      salt, dust_size: dustSize, dust_quantity: dustQty, profile,
    })
    setSaving(false)
    if (res.success) onSave()
    else setError(res.error || '저장 실패')
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1">
        <NumInput label="Salt" value={salt} onChange={setSalt} small />
        <NumInput label="Dust Sz" value={dustSize} onChange={setDustSize} small />
        <NumInput label="Dust Qty" value={dustQty} onChange={setDustQty} small />
        <NumInput label="Profile" value={profile} onChange={setProfile} small />
      </div>
      {error && (
        <div className="bg-danger-light text-danger px-2 py-1 rounded text-[10px] font-bold">{error}</div>
      )}
      <div className="flex gap-1.5">
        <button onClick={onCancel} className="flex-1 py-1.5 border-2 border-gray-300 text-gray-700 rounded text-xs font-black">
          취소
        </button>
        <SaveButton onClick={handleSave} saving={saving} small />
      </div>
    </div>
  )
}

// ============================================
// DFT 측정 편집 폼
// ============================================
function DftEdit({
  zoneId, initial, sessionId, userId, onCancel, onSave,
}: {
  zoneId: string
  initial: Zone['dft']
  sessionId: string
  userId: string
  onCancel: () => void
  onSave: () => void
}) {
  const [avg, setAvg] = useState(initial?.avg?.toString() || '')
  const [min, setMin] = useState(initial?.min?.toString() || '')
  const [max, setMax] = useState(initial?.max?.toString() || '')
  const [count, setCount] = useState(initial?.count?.toString() || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    setSaving(true)
    const res = await updateDftMeasurement(sessionId, userId, zoneId, {
      avg_value: avg, min_value: min, max_value: max, measurement_count: count,
    })
    setSaving(false)
    if (res.success) onSave()
    else setError(res.error || '저장 실패')
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1">
        <NumInput label="평균" value={avg} onChange={setAvg} small />
        <NumInput label="최소" value={min} onChange={setMin} small />
        <NumInput label="최대" value={max} onChange={setMax} small />
        <NumInput label="횟수" value={count} onChange={setCount} small />
      </div>
      {error && (
        <div className="bg-danger-light text-danger px-2 py-1 rounded text-[10px] font-bold">{error}</div>
      )}
      <div className="flex gap-1.5">
        <button onClick={onCancel} className="flex-1 py-1.5 border-2 border-gray-300 text-gray-700 rounded text-xs font-black">
          취소
        </button>
        <SaveButton onClick={handleSave} saving={saving} small />
      </div>
    </div>
  )
}

// ============================================
// 공통 입력 컴포넌트
// ============================================
function SaveButton({ onClick, saving, small }: { onClick: () => void; saving: boolean; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`flex-1 text-white rounded-lg font-black disabled:opacity-50 transition-all hover:-translate-y-px ${
        small ? 'py-1.5 text-xs' : 'py-2 text-sm'
      }`}
      style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #243144 100%)',
      }}
    >
      {saving ? '저장 중...' : '저장'}
    </button>
  )
}

function NumInput({
  label, value, onChange, small,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  small?: boolean
}) {
  return (
    <div>
      <div className={`text-gray-700 font-bold mb-0.5 ${small ? 'text-[9px]' : 'text-[10px]'}`}>{label}</div>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-white border border-gray-300 rounded px-1 py-1 text-center font-black focus:border-[#5ecbd6] focus:outline-none ${
          small ? 'text-xs' : 'text-base'
        }`}
      />
    </div>
  )
}

function TxtInput({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <div className="text-[10px] text-gray-700 font-bold mb-0.5">{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs font-bold focus:border-[#5ecbd6] focus:outline-none"
      />
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
      <span className="font-black text-right text-[#1a2332]">{value}</span>
    </div>
  )
}

function EnvCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="text-[10px] text-gray-700 font-bold">{label}</div>
      <div className="text-base font-black mt-0.5 text-[#1a2332]">{value}</div>
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
    <div
      className="rounded p-1.5"
      style={
        highlight
          ? { background: 'rgba(94, 203, 214, 0.15)' }
          : { background: '#f9fafb' }
      }
    >
      <div className="text-[9px] text-gray-700 font-bold">{label}</div>
      <div
        className="text-sm font-black"
        style={highlight ? { color: '#0891a3' } : { color: '#1a2332' }}
      >
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
