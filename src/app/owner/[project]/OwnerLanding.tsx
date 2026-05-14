'use client'

import { useState } from 'react'

type Props = {
  projectSlug: string
}

export default function OwnerLanding({ projectSlug }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!password.trim()) {
      setError('비밀번호를 입력하세요.')
      return
    }
    // 패치 B에서 실제 인증 로직 추가 예정
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setError('아직 인증 시스템이 준비되지 않았습니다. (패치 B에서 구현)')
    }, 800)
  }

  function closeModal() {
    setShowModal(false)
    setPassword('')
    setError('')
  }

  return (
    <>
      {/* Material Icons 폰트 보장 로드 */}
      <link
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
        rel="stylesheet"
      />
      <div className="min-h-screen bg-white text-[#1a2332]">
      {/* ===== Hero (Dark) ===== */}
      <div className="hero-section relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% -10%, rgba(94, 203, 214, 0.18) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 80% 30%, rgba(94, 203, 214, 0.08) 0%, transparent 60%),
              linear-gradient(180deg, #1a2332 0%, #243144 100%)
            `,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: `
              linear-gradient(rgba(94, 203, 214, 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(94, 203, 214, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 text-white">
          {/* nav */}
          <nav className="border-b border-white/[0.06]">
            <div className="max-w-[1100px] mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[#1a2332] font-extrabold text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #5ecbd6 0%, #2dd4bf 100%)',
                    boxShadow: '0 4px 12px rgba(94, 203, 214, 0.3)',
                  }}
                >
                  H
                </div>
                <div className="flex flex-col leading-tight">
                  <div className="font-extrabold text-[15px]">Hi-Trust Team</div>
                  <div className="text-[10px] text-white/50 font-medium tracking-wider">
                    OWNER PORTAL
                  </div>
                </div>
              </div>
              <div className="text-xs text-white/50 font-bold">
                <span className="text-[#5ecbd6]">/</span> {projectSlug}
              </div>
            </div>
          </nav>

          {/* hero content */}
          <div className="max-w-[920px] mx-auto px-6 pt-20 pb-24 text-center">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider mb-7"
              style={{
                background: 'rgba(94, 203, 214, 0.1)',
                border: '1px solid rgba(94, 203, 214, 0.25)',
                color: '#5ecbd6',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#5ecbd6',
                  boxShadow: '0 0 8px #5ecbd6',
                  animation: 'ownerPulse 2s infinite',
                }}
              />
              OBJECTIVE · TRANSPARENT · TRUSTED
            </div>

            <h1
              className="font-extrabold mb-6 leading-[1.05] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(36px, 7vw, 64px)' }}
            >
              신뢰는{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #5ecbd6 0%, #2dd4bf 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                데이터
              </span>
              로
              <br />
              만들어집니다.
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #5ecbd6 0%, #2dd4bf 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Hi-TRUST
              </span>
            </h1>

            <p
              className="leading-[1.65] mb-9 max-w-[580px] mx-auto"
              style={{
                fontSize: 'clamp(15px, 2vw, 18px)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              조선소는 도장 검사 데이터를 객관적으로 기록하고
              선주와 실시간으로 공유합니다.
              <br />
              품질은 신뢰를 바탕으로 완성됩니다.
            </p>

            <div className="flex justify-center gap-2.5 flex-wrap mb-14">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[10px] text-sm font-bold transition-all hover:-translate-y-px"
                style={{
                  background: '#5ecbd6',
                  color: '#1a2332',
                }}
              >
                프로젝트 입장하기
                <span className="material-icons text-[18px]">arrow_forward</span>
              </button>
            </div>

            {/* trust badges */}
            <div className="flex justify-center gap-6 flex-wrap pt-8 border-t border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs text-white/55 font-medium">
                <span className="material-icons text-[16px] text-[#5ecbd6]">
                  verified
                </span>
                객관적 측정 데이터
              </div>
              <div className="flex items-center gap-2 text-xs text-white/55 font-medium">
                <span className="material-icons text-[16px] text-[#5ecbd6]">sync</span>
                실시간 동기화
              </div>
              <div className="flex items-center gap-2 text-xs text-white/55 font-medium">
                <span className="material-icons text-[16px] text-[#5ecbd6]">shield</span>
                프로젝트별 격리
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Trust Principles (Light) ===== */}
      <section className="bg-[#f8fafb] py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-[#5ecbd6] text-xs font-bold tracking-[2px] mb-3">
              TRUST PRINCIPLES
            </div>
            <h2
              className="font-extrabold leading-[1.15] tracking-[-0.02em] text-[#1a2332]"
              style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}
            >
              조선소가 어떻게 <span className="text-[#5b6478]">신뢰를 만드는가</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <PrincipleCard
              icon="science"
              title="객관 측정"
              desc="BT 연동 측정기로 사람의 주관을 배제합니다. DFT·Salt·Profile·환경 데이터까지 정량적으로 기록됩니다."
            />
            <PrincipleCard
              icon="bolt"
              title="실시간 공유"
              desc="측정 즉시 데이터가 동기화됩니다. 보고서를 기다릴 필요 없이 즉시 확인할 수 있습니다."
            />
            <PrincipleCard
              icon="photo_camera"
              title="사진 증빙"
              desc="모든 측정값에는 사진이 첨부됩니다. 클라우드에 안전하게 보관되어 언제든 검증 가능합니다."
            />
          </div>
        </div>
      </section>

      {/* ===== What You'll See (Light) ===== */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block text-[#5ecbd6] text-xs font-bold tracking-[2px] mb-3">
              YOUR ACCESS
            </div>
            <h2
              className="font-extrabold leading-[1.15] tracking-[-0.02em] text-[#1a2332]"
              style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}
            >
              입장 후 확인할 수 있는 <span className="text-[#5b6478]">정보</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AccessCard icon="trending_up" title="진척률" desc="호선·블록별 회차 진행 현황" />
            <AccessCard
              icon="straighten"
              title="측정 데이터"
              desc="DFT·환경·Batch 등 모든 측정값"
            />
            <AccessCard icon="photo_library" title="검사 사진" desc="검사 기록에 첨부된 사진" />
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer
        className="text-center py-8 px-6 border-t border-white/[0.06]"
        style={{ background: '#1a2332', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}
      >
        <div className="text-white font-bold mb-2">Hi-Trust Team</div>
        <div>© 2026 Hi-Trust Team · Coating Quality Management</div>
        <div className="text-[10px] text-white/30 mt-3">Project · {projectSlug}</div>
      </footer>

      {/* ===== 비번 모달 ===== */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10, 14, 25, 0.85)', backdropFilter: 'blur(8px)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              type="button"
            >
              <span className="material-icons">close</span>
            </button>

            {/* 아이콘 */}
            <div className="text-center mb-5">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #5ecbd6 0%, #2dd4bf 100%)',
                  color: '#1a2332',
                  boxShadow: '0 8px 20px rgba(94, 203, 214, 0.3)',
                }}
              >
                <span className="material-icons text-[28px]">lock</span>
              </div>
              <h3 className="text-lg font-extrabold text-[#1a2332] mb-1">프로젝트 입장</h3>
              <div className="text-xs text-gray-500 font-medium">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">/{projectSlug}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                선주 전용 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="관리자가 발급한 비밀번호"
                autoFocus
                className="w-full px-4 py-3 border-[1.5px] border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:border-[#5ecbd6] mb-3 transition-colors"
              />

              {error && (
                <div
                  className="px-3 py-2 rounded-lg text-sm font-medium mb-3 flex items-start gap-1.5"
                  style={{ background: '#FFEBEE', color: '#C62828' }}
                >
                  <span className="material-icons text-base mt-0.5">error_outline</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                style={{ background: '#1a2332', color: 'white' }}
              >
                <span className="material-icons text-[18px]">
                  {submitting ? 'hourglass_top' : 'login'}
                </span>
                {submitting ? '확인 중...' : '입장하기'}
              </button>

              <p className="text-center text-[11px] text-gray-500 mt-4">
                비밀번호를 모르시면 관리자에게 문의하세요.
              </p>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes ownerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
    </>
  )
}

function PrincipleCard({
  icon, title, desc,
}: {
  icon: string
  title: string
  desc: string
}) {
  return (
    <div className="bg-white border border-[#e5e9ee] rounded-2xl p-7 transition-all hover:-translate-y-1 hover:border-[#5ecbd6] hover:shadow-[0_12px_32px_rgba(94,203,214,0.12)]">
      <div
        className="w-11 h-11 rounded-[11px] flex items-center justify-center mb-5"
        style={{
          background:
            'linear-gradient(135deg, rgba(94, 203, 214, 0.15) 0%, rgba(45, 212, 191, 0.1) 100%)',
          color: '#2dd4bf',
        }}
      >
        <span className="material-icons text-[22px]">{icon}</span>
      </div>
      <h3 className="text-[17px] font-bold mb-2 text-[#1a2332]">{title}</h3>
      <p className="text-[13px] text-[#5b6478] leading-relaxed">{desc}</p>
    </div>
  )
}

function AccessCard({
  icon, title, desc,
}: {
  icon: string
  title: string
  desc: string
}) {
  return (
    <div
      className="rounded-2xl p-7 text-center border border-[#e5e9ee] transition-all hover:border-[#5ecbd6] hover:shadow-[0_12px_32px_rgba(94,203,214,0.1)]"
      style={{ background: 'linear-gradient(180deg, #f8fafb 0%, white 100%)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl border-2 border-[#5ecbd6] bg-white flex items-center justify-center mx-auto mb-4 text-[#2dd4bf]"
      >
        <span className="material-icons text-[26px]">{icon}</span>
      </div>
      <h4 className="text-base font-bold mb-1.5 text-[#1a2332]">{title}</h4>
      <p className="text-xs text-[#5b6478] leading-relaxed">{desc}</p>
    </div>
  )
}
