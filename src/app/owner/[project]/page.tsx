import OwnerLanding from './OwnerLanding'

export default async function OwnerProjectPage({
  params,
}: {
  params: Promise<{ project: string }>
}) {
  const { project } = await params
  return <OwnerLanding projectSlug={project} />
}
