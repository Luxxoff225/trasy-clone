export async function sendSMS(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_SMS_FROM

  if (!accountSid || !authToken || !from) {
    console.log('[DEV] SMS mock à', to, ':', message)
    return { success: true, id: 'mock-sms-' + Date.now() }
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: message,
        }),
      }
    )
    const data = await response.json()
    if (data.error_code) {
      return { success: false, id: '', error: data.message }
    }
    return { success: true, id: data.sid }
  } catch (err: unknown) {
    return { success: false, id: '', error: (err as Error).message }
  }
}
