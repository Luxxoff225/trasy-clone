'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ArchiveButtonProps {
  customerId: string
  customerName: string
  variant?: 'icon' | 'button'
}

export function ArchiveButton({ customerId, customerName, variant = 'button' }: ArchiveButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleArchive = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('customers')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', customerId)
    setOpen(false)
    router.push('/customers')
    router.refresh()
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Archiver"
        >
          <Archive className="h-4 w-4" />
        </button>
      ) : (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Archiver le client
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver le client</DialogTitle>
            <DialogDescription>
              Voulez-vous archiver <strong>{customerName}</strong> ? Le client
              ne sera plus visible dans la liste mais ses colis resteront accessibles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={loading}>
              {loading ? 'Archivage...' : 'Archiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
