/**
 * 브라우저에서 이미지 리사이즈/압축
 * - 긴 변 maxSize 픽셀 이하로 리사이즈
 * - JPEG quality로 압축
 * - 결과: Blob (그대로 fetch 가능)
 */
export async function compressImage(
  file: File,
  maxSize = 1920,
  quality = 0.8
): Promise<{ blob: Blob; width: number; height: number; originalSize: number }> {
  // 1. 원본 이미지 로드
  const imgUrl = URL.createObjectURL(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = imgUrl
  })

  // 2. 리사이즈 비율 계산
  let { width, height } = img
  const longSide = Math.max(width, height)
  if (longSide > maxSize) {
    const ratio = maxSize / longSide
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  // 3. Canvas에 그리기
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context 생성 실패')
  ctx.drawImage(img, 0, 0, width, height)

  // 4. JPEG로 압축
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('압축 실패'))),
      'image/jpeg',
      quality
    )
  })

  URL.revokeObjectURL(imgUrl)

  return {
    blob,
    width,
    height,
    originalSize: file.size,
  }
}

/**
 * Blob을 base64 data URL로 변환
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 파일 크기 사람이 읽기 좋게 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
