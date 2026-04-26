import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return NextResponse.json({ 
    success: false, 
    error: 'OTP verification has been removed from this application' 
  }, { status: 410 })
}
