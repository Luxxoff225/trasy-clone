import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; className: string }> = {
  received:   { label: 'Reçu',       className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200' },
  in_transit: { label: 'En transit', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200' },
  available:  { label: 'Disponible', className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' },
  delivered:  { label: 'Livré',      className: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200' },
  dispute:    { label: 'Litige',     className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: '' }
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}
