'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  /** 좌측에 표시할 역할/페이지 라벨 (예: '도료사', 'QM', '검사 상세') */
  roleLabel?: string
  /** 좌측 아이콘 (Material Icons 이름) */
  roleIcon?: string
  /** 프로젝트명 (중앙 표시) */
  projectName?: string | null
  /** 호선명 (중앙 표시) */
  shipName?: string | null
  /** 부제목 (호선명 대신 표시할 추가 정보, 예: 블록명) */
  subtitle?: string | null
  /** 뒤로가기 버튼 표시 여부 (기본 false) */
  showBack?: boolean
  /** 뒤로가기 클릭 시 동작 (기본: router.back()) */
  onBack?: () => void
  /** 우측 설정 메뉴 표시 여부 (기본 true) */
  showSettings?: boolean
}

export default function AppHeader({
  roleLabel,
  roleIcon,
  projectName,
  shipName,
  subtitle,
  showBack = false,
  onBack,
  showSettings = true,
}: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; maker: string; role: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser({
      name: localStorage.getItem('coating_qm_user_name') || '',
      maker: localStorage.getItem('coating_qm_user_maker') || '',
      role: localStorage.getItem('coating_qm_user_role') || '',
    })
  }, [])

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function handleLogout() {
    if (!confirm('로그아웃하시겠습니까?')) return
    localStorage.removeItem('coating_qm_user_id')
    localStorage.removeItem('coating_qm_user_role')
    localStorage.removeItem('coating_qm_user_name')
    localStorage.removeItem('coating_qm_user_maker')
    router.replace('/signup')
  }

  function handleBack() {
    if (onBack) onBack()
    else router.back()
  }

  return (
    <div
      className="sticky top-0 z-30 text-white shadow-md"
      style={{
        background: 'linear-gradient(180deg, #1a2332 0%, #243144 100%)',
        borderBottom: '1px solid rgba(94, 203, 214, 0.15)',
      }}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
        {/* 좌측: 뒤로가기 또는 역할 아이콘 */}
        {showBack ? (
          <button
            onClick={handleBack}
            className="text-white hover:text-[#5ecbd6] transition-colors flex-shrink-0"
          >
            <span className="material-icons">arrow_back</span>
          </button>
        ) : (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(94, 203, 214, 0.15)',
              border: '1px solid rgba(94, 203, 214, 0.3)',
            }}
          >
            <span className="material-icons text-[#5ecbd6] text-[20px]">
              {roleIcon || 'verified_user'}
            </span>
          </div>
        )}

        {/* 중앙: 프로젝트 · 호선 */}
        <div className="flex-1 min-w-0">
          {roleLabel && (
            <div className="text-[10px] font-bold tracking-widest text-white/50">
              {roleLabel}
            </div>
          )}
          <div className="font-black text-sm truncate flex items-center gap-1.5">
            {projectName && (
              <span className="text-white">{projectName}</span>
            )}
            {projectName && (shipName || subtitle) && (
              <span className="text-[#5ecbd6] mx-0.5">·</span>
            )}
            {shipName && <span className="text-white">{shipName}</span>}
            {!projectName && !shipName && subtitle && (
              <span className="text-white">{subtitle}</span>
            )}
            {projectName && shipName && subtitle && (
              <>
                <span className="text-white/30 mx-0.5">·</span>
                <span className="text-white/80 text-xs">{subtitle}</span>
              </>
            )}
          </div>
        </div>

        {/* 우측: 설정 메뉴 */}
        {showSettings && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <span className="material-icons text-white/80 text-[20px]">settings</span>
            </button>

            {menuOpen && user && (
              <div
                className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}
              >
                {/* 사용자 정보 */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="text-[10px] text-gray-500 font-bold tracking-wider">
                    {user.role === 'maker' ? '도료사' : user.role === 'qm' ? 'QM' : user.role === 'admin' ? '관리자' : '사용자'}
                  </div>
                  <div className="font-black text-sm text-[#1a2332] mt-0.5">
                    {user.maker && <span className="text-[#5ecbd6]">{user.maker}</span>}
                    {user.maker && user.name && <span className="text-gray-400 mx-1">·</span>}
                    {user.name && <span>{user.name}</span>}
                  </div>
                </div>

                {/* 메뉴 항목들 */}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    router.push(user.role === 'maker' ? '/maker' : '/qm')
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-[#1a2332] hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="material-icons text-base text-gray-500">home</span>
                  홈으로
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false)
                    handleLogout()
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-danger hover:bg-gray-50 flex items-center gap-2 border-t border-gray-200"
                >
                  <span className="material-icons text-base">logout</span>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
