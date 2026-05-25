import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from './whatsapp'
import { sendSMS } from './sms'

export async function sendPackageNotification(packageId: string, templateKey: string) {
  console.log('[NOTIF] Début sendPackageNotification', packageId, templateKey)

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('*, customer:customers(*), route:routes(*)')
      .eq('id', packageId)
      .single()

    if (pkgError) {
      console.error('[NOTIF] Erreur fetch package:', pkgError)
      return
    }
    if (!pkg) {
      console.error('[NOTIF] Package introuvable:', packageId)
      return
    }

    console.log('[NOTIF] Package trouvé:', pkg.tracking_number)
    console.log('[NOTIF] Client:', pkg.customer?.full_name, pkg.customer?.phone)
    console.log('[NOTIF] WhatsApp enabled:', pkg.customer?.whatsapp_enabled)

    const channel = pkg.customer.whatsapp_enabled ? 'whatsapp' : 'sms'

    const { data: template, error: tplError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('key', templateKey)
      .eq('channel', channel)
      .eq('language', 'fr')
      .single()

    if (tplError || !template) {
      console.error('[NOTIF] Template introuvable:', templateKey, channel, tplError)

      // Essaie avec l'autre channel
      const altChannel = channel === 'whatsapp' ? 'sms' : 'whatsapp'
      const { data: altTemplate } = await supabase
        .from('message_templates')
        .select('*')
        .eq('key', templateKey)
        .eq('channel', altChannel)
        .eq('language', 'fr')
        .single()

      if (!altTemplate) {
        console.error('[NOTIF] Aucun template trouvé pour:', templateKey)
        return
      }
      console.log('[NOTIF] Template alternatif trouvé:', altChannel)
    }

    const finalTemplate = template || null
    if (!finalTemplate) return

    const statusMap: Record<string, string> = {
      received: 'Reçu',
      in_transit: 'En transit',
      available: 'Disponible',
      delivered: 'Livré',
      dispute: 'Litige',
    }

    const message = finalTemplate.body
      .replace('{nom}', pkg.customer.full_name)
      .replace('{tracking}', pkg.tracking_number)
      .replace('{poids}', pkg.weight_kg + ' kg')
      .replace('{statut}', statusMap[pkg.status] || pkg.status)
      .replace('{montant_a_payer}', pkg.amount_due + ' ' + (pkg.route?.currency || 'XOF'))
      .replace('{nature_colis}', pkg.description)

    console.log('[NOTIF] Message préparé:', message)
    console.log('[NOTIF] Envoi vers:', pkg.customer.phone)

    let result
    if (pkg.customer.whatsapp_enabled) {
      console.log('[NOTIF] Tentative WhatsApp...')
      result = await sendWhatsApp(pkg.customer.phone, message)
      console.log('[NOTIF] Résultat WhatsApp:', result)
      if (!result.success) {
        console.log('[NOTIF] WhatsApp échoué, fallback SMS...')
        result = await sendSMS(pkg.customer.phone, message)
        console.log('[NOTIF] Résultat SMS:', result)
      }
    } else {
      console.log('[NOTIF] Envoi SMS direct...')
      result = await sendSMS(pkg.customer.phone, message)
      console.log('[NOTIF] Résultat SMS:', result)
    }

    const { error: insertError } = await supabase.from('notifications').insert({
      package_id: packageId,
      channel: pkg.customer.whatsapp_enabled ? 'whatsapp' : 'sms',
      recipient_phone: pkg.customer.phone,
      message,
      status: result.success ? 'sent' : 'failed',
      provider_message_id: result.id || null,
      error: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
    })

    if (insertError) {
      console.error('[NOTIF] Erreur insert notification:', insertError)
    } else {
      console.log('[NOTIF] Notification insérée avec succès, status:', result.success ? 'sent' : 'failed')
    }

  } catch (err) {
    console.error('[NOTIF] Erreur globale:', err)
  }
}
