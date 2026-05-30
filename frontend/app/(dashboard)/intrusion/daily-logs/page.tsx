
'use client'

import Image from 'next/image'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useVerifications } from '@/hooks/use-verifications'
import { format } from 'date-fns'
import {  Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DailyLogsPage() {
  const { logs, loading, error } = useVerifications()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load logs: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Daily Logs"
        description="Access logs showing authorized and unauthorized attempts"
        showBackButton
        backHref="/intrusion"
      />

      {/* Logs Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Access Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No authorized access logs yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Image</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="relative h-12 w-12 overflow-hidden rounded-full bg-secondary">
                          {log.imageURL ? (
                            <Image
                              src={log.imageURL}
                              alt={log.name || 'Authorized user'}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                              N/A
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {log.name || (
                            <span className="text-muted-foreground italic">
                              Unknown
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-xs truncate">
                          {log.confidence != null
                            ? `Match confidence: ${(log.confidence * 100).toFixed(1)}%`
                            : 'Authorized access'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'bg-[oklch(0.7_0.18_145)]/20 text-[oklch(0.7_0.18_145)] border-[oklch(0.7_0.18_145)]/30'
                          )}
                        >
                          Authorized
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(log.timestamp, 'MMM d, yyyy')}</p>
                          <p className="text-muted-foreground">
                            {format(log.timestamp, 'HH:mm:ss')}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}