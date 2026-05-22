import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from './whatsapp'
import { sendSMS } from './sms'

export async function sendPackageNotification(packageId: string, templateKey: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: pkg } = await supabase
    .from('packages')
    .select('*, customer:customers(*), route:routes(*)')
    .eq('id', packageId)
    .single()

  if (!pkg) return

  const channel = pkg.customer.whatsapp_enabled ? 'whatsapp' : 'sms'

  const { data: template } = await supabase
    .from('message_templates')
    .select('*')
    .eq('key', templateKey)
    .eq('channel', channel)
    .eq('language', 'fr')
    .single()

  if (!template) return

  const statusMap: Record<string, string> = {
    received: 'Reçu',
    in_transit: 'En transit',
    available: 'Disponible',
    delivered: 'Livré',
    dispute: 'Litige',
  }

  const message = template.body
    .replace('{nom}', pkg.customer.full_name)
    .replace('{tracking}', pkg.tracking_number)
    .replace('{poids}', pkg.weight_kg + ' kg')
    .replace('{statut}', statusMap[pkg.status] || pkg.status)
    .replace('{montant_a_payer}', pkg.amount_due + ' ' + (pkg.route?.currency || 'XOF'))
    .replace('{nature_colis}', pkg.description)

  let result
  if (pkg.customer.whatsapp_enabled) {
    result = await sendWhatsApp(pkg.customer.phone, message)
    if (!result.success) {
      result = await sendSMS(pkg.customer.phone, message)
    }
  } else {
    result = await sendSMS(pkg.customer.phone, message)
  }

  await supabase.from('notifications').insert({
    package_id: packageId,
    channel: result.success ? channel : 'sms',
    recipient_phone: pkg.customer.phone,
    message,
    status: result.success ? 'sent' : 'failed',
    provider_message_id: result.id || null,
    error: result.error || null,
    sent_at: result.success ? new Date().toISOString() : null,
  })
}
