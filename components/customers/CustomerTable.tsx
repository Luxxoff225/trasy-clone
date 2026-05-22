'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArchiveButton } from '@/components/customers/ArchiveButton'
import type { Tables } from '@/types/database'

type Customer = Tables<'customers'>

interface CustomerTableProps {
  customers: Customer[]
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const [search, setSearch] = useState('')

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <Input
        placeholder="Rechercher par nom ou téléphone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm bg-white"
      />

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Nom complet</TableHead>
              <TableHead className="font-semibold">Téléphone</TableHead>
              <TableHead className="font-semibold">WhatsApp</TableHead>
              <TableHead className="font-semibold">Ville</TableHead>
              <TableHead className="font-semibold">Date création</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                  {search ? 'Aucun résultat pour cette recherche' : 'Aucun client pour l\'instant'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium">{customer.full_name}</TableCell>
                  <TableCell className="tabular-nums">{customer.phone}</TableCell>
                  <TableCell>
                    {customer.whatsapp_enabled ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200" variant="outline">
                        Oui
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200" variant="outline">
                        Non
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{customer.city ?? '—'}</TableCell>
                  <TableCell className="tabular-nums text-slate-500">
                    {format(new Date(customer.created_at), 'd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/customers/${customer.id}/edit`}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <ArchiveButton
                        customerId={customer.id}
                        customerName={customer.full_name}
                        variant="icon"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
