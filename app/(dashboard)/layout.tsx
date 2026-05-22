/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const getUser = async () => {
      console.log('=== GET USER START ===')

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Session:', session ? 'FOUND' : 'NULL')
      console.log('Session error:', sessionError)

      if (!session) {
        console.log('No session, redirecting to login')
        router.push('/login')
        return
      }

      console.log('User ID:', session.user.id)
      setUser(session.user)

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      console.log('Profile:', profileData)
      console.log('Profile error:', profileError)

      setProfile(profileData)
    }
    getUser()
  }, [])

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/customers', label: 'Clients', icon: '👥' },
    { href: '/packages', label: 'Colis', icon: '📦' },
  ]

  const sidebarContent = (
    <>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>NEXARA</h1>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>
            ✕
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => isMobile && setSidebarOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: '4px',
              textDecoration: 'none',
              color: pathname === item.href ? 'white' : '#94a3b8',
              backgroundColor: pathname === item.href ? '#1e293b' : 'transparent',
              fontSize: '14px',
              fontWeight: pathname === item.href ? '600' : '400',
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b' }}>
        <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '500' }}>
          {profile?.full_name || 'Chargement...'}
        </p>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#94a3b8' }}>
          {user?.email}
        </p>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: '1px solid #334155',
            color: '#94a3b8',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            width: '100%',
          }}
        >
          Déconnexion
        </button>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{
          width: '240px',
          backgroundColor: '#0f172a',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          {sidebarContent}
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 40,
            }}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '240px',
            backgroundColor: '#0f172a',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
          }}>
            {sidebarContent}
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, backgroundColor: '#f8fafc', overflow: 'auto', minWidth: 0 }}>
        {/* Mobile header */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px',
            backgroundColor: '#0f172a',
            color: 'white',
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '2px 4px' }}
            >
              ☰
            </button>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>NEXARA</span>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
