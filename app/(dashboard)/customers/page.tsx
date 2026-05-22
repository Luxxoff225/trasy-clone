/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabaseRef.current
          .from('customers')
          .select('*')
          .eq('archived', false)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erreur fetch customers:', error)
        }
        setCustomers(data || [])
      } catch (err) {
        console.error('Erreur:', err)
        setCustomers([])
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  const filtered = customers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Clients</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>{customers.length} client(s) actif(s)</p>
        </div>
        <Link href="/customers/new" style={{
          backgroundColor: '#0f172a',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          + Nouveau client
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <input
            type="text"
            placeholder="Rechercher par nom ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', width: '300px' }}
          />
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Aucun client pour l&apos;instant</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                {['Nom complet', 'Téléphone', 'WhatsApp', 'Ville', 'Date création', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>{customer.full_name}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{customer.phone}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      backgroundColor: customer.whatsapp_enabled ? '#dcfce7' : '#f1f5f9',
                      color: customer.whatsapp_enabled ? '#16a34a' : '#64748b',
                      padding: '2px 8px', borderRadius: '999px', fontSize: '12px'
                    }}>
                      {customer.whatsapp_enabled ? '✓ WhatsApp' : 'SMS'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{customer.city || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {new Date(customer.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/customers/${customer.id}`} style={{ color: '#0f172a', fontSize: '13px', textDecoration: 'underline' }}>
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
