'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-slate-500 bg-slate-100 rounded p-3 font-mono text-left break-all">
          {error.message || 'Erreur inconnue'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className={buttonVariants({ variant: 'outline' })}
          >
            Réessayer
          </button>
          <Link href="/dashboard" className={buttonVariants()}>
            Retour au dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
