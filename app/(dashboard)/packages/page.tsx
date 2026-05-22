/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  received:   { label: 'Reçu',       color: '#1d4ed8', bg: '#dbeafe' },
  in_transit: { label: 'En transit', color: '#92400e', bg: '#fef3c7' },
  available:  { label: 'Disponible', color: '#065f46', bg: '#d1fae5' },
  delivered:  { label: 'Livré',      color: '#374151', bg: '#f3f4f6' },
  dispute:    { label: 'Litige',     color: '#991b1b', bg: '#fee2e2' },
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [loading, setLoading] = useState(true)

  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const { data } = await supabaseRef.current
          .from('packages')
          .select('*, customer:customers(full_name, phone), route:routes(name)')
          .order('created_at', { ascending: false })
        setPackages(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPackages()
  }, [])

  const filtered = packages.filter(p => {
    const matchSearch = !search ||
      p.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.customer?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || p.status === filterStatus
    const matchAgent = !filterAgent || p.agent === filterAgent
    return matchSearch && matchStatus && matchAgent
  })

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Colis</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>{packages.length} colis au total</p>
        </div>
        <Link href="/packages/new" style={{
          backgroundColor: '#0f172a', color: 'white', padding: '10px 16px',
          borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500'
        }}>
          + Nouveau colis
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="Rechercher par tracking ou client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', width: '280px' }}
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', backgroundColor: 'white' }}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statusConfig).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <select
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', backgroundColor: 'white' }}
          >
            <option value="">Tous les agents</option>
            <option value="Nexar">Nexar</option>
            <option value="Partenaire">Partenaire</option>
            <option value="Special">Special</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Aucun colis trouvé</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                {['Tracking', 'Client', 'Description', 'Poids', 'Montant', 'Statut', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(pkg => {
                const s = statusConfig[pkg.status] || statusConfig.received
                return (
                  <tr key={pkg.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600', fontFamily: 'monospace' }}>{pkg.tracking_number}</td>
                    <td style={{ padding: '12px 16px' }}>{pkg.customer?.full_name}</td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.description}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{pkg.weight_kg} kg</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {pkg.amount_due ? new Intl.NumberFormat('fr-FR').format(pkg.amount_due) + ' FCFA' : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={pkg.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value
                          const supabase = createBrowserClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                          )
                          await supabase.from('packages').update({ status: newStatus }).eq('id', pkg.id)
                          await fetch('/api/packages/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ packageId: pkg.id, templateKey: 'package_' + newStatus }),
                          })
                          setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, status: newStatus } : p))
                        }}
                        style={{
                          border: '1px solid ' + (statusConfig[pkg.status]?.color || '#94a3b8'),
                          backgroundColor: statusConfig[pkg.status]?.bg || '#f1f5f9',
                          color: statusConfig[pkg.status]?.color || '#64748b',
                          padding: '4px 8px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="received">Reçu</option>
                        <option value="in_transit">En transit</option>
                        <option value="available">Disponible</option>
                        <option value="delivered">Livré</option>
                        <option value="dispute">Litige</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(pkg.created_at).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/packages/${pkg.id}`} style={{ color: '#0f172a', fontSize: '13px', textDecoration: 'underline' }}>
                        Voir
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
