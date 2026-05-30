import { ref, set, get, onChildAdded, off } from 'firebase/database'
import { rtdb } from '@/lib/firebase'

const DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID ?? 'esp32-car-01'

// Auth service
export const authService = {
  login: async (email: string, password: string): Promise<{ success: boolean; user?: { email: string; name: string } }> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (email === 'admin@carguard.io' && password === 'password') {
      return { success: true, user: { email, name: 'Admin User' } }
    }
    if (email && password.length >= 6) {
      return { success: true, user: { email, name: email.split('@')[0] } }
    }
    return { success: false }
  },

  logout: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500))
  },

  getCurrentUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('carguard_user')
      return user ? JSON.parse(user) : null
    }
    return null
  },
}

// Alerts service
export const alertsService = {
  getAlerts: async () => {
    const { mockAlerts } = await import('@/lib/mock-data')
    return mockAlerts
  },

  getAlertById: async (id: string) => {
    const { mockAlerts } = await import('@/lib/mock-data')
    return mockAlerts.find(a => a.id === id)
  },

  ignoreAlert: async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true }
  },
}

// Daily logs service
export const dailyLogsService = {
  getLogs: async () => {
    const { mockDailyLogs } = await import('@/lib/mock-data')
    return mockDailyLogs
  },
}

// Drowsiness service
export const drowsinessService = {
  getAlerts: async () => {
    const snapshot = await get(ref(rtdb, `alerts/drowsiness/${DEVICE_ID}`))
    if (!snapshot.exists()) return []

    const data = snapshot.val()
    return Object.entries(data)
      .map(([id, val]: [string, any]) => ({ id, ...val }))
      .sort((a, b) => b.timestamp - a.timestamp)
  },

  getStats: async () => {
    const alerts = await drowsinessService.getAlerts()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    return {
      totalAlerts: alerts.length,
      alertsToday: alerts.filter(a => a.timestamp >= todayStart.getTime()).length,
    }
  },

  subscribeToAlerts: (
    onAlert: (alert: {
      id: string
      deviceId: string
      is_drowsy: boolean
      timestamp: number
      speed: number
    }) => void
  ): (() => void) => {
    const alertsRef = ref(rtdb, `alerts/drowsiness/${DEVICE_ID}`)

    const handler = onChildAdded(alertsRef, (snapshot) => {
      const val = snapshot.val()
      if (val?.is_drowsy === true) {
        onAlert({ id: snapshot.key!, deviceId: DEVICE_ID, ...val })
      }
    })

    return () => off(alertsRef, 'child_added', handler)
  },
}

// Live inspection service — real Firebase RTDB calls
export const liveInspectionService = {
  captureImage: async (): Promise<{ success: boolean; imageUrl: string }> => {
    const captureRef = ref(rtdb, `data/esp32cam/${DEVICE_ID}/lastCapture`)

    // ✅ Step 1: Clear old data BEFORE triggering
    await set(captureRef, null)

    // ✅ Step 2: THEN trigger the ESP32
    await set(ref(rtdb, `commands/esp32cam/${DEVICE_ID}/click`), true)

    const maxAttempts = 15

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1000))

      const snapshot = await get(captureRef)

      if (snapshot.exists()) {
        const data = snapshot.val()

        // ✅ Step 3: Capture result before clearing
        const result = {
          success: true,
          imageUrl: data.imageUrl,
        }
        return result
      }
    }

    return { success: false, imageUrl: '' }
  },

  triggerBuzzer: async (): Promise<{ success: boolean }> => {
    await set(ref(rtdb, `commands/esp32dev/${DEVICE_ID}/buzzer`), 'on')
    return { success: true }
  },
}



// Relax mode service
export const relaxModeService = {
  activateTimeBound: async (durationMinutes: number): Promise<{ success: boolean }> => {
    await set(ref(rtdb, `commands/esp32dev/${DEVICE_ID}/relax`), {
      status: 'on',
      type: 'timer',
      time: durationMinutes,
    })
    return { success: true }
  },

  activateManual: async (): Promise<{ success: boolean }> => {
    await set(ref(rtdb, `commands/esp32dev/${DEVICE_ID}/relax`), {
      status: 'on',
      type: 'relax',
      time: null,
    })
    return { success: true }
  },

  deactivate: async (): Promise<{ success: boolean }> => {
    await set(ref(rtdb, `commands/esp32dev/${DEVICE_ID}/relax`), {
      status: 'off',
      type: null,
      time: null,
    })
    return { success: true }
  },
}

