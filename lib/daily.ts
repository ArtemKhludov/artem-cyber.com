import DailyIframe from '@daily-co/daily-js'

export const createDailyRoom = async (roomName: string) => {
  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: 'private',
      properties: {
        max_participants: 2,
        enable_screenshare: false,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create Daily room')
  }

  return response.json()
}

export const deleteDailyRoom = async (roomName: string) => {
  const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete Daily room')
  }

  return response.json()
}

export const getDailyMeetingToken = async (roomName: string, userName: string) => {
  const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        is_owner: false,
      },
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create meeting token')
  }

  return response.json()
}

export { DailyIframe }
