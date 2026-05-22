import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendPackageNotification } from '@/lib/notifications/send'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()

    const { data: pkg, error } = await supabase
      .from('packages')
      .insert([{
        customer_id: body.customer_id,
        route_id: body.route_id,
        description: body.description,
        weight_kg: body.weight_kg,
        pieces: body.pieces || 1,
        volume_cm3: body.volume_cm3 || null,
        declared_value: body.declared_value || null,
        agent: body.agent || null,
        package_type: body.package_type || null,
        amount_paid: body.amount_paid || 0,
        amount_due: body.amount_due || 0,
        payment_method: body.payment_method || 'cash',
        status: 'received',
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    sendPackageNotification(pkg.id, 'package_received').catch(console.error)

    return NextResponse.json(pkg)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
