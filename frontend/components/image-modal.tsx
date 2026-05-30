'use client'

import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  title?: string
  timestamp?: Date
  type?: string
  description?: string
}

export function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  timestamp,
  type,
  description,
}: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {title || 'Image Preview'}
            </DialogTitle>
            {type && (
              <Badge variant="outline" className="capitalize">
                {type}
              </Badge>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary">
            <Image
              src={imageUrl}
              alt={title || 'Captured image'}
              fill
              className="object-cover"
              crossOrigin="anonymous"
            />
          </div>
          {(timestamp || description) && (
            <div className="space-y-2">
              {timestamp && (
                <p className="text-sm text-muted-foreground">
                  Captured: {format(timestamp, 'PPpp')}
                </p>
              )}
              {description && (
                <p className="text-sm text-foreground">{description}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
