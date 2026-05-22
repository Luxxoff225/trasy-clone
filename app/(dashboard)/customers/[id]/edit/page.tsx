import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import CustomerForm from '@/components/customers/CustomerForm'

export default async function EditCustomerPage({
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/customers/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour au client
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Modifier — {customer.full_name}
        </h1>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <CustomerForm mode="edit" customer={customer} />
      </div>
    </div>
  )
}
