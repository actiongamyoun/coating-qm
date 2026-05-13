import { notFound } from 'next/navigation'
import { getSessionDetail } from '@/lib/actions/sessions'
import SessionDetail from './SessionDetail'

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getSessionDetail(id)
  if (!detail) notFound()
  return <SessionDetail detail={detail} />
}
