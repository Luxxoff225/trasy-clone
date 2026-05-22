import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, Phone, Mail, MapPin, MessageCircle, StickyNote } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { ArchiveButton } from '@/components/customers/ArchiveButton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!customer) notFound()

  const { data: packages } = await supabase
    .from('packages')
    .select('*, routes(name)')
    .eq('customer_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux clients
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{customer.full_name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Client depuis le {format(new Date(customer.created_at), 'd MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/customers/${customer.id}/edit`} className={buttonVariants({ variant: 'outline' })}>
              Modifier
            </Link>
            <ArchiveButton customerId={customer.id} customerName={customer.full_name} />
          </div>
        </div>
      </div>

      {/* Infos client */}
      <div className="bg-white rounded-xl border p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Téléphone</p>
            <p className="font-medium">{customer.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MessageCircle className="h-4 w-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">WhatsApp</p>
            <Badge
              variant="outline"
              className={
                customer.whatsapp_enabled
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }
            >
              {customer.whatsapp_enabled ? 'Activé' : 'Désactivé'}
            </Badge>
          </div>
        </div>

        {customer.email && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-medium">{customer.email}</p>
            </div>
          </div>
        )}

        {(customer.city || customer.country) && (
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Localisation</p>
              <p className="font-medium">
                {[customer.city, customer.country].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        )}

        {customer.notes && (
          <div className="flex items-start gap-3 sm:col-span-2">
            <StickyNote className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{customer.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Colis */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Colis ({packages?.length ?? 0})
        </h2>

        <div className="bg-white rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Tracking</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Route</TableHead>
                <TableHead className="font-semibold">Poids</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!packages || packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                    Aucun colis pour ce client
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow key={pkg.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <Link
                        href={`/packages/${pkg.id}`}
                        className="font-mono text-sm font-medium text-slate-900 hover:underline"
                      >
                        {pkg.tracking_number ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{pkg.description}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {(pkg.routes as { name: string } | null)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{pkg.weight_kg} kg</TableCell>
                    <TableCell>
                      <StatusBadge status={pkg.status} />
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-500 text-sm">
                      {format(new Date(pkg.created_at), 'd MMM yyyy', { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
