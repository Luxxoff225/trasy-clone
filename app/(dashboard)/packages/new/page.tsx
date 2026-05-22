/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

type Agent = 'Nexar' | 'Partenaire' | 'Special'
type PackageType = 'Standard' | 'Batterie' | 'Téléphone' | 'Ordinateur' | 'Drone' | 'Cosmétique/Complément'

const PRICES: Record<string, Record<string, any>> = {
  Nexar: {
    Standard:               { mode: 'kg',         price: 12500 },
    Batterie:               { mode: 'kg',         price: 14000 },
    Téléphone:              { mode: 'pcs',        price: 25000 },
    Ordinateur:             { mode: 'pcs_weight', base: 45000, extra_per_kg: 12500, threshold: 2.5 },
    Drone:                  { mode: 'pcs',        price: 65000 },
    'Cosmétique/Complément':{ mode: 'kg',         price: 14000 },
  },
  Partenaire: {
    Standard:               { mode: 'kg',         price: 11500 },
    Batterie:               { mode: 'kg',         price: 13000 },
    Téléphone:              { mode: 'pcs',        price: 22000 },
    Ordinateur:             { mode: 'pcs_weight', base: 40000, extra_per_kg: 12500, threshold: 2.5 },
    Drone:                  { mode: 'pcs',        price: 55000 },
    'Cosmétique/Complément':{ mode: 'kg',         price: 13000 },
  },
  Special: {
    Standard: { mode: 'kg', price: 11000 },
    Batterie: { mode: 'kg', price: 11000 },
  },
}

const TYPES_BY_AGENT: Record<Agent, PackageType[]> = {
  Nexar:      ['Standard', 'Batterie', 'Téléphone', 'Ordinateur', 'Drone', 'Cosmétique/Complément'],
  Partenaire: ['Standard', 'Batterie', 'Téléphone', 'Ordinateur', 'Drone', 'Cosmétique/Complément'],
  Special:    ['Standard', 'Batterie'],
}

function calculateAmount(agent: string, packageType: string, weight: number, pieces: number): number | null {
  const rule = PRICES[agent]?.[packageType]
  if (!rule || !weight || !pieces) return null

  let amount: number
  if (rule.mode === 'kg') {
    amount = rule.price * weight
  } else if (rule.mode === 'pcs') {
    amount = rule.price * pieces
  } else {
    // pcs_weight
    const extra = weight > rule.threshold ? (weight - rule.threshold) * rule.extra_per_kg : 0
    amount = (rule.base + extra) * pieces
  }
  return Math.round(amount)
}

export default function NewPackagePage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [defaultRouteId, setDefaultRouteId] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [form, setForm] = useState({
    customer_id: '',
    description: '',
    weight_kg: '',
    pieces: '1',
    agent: '' as Agent | '',
    package_type: '' as PackageType | '',
    payment_method: 'cash',
  })

  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  useEffect(() => {
    const fetchDefaultRoute = async () => {
      const { data } = await supabaseRef.current
        .from('routes')
        .select('id')
        .eq('active', true)
        .limit(1)
        .single()
      if (data) setDefaultRouteId(data.id)
    }
    fetchDefaultRoute()
  }, [])

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return }
    const search = async () => {
      const { data } = await supabaseRef.current
        .from('customers')
        .select('*')
        .or(`full_name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`)
        .eq('archived', false)
        .limit(5)
      setCustomers(data || [])
    }
    const timer = setTimeout(search, 300)
    return () => clearTimeout(timer)
  }, [customerSearch])

  const selectedCustomer = form.customer_id ? customers.find(c => c.id === form.customer_id) : null

  const calculatedAmount = (form.agent && form.package_type && form.weight_kg && form.pieces)
    ? calculateAmount(form.agent, form.package_type, parseFloat(form.weight_kg), parseInt(form.pieces))
    : null

  useEffect(() => {
    if (form.agent === 'Special' && calculatedAmount !== null) {
      setManualAmount(String(calculatedAmount))
    }
  }, [calculatedAmount, form.agent])

  const handleAgentChange = (agent: Agent | '') => {
    setManualAmount('')
    setForm(f => ({
      ...f,
      agent,
      package_type: agent && f.package_type && !TYPES_BY_AGENT[agent]?.includes(f.package_type as PackageType)
        ? ''
        : f.package_type,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.customer_id) { setError('Sélectionne un client'); return }
    if (!defaultRouteId) { setError('Aucune route active trouvée'); return }
    if (!form.description) { setError('Décris le contenu du colis'); return }
    if (!form.weight_kg || parseFloat(form.weight_kg) <= 0) { setError('Le poids doit être supérieur à 0'); return }
    if (!form.agent) { setError('Sélectionne un agent'); return }
    if (!form.package_type) { setError('Sélectionne un type de colis'); return }

    setLoading(true)

    const amount_due = form.agent === 'Special'
      ? (parseFloat(manualAmount) || 0)
      : (calculatedAmount ?? 0)

    const response = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: form.customer_id,
        route_id: defaultRouteId,
        description: form.description,
        weight_kg: parseFloat(form.weight_kg),
        pieces: parseInt(form.pieces),
        agent: form.agent,
        package_type: form.package_type,
        amount_paid: 0,
        amount_due,
        payment_method: form.payment_method,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError('Erreur : ' + data.error)
      setLoading(false)
      return
    }

    setSuccess('✅ Colis ' + data.tracking_number + ' enregistré ! Notification envoyée au client.')
    setTimeout(() => router.push('/packages'), 2000)
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    backgroundColor: 'white',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500' as const,
    marginBottom: '6px',
    color: '#374151',
  }

  const availableTypes = form.agent ? TYPES_BY_AGENT[form.agent as Agent] : []

  return (
    <div style={{ padding: '32px', maxWidth: '640px' }}>
      <Link href="/packages" style={{ color: '#6366f1', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginBottom: '24px' }}>
        ← Retour aux colis
      </Link>

      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px' }}>Nouveau colis</h1>

      {success && (
        <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '20px' }}>

          {/* Client */}
          <div>
            <label style={labelStyle}>Client *</label>
            {form.customer_id && selectedCustomer ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #86efac', borderRadius: '8px', backgroundColor: '#f0fdf4' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>✓ {selectedCustomer.full_name} — {selectedCustomer.phone}</span>
                <button type="button" onClick={() => { setForm({ ...form, customer_id: '' }); setCustomerSearch('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '18px' }}>×</button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Rechercher un client par nom ou téléphone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={inputStyle}
                />
                {customers.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10 }}>
                    {customers.map(c => (
                      <div key={c.id}
                        onClick={() => { setForm({ ...form, customer_id: c.id }); setCustomerSearch(c.full_name) }}
                        style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
                      >
                        <strong>{c.full_name}</strong> — {c.phone}
                      </div>
                    ))}
                    <Link href="/customers/new" style={{ display: 'block', padding: '10px 12px', fontSize: '14px', color: '#6366f1', textDecoration: 'none' }}>
                      + Créer un nouveau client
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Agent + Type de colis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Agent *</label>
              <select
                value={form.agent}
                onChange={e => handleAgentChange(e.target.value as Agent | '')}
                style={inputStyle}
              >
                <option value="">Sélectionner...</option>
                <option value="Nexar">Nexar</option>
                <option value="Partenaire">Partenaire</option>
                <option value="Special">Special</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Type de colis *</label>
              <select
                value={form.package_type}
                onChange={e => setForm({ ...form, package_type: e.target.value as PackageType })}
                disabled={!form.agent}
                style={{ ...inputStyle, opacity: form.agent ? 1 : 0.5 }}
              >
                <option value="">Sélectionner...</option>
                {availableTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description / Nature du colis *</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Vêtements, électronique, chaussures..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Poids + Pièces */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Poids (kg) *</label>
              <input type="number" step="0.1" min="0.1"
                value={form.weight_kg}
                onChange={e => setForm({ ...form, weight_kg: e.target.value })}
                placeholder="0.0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Nombre de pièces</label>
              <input type="number" min="1"
                value={form.pieces}
                onChange={e => setForm({ ...form, pieces: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Montant calculé */}
          {calculatedAmount !== null && form.agent !== 'Special' && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px' }}>
              <span style={{ fontSize: '14px', color: '#15803d', fontWeight: '500' }}>
                Montant calculé : {calculatedAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )}
          {form.agent === 'Special' && calculatedAmount !== null && (
            <div>
              <label style={labelStyle}>Montant à payer (FCFA)</label>
              <input
                type="number"
                min="0"
                value={manualAmount}
                onChange={e => setManualAmount(e.target.value)}
                style={{ ...inputStyle, borderColor: '#86efac', backgroundColor: '#f0fdf4' }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Suggéré : {calculatedAmount.toLocaleString('fr-FR')} FCFA — modifiable librement
              </p>
            </div>
          )}

          {/* Mode de paiement */}
          <div>
            <label style={labelStyle}>Mode de paiement</label>
            <select
              value={form.payment_method}
              onChange={e => setForm({ ...form, payment_method: e.target.value })}
              style={inputStyle}
            >
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="on_delivery">À la livraison</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button type="submit" disabled={loading} style={{
              backgroundColor: '#0f172a', color: 'white', padding: '10px 24px',
              borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Enregistrement...' : 'Enregistrer le colis'}
            </button>
            <button type="button" onClick={() => router.push('/packages')} style={{
              backgroundColor: 'white', color: '#374151', padding: '10px 24px',
              borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', cursor: 'pointer'
            }}>
              Annuler
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
