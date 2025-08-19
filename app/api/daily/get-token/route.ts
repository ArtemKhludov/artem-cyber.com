import { NextRequest, NextResponse } from 'next/server'
import { getDailyMeetingToken } from '@/lib/daily'

export async function POST(request: NextRequest) {
  try {
    const { roomName, userName } = await request.json()

    if (!roomName || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const tokenData = await getDailyMeetingToken(roomName, userName)

    return NextResponse.json({
      token: tokenData.token,
    })

  } catch (error) {
    console.error('Daily token creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create meeting token' },
      { status: 500 }
    )
  }
}
