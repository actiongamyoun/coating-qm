'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

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
}

export default function SessionDetail({ detail }: { detail: Detail }) {
  const router = useRouter()
  const isFirst = detail.coat_order === 1
  const isFinal = detail.coat_order === 99

  // 미입력 체크
  const envMissing = !detail.env
  const batchMissing = !isFinal && detail.batches.length === 0
  const measureMissing = detail.zones.filter(z => {
    if (isFirst) {
      return !z.surface || (
        z.surface.salt === null &&
        z.surface.dust_size === null &&
        z.surface.dust_quantity === null &&
        z.surface.profile === null
      )
    }
    return !z.dft || (z.dft.avg === null && z.dft.min === null && z.dft.max === null)
  }).length

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      {/* 상단 */}
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
        {/* 요약 카드 */}
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
                <div
                  key={i}
                  className="py-2 border-b border-gray-200 last:border-0"
                >
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

        {/* 측정 (구역별) */}
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

        {/* 보완 입력 안내 */}
        {(envMissing || batchMissing || measureMissing > 0) && (
          <div className="bg-warning-light text-warning p-3 rounded-lg text-xs font-bold flex items-start gap-2">
            <span className="material-icons text-base">info</span>
            <div>
              미입력 항목이 있습니다. 도료사에게 보완 요청 또는 직접 입력 기능은 추후 추가됩니다.
            </div>
          </div>
        )}
      </div>
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
        // 표면 측정 표시
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
        // DFT 측정 표시
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
