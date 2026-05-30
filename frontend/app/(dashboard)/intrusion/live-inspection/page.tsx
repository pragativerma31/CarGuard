'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PageHeader } from '@/components/page-header'
import { ImageModal } from '@/components/image-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { liveInspectionService } from '@/services/firebase'
import { Camera, Volume2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LiveInspectionPage() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isTriggering, setIsTriggering] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleCaptureImage = async () => {
    setIsCapturing(true)
    try {
      const result = await liveInspectionService.captureImage()
      if (result.success) {
        console.log('CAPTURE RESULT:', result)
        setCapturedImage(result.imageUrl)
        setShowModal(true)
        toast.success('Image captured successfully', {
          description: 'The image has been saved to alerts.',
        })
      }
    } catch {
      toast.error('Failed to capture image', {
        description: 'Please try again.',
      })
    } finally {
      setIsCapturing(false)
    }
  }

  const handleTriggerBuzzer = async () => {
    setIsTriggering(true)
    try {
      const result = await liveInspectionService.triggerBuzzer()
      
      if (result.success) {
        toast.success('Buzzer activated', {
          description: 'The vehicle buzzer has been triggered.',
          icon: <Volume2 className="h-4 w-4" />,
        })
      }
    } catch {
      toast.error('Failed to trigger buzzer', {
        description: 'Please try again.',
      })
    } finally {
      setIsTriggering(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Live Inspection"
        description="Capture real-time images and control vehicle alerts"
        showBackButton
        backHref="/intrusion"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Capture Image Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Capture Image
            </CardTitle>
            <CardDescription>
              Take a real-time snapshot from the vehicle camera to check the current state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary">
              {capturedImage ? (
                <Image
                  src={capturedImage}
                  alt="Captured image"
                  fill
                  className="object-cover cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setShowModal(true)}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-2">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No image captured yet
                    </p>
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={handleCaptureImage}
              disabled={isCapturing}
              className="w-full"
            >
              {isCapturing ? (
                <>
                  <Spinner className="mr-2" />
                  Capturing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Trigger Buzzer Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              Trigger Buzzer
            </CardTitle>
            <CardDescription>
              Activate the vehicle buzzer to alert nearby individuals or deter intruders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary">
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-4">
                  <div className={`p-6 rounded-full mx-auto w-fit transition-all ${isTriggering ? 'bg-primary/20 animate-pulse' : 'bg-secondary'}`}>
                    <Volume2 className={`h-12 w-12 ${isTriggering ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isTriggering ? 'Buzzer is active...' : 'Ready to activate'}
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={handleTriggerBuzzer}
              disabled={isTriggering}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {isTriggering ? (
                <>
                  <Spinner className="mr-2" />
                  Activating...
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Activate Buzzer
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Image Modal */}
      {capturedImage && (
        <ImageModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          imageUrl={capturedImage}
          title="Live Capture"
          timestamp={new Date()}
          description="Real-time capture from vehicle camera"
        />
      )}
    </div>
  )
}
