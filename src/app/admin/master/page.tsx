import { isAdminAuthed } from '@/lib/actions/admin-auth'
import AdminLogin from './AdminLogin'
import MasterEditor from './MasterEditor'

export default async function MasterPage() {
  const authed = await isAdminAuthed()

  if (!authed) {
    return <AdminLogin />
  }

  return <MasterEditor />
}
