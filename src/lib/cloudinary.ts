import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default cloudinary

/**
 * Cloudinary URL 변환 헬퍼
 * - 보기용: w_800, q_auto, f_auto (자동 압축 + 포맷 변환)
 * - 썸네일: w_200
 * - 원본: 변환 없음
 */
export function getCloudinaryUrl(
  publicId: string,
  variant: 'thumb' | 'view' | 'original' = 'view'
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  if (!cloudName) return ''

  const transforms: Record<typeof variant, string> = {
    thumb: 'c_fill,w_200,h_200,q_auto,f_auto',
    view: 'w_1200,q_auto,f_auto',
    original: '',
  }

  const transform = transforms[variant]
  const prefix = `https://res.cloudinary.com/${cloudName}/image/upload`
  return transform ? `${prefix}/${transform}/${publicId}` : `${prefix}/${publicId}`
}
