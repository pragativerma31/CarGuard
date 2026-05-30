// 'use client'

// import { useState, useMemo } from 'react'
// import Image from 'next/image'
// import { useRouter } from 'next/navigation'
// import { PageHeader } from '@/components/page-header'
// import { StatsCard } from '@/components/stats-card'
// import { ImageModal } from '@/components/image-modal'
// import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table'
// import { useVerifications, type Verification , updateVerificationAction } from '@/hooks/use-verifications'
// import { useSensorAlerts, updateSensorAlertAction } from '@/hooks/use-sensor-alerts'
// import { format } from 'date-fns'
// import { Bell, XCircle, AlertTriangle, Eye, EyeOff, Loader2, PersonStanding, Search } from 'lucide-react'
// import { cn } from '@/lib/utils'
// import { toast } from 'sonner'

// export default function AlertsPage() {
//   const router = useRouter()
//   const { alerts, loading, error } = useVerifications()
//   const { sensorAlerts, loading: sensorLoading } = useSensorAlerts()
//   const [selectedAlert, setSelectedAlert] = useState<Verification | null>(null)

//   const allAlerts = useMemo(() => {
//     const faceRows = alerts.map((a) => ({
//       id: a.id,
//       imageURL: a.imageURL,
//       name: a.name ?? 'Unknown',
//       description: `Faces detected: ${a.facesDetected}`,
//       timestamp: a.timestamp,
//       isSensor: false,
//       riskLevel: null,
//       action_taken: a.action_taken,
//       raw: a,
//     }))

//     const sensorRows = sensorAlerts.map((a) => ({
//       id: a.id,
//       imageURL: null,
//       name: a.deviceId,
//       description: a.risk_type,
//       timestamp: a.timestamp,
//       isSensor: true,
//       riskLevel: a.riskLevel,
//       action_taken: a.action_taken,
//       raw: null,
//     }))

//     return [...faceRows, ...sensorRows].sort(
//       (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
//     )
//   }, [alerts, sensorAlerts])

//   const handleIgnore = async (id: string, isSensor: boolean) => {
//     try {
//       if (isSensor) {
//         await updateSensorAlertAction(id, 'ignored')
//       } else {
//         await updateVerificationAction(id, 'ignored')
//       }
//       toast.success('Alert ignored')
//       router.push('/intrusion/relax-mode')
//     } catch (err) {
//       toast.error('Failed to update alert')
//     }
//   }

//   const handleInspect = async (id: string, isSensor: boolean) => {
//     try {
//       if (isSensor) {
//         await updateSensorAlertAction(id, 'inspected')
//       } else {
//         await updateVerificationAction(id, 'inspected')
//       }
//       toast.success('Opening Live Inspection')
//       router.push('/intrusion/live-inspection')
//     } catch (err) {
//       toast.error('Failed to update alert')
//     }
//   }

//   if (loading || sensorLoading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//       </div>
//     )
//   }

//   if (error) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <p className="text-destructive">Failed to load alerts: {error}</p>
//       </div>
//     )
//   }

//   const ignoredCount = allAlerts.filter((a) => a.action_taken === 'ignored').length

//   return (
//     <div className="space-y-8">
//       <PageHeader
//         title="Alerts"
//         description="View and manage all intrusion alerts"
//         showBackButton
//         backHref="/intrusion"
//       />

//       <div className="grid gap-4 sm:grid-cols-3">
//         <StatsCard
//           title="Total Alerts"
//           value={allAlerts.length}
//           icon={Bell}
//           variant="accent"
//         />
//         <StatsCard
//           title="Ignored Alerts"
//           value={ignoredCount}
//           icon={XCircle}
//           variant="default"
//         />
//         <StatsCard
//           title="Unauthorized Attempts"
//           value={alerts.length}
//           icon={AlertTriangle}
//           variant="destructive"
//         />
//       </div>

//       <Card className="border-border">
//         <CardHeader>
//           <CardTitle>Unauthorized Access Attempts</CardTitle>
//         </CardHeader>
//         <CardContent>
//           {allAlerts.length === 0 ? (
//             <div className="flex items-center justify-center h-32 text-muted-foreground">
//               No unauthorized attempts detected
//             </div>
//           ) : (
//             <div className="overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead className="w-24">Image</TableHead>
//                     <TableHead className="w-1/2">Description</TableHead>
//                     <TableHead className="w-48">Date & Time</TableHead>
//                     <TableHead className="w-48 text-right">Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {allAlerts.map((alert, index) => (
//                     <TableRow
//                       key={alert.id}
//                       className={cn(
//                         'transition-colors',
//                         alert.action_taken === 'ignored' && 'opacity-50'
//                       )}
//                     >
//                       <TableCell className="w-24">
//                         {alert.imageURL ? (
//                           <button
//                             onClick={() => alert.raw && setSelectedAlert(alert.raw)}
//                             className="relative h-16 w-24 overflow-hidden rounded-md bg-secondary transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary"
//                           >
//                             <Image
//                               src={alert.imageURL}
//                               alt="Intruder"
//                               fill
//                               sizes="96px"
//                               priority={index === 0}
//                               className="object-cover"
//                             />
//                           </button>
//                         ) : (
//                           <div className="flex h-16 w-24 items-center justify-center rounded-md bg-secondary">
//                             {alert.isSensor ? (
//                               alert.riskLevel === 'CRITICAL' ? (
//                                 <div className="flex flex-col items-center gap-1">
//                                   <AlertTriangle className="h-7 w-7 text-destructive" />
//                                   <span className="text-[10px] text-destructive font-medium">CRITICAL</span>
//                                 </div>
//                               ) : (
//                                 <div className="flex flex-col items-center gap-1">
//                                   <PersonStanding className="h-7 w-7 text-yellow-500" />
//                                   <span className="text-[10px] text-yellow-500 font-medium">HIGH</span>
//                                 </div>
//                               )
//                             ) : (
//                               <span className="text-xs text-muted-foreground">No image</span>
//                             )}
//                           </div>
//                         )}
//                       </TableCell>
//                       <TableCell className="w-1/2">
//                         <p className="truncate text-sm">{alert.description}</p>
//                       </TableCell>
//                       <TableCell className="w-48">
//                         <div className="text-sm">
//                           <p>{format(alert.timestamp, 'MMM d, yyyy')}</p>
//                           <p className="text-muted-foreground">
//                             {format(alert.timestamp, 'HH:mm:ss')}
//                           </p>
//                         </div>
//                       </TableCell>
//                       <TableCell className="w-48 text-right">
//                         {alert.action_taken ? (
//                           <Badge
//                             variant="outline"
//                             className={cn(
//                               'capitalize',
//                               alert.action_taken === 'ignored'
//                                 ? 'bg-muted text-muted-foreground border-muted-foreground/30'
//                                 : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
//                             )}
//                           >
//                             {alert.action_taken === 'ignored' ? (
//                               <span className="flex items-center gap-1">
//                                 <EyeOff className="h-3 w-3" /> Ignored
//                               </span>
//                             ) : (
//                               <span className="flex items-center gap-1">
//                                 <Search className="h-3 w-3" /> Inspected
//                               </span>
//                             )}
//                           </Badge>
//                         ) : alert.isSensor ? (
//                           <div className="flex items-center justify-end gap-2">
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={() => handleIgnore(alert.id , alert.isSensor)}
//                               className="text-muted-foreground hover:text-foreground gap-1.5"
//                             >
//                               <EyeOff className="h-4 w-4" />
//                               Ignore
//                             </Button>
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               onClick={() => handleInspect(alert.id , alert.isSensor)}
//                               className="gap-1.5"
//                             >
//                               <Search className="h-4 w-4" />
//                               Inspect
//                             </Button>
//                           </div>
//                         ) : (
//                           <span className="text-xs text-muted-foreground">—</span>
//                         )}
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {selectedAlert && (
//         <ImageModal
//           isOpen={!!selectedAlert}
//           onClose={() => setSelectedAlert(null)}
//           imageUrl={selectedAlert.imageURL}
//           title={selectedAlert.name ?? 'Unknown intruder'}
//           timestamp={selectedAlert.timestamp}
//           type="intrusion"
//           description={`Faces detected: ${selectedAlert.facesDetected}`}
//         />
//       )}
//     </div>
//   )
// }

'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { StatsCard } from '@/components/stats-card'
import { ImageModal } from '@/components/image-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useVerifications, type Verification, updateVerificationAction } from '@/hooks/use-verifications'
import { useSensorAlerts, updateSensorAlertAction } from '@/hooks/use-sensor-alerts'
import { format } from 'date-fns'
import { Bell, XCircle, AlertTriangle, EyeOff, Loader2, PersonStanding, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function AlertsPage() {
  const router = useRouter()
  const { alerts, loading, error } = useVerifications()
  const { sensorAlerts, loading: sensorLoading } = useSensorAlerts()
  const [selectedAlert, setSelectedAlert] = useState<Verification | null>(null)

  const allAlerts = useMemo(() => {
    const faceRows = alerts.map((a) => ({
      id: a.id,
      imageURL: a.imageURL,
      name: a.name ?? 'Unknown',
      description: `Faces detected: ${a.facesDetected}`,
      timestamp: a.timestamp,
      isSensor: false,
      riskLevel: null,
      action_taken: a.action_taken,
      raw: a,
    }))

    const sensorRows = sensorAlerts.map((a) => ({
      id: a.id,
      imageURL: null,
      name: a.deviceId,
      description: a.risk_type,
      timestamp: a.timestamp,
      isSensor: true,
      riskLevel: a.riskLevel,
      action_taken: a.action_taken,
      raw: null,
    }))

    return [...faceRows, ...sensorRows].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )
  }, [alerts, sensorAlerts])

  const handleIgnore = async (id: string, isSensor: boolean) => {
    try {
      if (isSensor) {
        await updateSensorAlertAction(id, 'ignored')
      } else {
        await updateVerificationAction(id, 'ignored')
      }
      toast.success('Alert ignored')
      router.push('/intrusion/relax-mode')
    } catch (err) {
      toast.error('Failed to update alert')
    }
  }

  const handleInspect = async (id: string, isSensor: boolean) => {
    try {
      if (isSensor) {
        await updateSensorAlertAction(id, 'inspected')
      } else {
        await updateVerificationAction(id, 'inspected')
      }
      toast.success('Opening Live Inspection')
      router.push('/intrusion/live-inspection')
    } catch (err) {
      toast.error('Failed to update alert')
    }
  }

  if (loading || sensorLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load alerts: {error}</p>
      </div>
    )
  }

  const ignoredCount = allAlerts.filter((a) => a.action_taken === 'ignored').length

  return (
    <div className="space-y-8">
      <PageHeader
        title="Alerts"
        description="View and manage all intrusion alerts"
        showBackButton
        backHref="/intrusion"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Alerts"
          value={allAlerts.length}
          icon={Bell}
          variant="accent"
        />
        <StatsCard
          title="Ignored Alerts"
          value={ignoredCount}
          icon={XCircle}
          variant="default"
        />
        <StatsCard
          title="Unauthorized Attempts"
          value={alerts.length}
          icon={AlertTriangle}
          variant="destructive"
        />
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Unauthorized Access Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {allAlerts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No unauthorized attempts detected
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Image</TableHead>
                    <TableHead className="w-1/2">Description</TableHead>
                    <TableHead className="w-48">Date & Time</TableHead>
                    <TableHead className="w-48 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAlerts.map((alert, index) => (
                    <TableRow
                      key={alert.id}
                      className={cn(
                        'transition-colors',
                        alert.action_taken === 'ignored' && 'opacity-50'
                      )}
                    >
                      <TableCell className="w-24">
                        {alert.imageURL ? (
                          <button
                            onClick={() => alert.raw && setSelectedAlert(alert.raw)}
                            className="relative h-16 w-24 overflow-hidden rounded-md bg-secondary transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <Image
                              src={alert.imageURL}
                              alt="Intruder"
                              fill
                              sizes="96px"
                              priority={index === 0}
                              className="object-cover"
                            />
                          </button>
                        ) : (
                          <div className="flex h-16 w-24 items-center justify-center rounded-md bg-secondary">
                            {alert.isSensor ? (
                              alert.riskLevel === 'CRITICAL' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <AlertTriangle className="h-7 w-7 text-destructive" />
                                  <span className="text-[10px] text-destructive font-medium">CRITICAL</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <PersonStanding className="h-7 w-7 text-yellow-500" />
                                  <span className="text-[10px] text-yellow-500 font-medium">HIGH</span>
                                </div>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">No image</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="w-1/2">
                        <p className="truncate text-sm">{alert.description}</p>
                      </TableCell>
                      <TableCell className="w-48">
                        <div className="text-sm">
                          <p>{format(alert.timestamp, 'MMM d, yyyy')}</p>
                          <p className="text-muted-foreground">
                            {format(alert.timestamp, 'HH:mm:ss')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="w-48 text-right">
                        {alert.action_taken ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'capitalize',
                              alert.action_taken === 'ignored'
                                ? 'bg-muted text-muted-foreground border-muted-foreground/30'
                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            )}
                          >
                            {alert.action_taken === 'ignored' ? (
                              <span className="flex items-center gap-1">
                                <EyeOff className="h-3 w-3" /> Ignored
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Search className="h-3 w-3" /> Inspected
                              </span>
                            )}
                          </Badge>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleIgnore(alert.id, alert.isSensor)}
                              className="text-muted-foreground hover:text-foreground gap-1.5"
                            >
                              <EyeOff className="h-4 w-4" />
                              Ignore
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInspect(alert.id, alert.isSensor)}
                              className="gap-1.5"
                            >
                              <Search className="h-4 w-4" />
                              Inspect
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAlert && (
        <ImageModal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          imageUrl={selectedAlert.imageURL}
          title={selectedAlert.name ?? 'Unknown intruder'}
          timestamp={selectedAlert.timestamp}
          type="intrusion"
          description={`Faces detected: ${selectedAlert.facesDetected}`}
        />
      )}
    </div>
  )
}