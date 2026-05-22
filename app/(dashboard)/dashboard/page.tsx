/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchAll = async () => {
      const { data: packages } = await supabase
        .from('packages')
        .select('*, customer:customers(full_name)')

      if (!packages) { setLoading(false); return }

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      const startOfLastWeek = new Date(startOfWeek)
      startOfLastWeek.setDate(startOfWeek.getDate() - 7)

      const kgTotal = packages.reduce((s: number, p: any) => s + (p.weight_kg || 0), 0)
      const kgInTransit = packages.filter(p => p.status === 'in_transit').reduce((s: number, p: any) => s + (p.weight_kg || 0), 0)
      const kgAbidjan = packages.filter(p => ['available', 'delivered'].includes(p.status)).reduce((s: number, p: any) => s + (p.weight_kg || 0), 0)
      const kgDelivered = packages.filter(p => p.status === 'delivered').reduce((s: number, p: any) => s + (p.weight_kg || 0), 0)

      const caThisMonth = packages
        .filter(p => new Date(p.created_at) >= startOfMonth)
        .reduce((s: number, p: any) => s + (p.amount_paid || 0), 0)
      const resteAEncaisser = packages
        .filter(p => !['delivered'].includes(p.status))
        .reduce((s: number, p: any) => s + (p.amount_due || 0), 0)

      const litiges = packages.filter(p => p.status === 'dispute').length

      const { data: history } = await supabase
        .from('package_status_history')
        .select('package_id, from_status, to_status, created_at')
        .eq('to_status', 'available')

      let avgDelay = 0
      if (history && history.length > 0) {
        const delays = history.map((h: any) => {
          const pkg = packages.find(p => p.id === h.package_id)
          if (!pkg) return null
          const created = new Date(pkg.created_at)
          const arrived = new Date(h.created_at)
          return (arrived.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        }).filter((d): d is number => d !== null)
        avgDelay = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0
      }

      const statusCounts = {
        received:   packages.filter(p => p.status === 'received').length,
        in_transit: packages.filter(p => p.status === 'in_transit').length,
        available:  packages.filter(p => p.status === 'available').length,
        delivered:  packages.filter(p => p.status === 'delivered').length,
        dispute:    packages.filter(p => p.status === 'dispute').length,
      }

      const kgThisWeek = packages
        .filter(p => new Date(p.created_at) >= startOfWeek)
        .reduce((s: number, p: any) => s + (p.weight_kg || 0), 0)
      const kgLastWeek = packages
        .filter(p => new Date(p.created_at) >= startOfLastWeek && new Date(p.created_at) < startOfWeek)
        .reduce((s: number, p: any) => s + (p.weight_kg || 0), 0)

      const clientCA: Record<string, { name: string; ca: number; colis: number }> = {}
      packages.forEach((p: any) => {
        if (!p.customer_id) return
        if (!clientCA[p.customer_id]) clientCA[p.customer_id] = { name: p.customer?.full_name || '—', ca: 0, colis: 0 }
        clientCA[p.customer_id].ca += p.amount_due || 0
        clientCA[p.customer_id].colis += 1
      })
      const topClients = Object.values(clientCA).sort((a, b) => b.ca - a.ca).slice(0, 5)

      const agentKg: Record<string, number> = {}
      packages.forEach((p: any) => {
        if (!p.agent) return
        agentKg[p.agent] = (agentKg[p.agent] || 0) + (p.weight_kg || 0)
      })
      const topAgents = Object.entries(agentKg).sort((a, b) => b[1] - a[1])

      setData({
        kgTotal, kgInTransit, kgAbidjan, kgDelivered,
        caThisMonth, resteAEncaisser, litiges,
        avgDelay: avgDelay.toFixed(1),
        statusCounts, kgThisWeek, kgLastWeek,
        topClients, topAgents,
      })
      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) return (
    <div style={{ padding: '32px', color: '#94a3b8', fontSize: '14px' }}>Chargement du dashboard...</div>
  )
  if (!data) return null

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
  const weekDiff = data.kgLastWeek > 0 ? ((data.kgThisWeek - data.kgLastWeek) / data.kgLastWeek * 100).toFixed(0) : null

  const statusConfig = [
    { key: 'received',   label: 'Reçu',       color: '#3b82f6', bg: '#dbeafe' },
    { key: 'in_transit', label: 'En transit',  color: '#f59e0b', bg: '#fef3c7' },
    { key: 'available',  label: 'Disponible',  color: '#10b981', bg: '#d1fae5' },
    { key: 'delivered',  label: 'Livré',       color: '#6b7280', bg: '#f3f4f6' },
    { key: 'dispute',    label: 'Litige',      color: '#ef4444', bg: '#fee2e2' },
  ]

  const totalColis = Object.values(data.statusCounts).reduce((a: any, b: any) => a + b, 0) as number

  const DonutChart = () => {
    const radius = 60
    const cx = 80
    const cy = 80
    let startAngle = -90
    const slices = statusConfig.map(s => ({
      ...s,
      count: data.statusCounts[s.key],
      angle: totalColis > 0 ? (data.statusCounts[s.key] / totalColis) * 360 : 0,
    })).filter(s => s.count > 0)

    const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
      const rad = (angle * Math.PI) / 180
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
    }

    const paths = slices.map(slice => {
      const start = polarToCartesian(cx, cy, radius, startAngle)
      const end = polarToCartesian(cx, cy, radius, startAngle + slice.angle - 0.5)
      const largeArc = slice.angle > 180 ? 1 : 0
      const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
      startAngle += slice.angle
      return { ...slice, path }
    })

    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        {paths.map(s => <path key={s.key} d={s.path} fill={s.color} opacity="0.85" />)}
        <circle cx={cx} cy={cy} r={35} fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#0f172a">{totalColis}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#94a3b8">colis</text>
      </svg>
    )
  }

  const Card = ({ title, value, sub, color }: any) => (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: color || '#0f172a' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '24px', color: '#0f172a' }}>Dashboard</h1>

      {/* LIGNE 1 — KG */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <Card title="Kg reçus (total)" value={fmt(data.kgTotal) + ' kg'} />
        <Card title="Kg en transit" value={fmt(data.kgInTransit) + ' kg'} color="#f59e0b" />
        <Card title="Kg arrivés Abidjan" value={fmt(data.kgAbidjan) + ' kg'} color="#10b981" />
        <Card title="Kg récupérés" value={fmt(data.kgDelivered) + ' kg'} color="#6b7280" />
      </div>

      {/* LIGNE 2 — BUSINESS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <Card title="CA ce mois (payé)" value={fmt(data.caThisMonth) + ' FCFA'} color="#6366f1" />
        <Card title="Reste à encaisser" value={fmt(data.resteAEncaisser) + ' FCFA'} color="#f59e0b" />
        <Card title="Délai moyen livraison" value={data.avgDelay + ' jours'} sub="Reçu → Disponible" color={parseFloat(data.avgDelay) > 7 ? '#ef4444' : '#10b981'} />
        <Card title="Colis en litige" value={data.litiges} color={data.litiges > 0 ? '#ef4444' : '#10b981'} sub={data.litiges > 0 ? '⚠️ À traiter' : '✓ Aucun'} />
      </div>

      {/* LIGNE 3 — GRAPHIQUES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Donut statuts */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Répartition par statut</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <DonutChart />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {statusConfig.map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                  <span style={{ color: '#475569' }}>{s.label}</span>
                  <span style={{ fontWeight: '600', marginLeft: 'auto', paddingLeft: '12px' }}>{data.statusCounts[s.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kg semaine */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Kg expédiés — semaine</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Cette semaine</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{fmt(data.kgThisWeek)} kg</div>
              {weekDiff !== null && (
                <div style={{ fontSize: '12px', marginTop: '4px', color: parseFloat(weekDiff) >= 0 ? '#10b981' : '#ef4444' }}>
                  {parseFloat(weekDiff) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(weekDiff))}% vs semaine dernière
                </div>
              )}
            </div>
            <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Semaine dernière</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#94a3b8' }}>{fmt(data.kgLastWeek)} kg</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '50px' }}>
              {[data.kgLastWeek, data.kgThisWeek].map((kg, i) => {
                const max = Math.max(data.kgLastWeek, data.kgThisWeek) || 1
                const height = Math.max((kg / max) * 50, 4)
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '100%', height: height + 'px', backgroundColor: i === 1 ? '#6366f1' : '#e2e8f0', borderRadius: '4px 4px 0 0' }} />
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{i === 0 ? 'S-1' : 'Cette S'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* LIGNE 4 — CLASSEMENTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Top clients */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Top 5 clients par CA</h3>
          {data.topClients.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Aucune donnée</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.topClients.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#475569', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{c.colis} colis</div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#6366f1', flexShrink: 0 }}>{fmt(c.ca)} FCFA</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top agents */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Top agents par kg</h3>
          {data.topAgents.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Aucune donnée</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.topAgents.map(([agent, kg]: [string, number], i: number) => {
                const maxKg = data.topAgents[0][1]
                const pct = maxKg > 0 ? (kg / maxKg) * 100 : 0
                const colors = ['#6366f1', '#10b981', '#f59e0b']
                return (
                  <div key={agent}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                      <span style={{ fontWeight: '500' }}>{agent}</span>
                      <span style={{ color: '#475569' }}>{fmt(kg)} kg</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: pct + '%', backgroundColor: colors[i] || '#94a3b8', borderRadius: '999px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
