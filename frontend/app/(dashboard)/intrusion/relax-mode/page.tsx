'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { relaxModeService } from '@/services/firebase'
import { Clock, Hand, Play, Square, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const durations = [
  { value: '5', label: '5 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
]

export default function RelaxModePage() {
  const [selectedDuration, setSelectedDuration] = useState('15')
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isManualActive, setIsManualActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStopTimer = useCallback(async () => {
    setIsLoading(true)
    try {
      await relaxModeService.deactivate()
      setIsTimerActive(false)
      setTimeRemaining(0)
      toast.success('Relax mode deactivated', {
        description: 'Security monitoring has resumed.',
      })
    } catch {
      toast.error('Failed to deactivate relax mode')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleStopTimer()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerActive, timeRemaining, handleStopTimer])

  const handleStartTimer = async () => {
    setIsLoading(true)
    try {
      await relaxModeService.activateTimeBound(parseInt(selectedDuration))
      setTimeRemaining(parseInt(selectedDuration) * 60)
      setIsTimerActive(true)
      toast.success('Relax mode activated', {
        description: `Security monitoring paused for ${selectedDuration} minutes.`,
      })
    } catch {
      toast.error('Failed to activate relax mode')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualActivate = async () => {
    setIsLoading(true)
    try {
      await relaxModeService.activateManual()
      setIsManualActive(true)
      toast.success('Manual relax mode activated', {
        description: 'Security monitoring has been paused.',
      })
    } catch {
      toast.error('Failed to activate manual mode')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualDeactivate = async () => {
    setIsLoading(true)
    try {
      await relaxModeService.deactivate()
      setIsManualActive(false)
      toast.success('Manual relax mode deactivated', {
        description: 'Security monitoring has resumed.',
      })
    } catch {
      toast.error('Failed to deactivate manual mode')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relax Mode"
        description="Temporarily disable security alerts when near your vehicle"
        showBackButton
        backHref="/intrusion"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Time-bound Mode */}
        <Card className={cn('border-border transition-all', isTimerActive && 'glow border-primary/50')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Time-bound Mode
            </CardTitle>
            <CardDescription>
              Pause security monitoring for a specific duration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timer Display */}
            <div className="relative aspect-square max-w-xs mx-auto">
              <div className={cn(
                'absolute inset-4 rounded-full border-4 flex items-center justify-center',
                isTimerActive ? 'border-primary' : 'border-border'
              )}>
                <div className="text-center">
                  <p className={cn(
                    'text-4xl font-mono font-bold',
                    isTimerActive && 'text-primary'
                  )}>
                    {formatTime(timeRemaining)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isTimerActive ? 'Remaining' : 'Select duration'}
                  </p>
                </div>
              </div>
              {isTimerActive && (
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary/20"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${(timeRemaining / (parseInt(selectedDuration) * 60)) * 283} 283`}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {!isTimerActive && (
                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map((duration) => (
                      <SelectItem key={duration.value} value={duration.value}>
                        {duration.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isTimerActive ? (
                <Button
                  onClick={handleStopTimer}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  {isLoading ? (
                    <Spinner className="mr-2" />
                  ) : (
                    <Square className="mr-2 h-4 w-4" />
                  )}
                  Stop Timer
                </Button>
              ) : (
                <Button
                  onClick={handleStartTimer}
                  disabled={isLoading || isManualActive}
                  className="w-full"
                >
                  {isLoading ? (
                    <Spinner className="mr-2" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Start Timer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Manual Mode */}
        <Card className={cn('border-border transition-all', isManualActive && 'glow border-primary/50')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5 text-primary" />
              Manual Mode
            </CardTitle>
            <CardDescription>
              Manually pause security monitoring with no time limit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Display */}
            <div className="relative aspect-square max-w-xs mx-auto">
              <div className={cn(
                'absolute inset-4 rounded-full border-4 flex items-center justify-center',
                isManualActive ? 'border-primary bg-primary/5' : 'border-border'
              )}>
                <div className="text-center space-y-2">
                  {isManualActive ? (
                    <>
                      <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                      <p className="text-lg font-semibold text-primary">Active</p>
                    </>
                  ) : (
                    <>
                      <Hand className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-lg font-semibold text-muted-foreground">Inactive</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {isManualActive ? (
                <Button
                  onClick={handleManualDeactivate}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  {isLoading ? (
                    <Spinner className="mr-2" />
                  ) : (
                    <Square className="mr-2 h-4 w-4" />
                  )}
                  Deactivate Manual Mode
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={isLoading || isTimerActive}
                      variant="outline"
                      className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Hand className="mr-2 h-4 w-4" />
                      Activate Manual Mode
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Activate Manual Relax Mode?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will pause all security monitoring until you manually deactivate it. 
                        Make sure you are near your vehicle before proceeding.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleManualActivate}>
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Info */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Current Status</p>
              <p className="text-sm text-muted-foreground">
                Security monitoring is {isTimerActive || isManualActive ? 'paused' : 'active'}
              </p>
            </div>
            <div className={cn(
              'h-3 w-3 rounded-full',
              isTimerActive || isManualActive ? 'bg-[oklch(0.8_0.15_80)]' : 'bg-[oklch(0.7_0.18_145)]'
            )} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
