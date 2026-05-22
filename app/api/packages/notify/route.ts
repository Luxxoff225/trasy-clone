import { NextRequest, NextResponse } from 'next/server'
import { sendPackageNotification } from '@/lib/notifications/send'

export async function POST(req: NextRequest) {
  try {
    const { packageId, templateKey } = await req.json()
    await sendPackageNotification(packageId, templateKey)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
