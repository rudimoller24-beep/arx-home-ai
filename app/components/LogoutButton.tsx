'use client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const logout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <button
      onClick={logout}
      className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white px-4 py-2 font-semibold"
    >
      Logout
    </button>
  )
}