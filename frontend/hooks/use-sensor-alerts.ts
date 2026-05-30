// import { useCallback, useEffect, useState } from 'react'
// import { ref, get, child } from 'firebase/database'
// import { rtdb } from '@/lib/firebase'

// const DEVICE_ID = 'esp32-car-01'

// export type SensorAlert = {
//   id: string
//   deviceId: string
//   riskLevel: 'HIGH' | 'CRITICAL'
//   risk_type: string
//   timestamp: Date
// }

// export function useSensorAlerts() {
//   const [sensorAlerts, setSensorAlerts] = useState<SensorAlert[]>([])
//   const [loading, setLoading] = useState(true)
//   const [refreshing, setRefreshing] = useState(false)
//   const [error, setError] = useState<string | null>(null)

//   const fetchAlerts = useCallback(async (isRefresh = false) => {
//     if (isRefresh) setRefreshing(true)
//     else setLoading(true)

//     try {
//       const alertsRef = ref(rtdb, `alerts/intrusion/${DEVICE_ID}`)
//       const snapshot = await get(alertsRef)

//       if (!snapshot.exists()) {
//         setSensorAlerts([])
//         return
//       }

//       const data = snapshot.val()
//       const alerts: SensorAlert[] = []

//       Object.entries(data).forEach(([pushId, alert]: [string, any]) => {
//         const riskType = alert.risk_type ?? ''
//         const riskLevel = riskType === 'suspicious activity' ? 'CRITICAL' : 'HIGH'

//         alerts.push({
//           id: pushId,
//           deviceId: DEVICE_ID,
//           riskLevel,
//           risk_type: riskType,
//           timestamp: alert.timestamp ? new Date(alert.timestamp) : new Date(),
//         })
//       })

//       // Sort newest first
//       alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
//       setSensorAlerts(alerts)
//     } catch (err: any) {
//       console.error('RTDB error:', err)
//       setError(err.message)
//     } finally {
//       setLoading(false)
//       setRefreshing(false)
//     }
//   }, [])

//   useEffect(() => {
//     fetchAlerts()
//   }, [fetchAlerts])

//   const refresh = () => fetchAlerts(true)

//   return { sensorAlerts, loading, refreshing, error, refresh }
// }

import { useCallback, useEffect, useRef, useState } from 'react'
import { ref, onValue, off ,update} from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { toast } from 'sonner'

const DEVICE_ID = 'esp32-car-01'

export type SensorAlert = {
  id: string
  deviceId: string
  riskLevel: 'HIGH' | 'CRITICAL'
  risk_type: string
  timestamp: Date
  action_taken: 'ignored' | 'inspected' | null

}
export async function updateSensorAlertAction(
  pushId: string,
  action: 'ignored' | 'inspected'
) {
  const alertRef = ref(rtdb, `alerts/intrusion/${DEVICE_ID}/${pushId}`)
  await update(alertRef, { action_taken: action })
}
export function useSensorAlerts() {
  const [sensorAlerts, setSensorAlerts] = useState<SensorAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const knownIds = useRef<Set<string>>(new Set())
  const isFirstLoad = useRef(true)

  useEffect(() => {
    const alertsRef = ref(rtdb, `alerts/intrusion/${DEVICE_ID}`)

    const unsubscribe = onValue(
      alertsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSensorAlerts([])
          setLoading(false)
          isFirstLoad.current = false
          return
        }

        const data = snapshot.val()
        const alerts: SensorAlert[] = []

        Object.entries(data).forEach(([pushId, alert]: [string, any]) => {
          const riskType = alert.risk_type ?? ''
          const riskLevel: 'HIGH' | 'CRITICAL' = riskType === 'suspicious activity' ? 'CRITICAL' : 'HIGH'

          alerts.push({
            id: pushId,
            deviceId: DEVICE_ID,
            riskLevel,
            risk_type: riskType,
            timestamp: alert.timestamp ? new Date(alert.timestamp) : new Date(),
            action_taken: alert.action_taken ?? null,
          })

          // Toast only for new alerts after first load
          if (!isFirstLoad.current && !knownIds.current.has(pushId)) {
            toast.warning(
              riskLevel === 'CRITICAL'
                ? `🚨 Critical alert: ${riskType}`
                : `⚠️ High alert: ${riskType}`,
              { duration: 5000 }
            )
          }

          knownIds.current.add(pushId)
        })

        alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        setSensorAlerts(alerts)
        setLoading(false)
        isFirstLoad.current = false
      },
      (err) => {
        console.error('RTDB error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => off(alertsRef)
  }, [])

  return { sensorAlerts, loading, refreshing: false, error, refresh: () => {} }
}