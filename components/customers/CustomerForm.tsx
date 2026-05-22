/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

interface CustomerFormProps {
  mode: 'create' | 'edit'
  customer?: any
}

export default function CustomerForm({ mode, customer }: CustomerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
    whatsapp_enabled: customer?.whatsapp_enabled ?? true,
    email: customer?.email || '',
    city: customer?.city || '',
    country: customer?.country || "Côte d'Ivoire",
    address: customer?.address || '',
    notes: customer?.notes || '',
  })

  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!form.full_name || form.full_name.length < 2) {
      setError('Le nom doit contenir au moins 2 caractères')
      setLoading(false)
      return
    }
    if (!form.phone) {
      setError('Le téléphone est obligatoire')
      setLoading(false)
      return
    }

    // Vérification doublon
    if (mode === 'create') {
      const { data: existing } = await supabaseRef.current
        .from('customers')
        .select('id, full_name')
        .eq('phone', form.phone)
        .single()
      if (existing) {
        setError(`Ce numéro existe déjà : ${existing.full_name}`)
        setLoading(false)
        return
      }
    }

    if (mode === 'create') {
      const { error: err } = await supabaseRef.current.from('customers').insert([form])
      if (err) {
        setError('Erreur lors de la création : ' + err.message)
        setLoading(false)
        return
      }
      setSuccess('✅ Client créé avec succès !')
      setTimeout(() => router.push('/customers'), 1500)
    } else {
      const { error: err } = await supabaseRef.current
        .from('customers')
        .update(form)
        .eq('id', customer.id)
      if (err) {
        setError('Erreur lors de la modification : ' + err.message)
        setLoading(false)
        return
      }
      setSuccess('✅ Client modifié avec succès !')
      setTimeout(() => router.push('/customers'), 1500)
    }
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
  }

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '6px',
    color: '#374151',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '600px' }}>
      <Link href="/customers" style={{ color: '#6366f1', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginBottom: '24px' }}>
        ← Retour aux clients
      </Link>

      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px' }}>
        {mode === 'create' ? 'Nouveau client' : 'Modifier le client'}
      </h1>

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

          <div>
            <label style={labelStyle}>Nom complet *</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Jean Kouamé" style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Téléphone *</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="+2250700000000" style={inputStyle} required />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="whatsapp"
              checked={form.whatsapp_enabled}
              onChange={(e) => setForm({ ...form, whatsapp_enabled: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="whatsapp" style={{ fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              WhatsApp activé (notifs via WhatsApp)
            </label>
          </div>

          <div>
            <label style={labelStyle}>Email (optionnel)</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="client@email.com" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Ville</label>
              <input name="city" value={form.city} onChange={handleChange} placeholder="Abidjan" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Pays</label>
              <input name="country" value={form.country} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Adresse (optionnel)</label>
            <input name="address" value={form.address} onChange={handleChange} placeholder="Cocody, Rue des Jardins" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Notes (optionnel)</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Informations complémentaires..." rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button type="submit" disabled={loading} style={{
              backgroundColor: '#0f172a', color: 'white', padding: '10px 24px',
              borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Enregistrement...' : mode === 'create' ? 'Créer le client' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => router.push('/customers')} style={{
              backgroundColor: 'white', color: '#374151', padding: '10px 24px',
              borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px',
              cursor: 'pointer'
            }}>
              Annuler
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
