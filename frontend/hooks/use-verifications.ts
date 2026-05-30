import { useCallback, useEffect, useState } from 'react'
import { ref,  onValue, off,update } from 'firebase/database'
import { rtdb } from '@/lib/firebase'

const DEVICE_ID = 'esp32-car-01'

export type Verification = {
  id: string
  imageURL: string
  status: 'authorized' | 'unauthorized' | 'processing' | 'error'
  name: string | null
  confidence: number | null
  action_taken: 'ignored' | 'inspected' | null
  facesDetected: number
  timestamp: Date
}


export async function updateVerificationAction(
  pushId: string,
  action: 'ignored' | 'inspected'
) {
  const alertRef = ref(rtdb, `alerts/esp32cam/${DEVICE_ID}/${pushId}`)
  await update(alertRef, { action_taken: action })
}

export function useVerifications() {
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const parseVerifications = useCallback((data: Record<string, any>): Verification[] => {
    return Object.entries(data)
      .map(([id, d]) => ({
        id,
        imageURL: d.image_url ?? '',
        status: d.status ?? 'processing',
        name: d.results?.name ?? null,
        confidence: d.results?.confidence ?? null,
        facesDetected: d.faces_detected ?? 0,
        action_taken: d.action_taken ?? null,
        timestamp: d.timestamp ? new Date(d.timestamp) : new Date(),
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // newest first
  }, [])

  useEffect(() => {
    const alertsRef = ref(rtdb, `alerts/esp32cam/${DEVICE_ID}`)

    // ✅ Real-time listener — updates automatically when new alerts arrive
    const unsubscribe = onValue(
      alertsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          setVerifications(parseVerifications(data))
        } else {
          setVerifications([])
        }
        setLoading(false)
      },
      (err) => {
        console.error('RTDB error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    // ✅ Cleanup listener on unmount
    return () => off(alertsRef)
  }, [parseVerifications])

  const alerts = verifications.filter((v) => v.status === 'unauthorized')
  const logs = verifications.filter((v) => v.status === 'authorized')

  return { verifications, alerts, logs, loading, error }
}