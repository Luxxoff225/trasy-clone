/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  received:   { label: 'Reçu',        color: '#1d4ed8', bg: '#dbeafe' },
  in_transit: { label: 'En transit',  color: '#92400e', bg: '#fef3c7' },
  available:  { label: 'Disponible',  color: '#065f46', bg: '#d1fae5' },
  delivered:  { label: 'Livré',       color: '#374151', bg: '#f3f4f6' },
  dispute:    { label: 'Litige',      color: '#991b1b', bg: '#fee2e2' },
}

const statusOrder = ['received', 'in_transit', 'available', 'delivered', 'dispute']

export default function PackageDetailPage() {
  const { id } = useParams()
  const [pkg, setPkg] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const hasFetched = useRef(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchPackage = async () => {
    const { data } = await supabase
      .from('packages')
      .select('*, customer:customers(*), route:routes(*)')
      .eq('id', id)
      .single()
    setPkg(data)

    const { data: hist } = await supabase
      .from('package_status_history')
      .select('*')
      .eq('package_id', id)
      .order('created_at', { ascending: false })
    setHistory(hist || [])

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('package_id', id)
      .order('created_at', { ascending: false })
    setNotifications(notifs || [])

    setLoading(false)
  }

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchPackage()
  }, [id])

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true)
    setError('')
    setSuccess('')

    const { error: err } = await supabase
      .from('packages')
      .update({ status: newStatus })
      .eq('id', id)

    if (err) {
      setError('Erreur : ' + err.message)
      setUpdating(false)
      return
    }

    await fetch('/api/packages/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: id, templateKey: 'package_' + newStatus }),
    })

    setSuccess('Statut mis à jour → ' + statusConfig[newStatus]?.label)
    fetchPackage()
    setUpdating(false)
  }

  if (loading) return <div style={{ padding: '32px', color: '#94a3b8' }}>Chargement...</div>
  if (!pkg) return <div style={{ padding: '32px', color: '#dc2626' }}>Colis introuvable</div>

  const s = statusConfig[pkg.status]

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <Link href="/packages" style={{ color: '#6366f1', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
        ← Retour aux colis
      </Link>

      {success && (
        <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: 'monospace' }}>{pkg.tracking_number}</h1>
          <span style={{ backgroundColor: s.bg, color: s.color, padding: '4px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: '500' }}>{s.label}</span>
        </div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>Créé le {new Date(pkg.created_at).toLocaleDateString('fr-FR')}</div>
      </div>

      {/* Infos colis */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Détails du colis</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
          {([
            ['Client', pkg.customer?.full_name],
            ['Téléphone', pkg.customer?.phone],
            ['Description', pkg.description],
            ['Type', pkg.package_type || '—'],
            ['Agent', pkg.agent || '—'],
            ['Poids', pkg.weight_kg + ' kg'],
            ['Pièces', pkg.pieces],
            ['Montant dû', new Intl.NumberFormat('fr-FR').format(pkg.amount_due) + ' FCFA'],
            ['Paiement', pkg.payment_method],
          ] as [string, any][]).map(([label, value]) => (
            <div key={label}>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontWeight: '500' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Changement de statut */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Changer le statut</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statusOrder.map(status => {
            const sc = statusConfig[status]
            const isCurrent = pkg.status === status
            return (
              <button
                key={status}
                onClick={() => !isCurrent && handleStatusChange(status)}
                disabled={isCurrent || updating}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: isCurrent ? '2px solid ' + sc.color : '1px solid #e2e8f0',
                  backgroundColor: isCurrent ? sc.bg : 'white',
                  color: isCurrent ? sc.color : '#374151',
                  fontWeight: isCurrent ? '600' : '400',
                  fontSize: '13px',
                  cursor: isCurrent ? 'default' : 'pointer',
                  opacity: updating ? 0.6 : 1,
                }}
              >
                {sc.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Historique statuts */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Historique des statuts</h2>
        {history.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Aucun changement de statut</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#94a3b8' }}>{new Date(h.created_at).toLocaleString('fr-FR')}</span>
                <span style={{ backgroundColor: statusConfig[h.from_status]?.bg || '#f1f5f9', color: statusConfig[h.from_status]?.color || '#64748b', padding: '2px 8px', borderRadius: '999px' }}>
                  {statusConfig[h.from_status]?.label || h.from_status || '—'}
                </span>
                <span>→</span>
                <span style={{ backgroundColor: statusConfig[h.to_status]?.bg, color: statusConfig[h.to_status]?.color, padding: '2px 8px', borderRadius: '999px' }}>
                  {statusConfig[h.to_status]?.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Notifications envoyées</h2>
        {notifications.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Aucune notification</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{
                  backgroundColor: n.status === 'sent' ? '#d1fae5' : '#fee2e2',
                  color: n.status === 'sent' ? '#065f46' : '#991b1b',
                  padding: '2px 8px', borderRadius: '999px', fontWeight: '500'
                }}>
                  {n.status === 'sent' ? '✓ Envoyé' : '✗ Échec'}
                </span>
                <span style={{ color: '#64748b' }}>{n.channel}</span>
                <span style={{ color: '#94a3b8' }}>{new Date(n.created_at).toLocaleString('fr-FR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
