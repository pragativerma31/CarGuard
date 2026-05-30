// Mock data for the Car Intrusion & Drowsiness Detection System
// Prepared for Firebase integration

export interface Alert {
  id: string
  type: 'intrusion' | 'motion' | 'unknown' | 'drowsiness'
  description: string
  timestamp: Date
  imageUrl: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  isIgnored: boolean
}

export interface DailyLog {
  id: string
  imageUrl: string
  username: string | null
  timestamp: Date
  description: string
  isAuthorized: boolean
}

export interface Device {
  id: string
  name: string
  status: 'active' | 'inactive' | 'maintenance'
  lastSeen: Date
}

export interface DrowsinessAlert {
  id: string
  timestamp: Date
  severity: 'mild' | 'moderate' | 'severe'
  duration: number // in seconds
  imageUrl: string
}

// Mock Alerts
export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'intrusion',
    description: 'Unauthorized access detected at rear window',
    timestamp: new Date('2026-04-12T14:30:00'),
    imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop',
    severity: 'critical',
    isIgnored: false,
  },
  {
    id: '2',
    type: 'motion',
    description: 'Motion detected near driver side door',
    timestamp: new Date('2026-04-12T12:15:00'),
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop',
    severity: 'high',
    isIgnored: false,
  },
  {
    id: '3',
    type: 'intrusion',
    description: 'Door handle manipulation detected',
    timestamp: new Date('2026-04-11T23:45:00'),
    imageUrl: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=300&fit=crop',
    severity: 'critical',
    isIgnored: false,
  },
  {
    id: '4',
    type: 'motion',
    description: 'Movement detected in parking area',
    timestamp: new Date('2026-04-11T22:30:00'),
    imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop',
    severity: 'medium',
    isIgnored: true,
  },
  {
    id: '5',
    type: 'unknown',
    description: 'Unidentified activity near trunk',
    timestamp: new Date('2026-04-11T18:00:00'),
    imageUrl: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop',
    severity: 'low',
    isIgnored: false,
  },
  {
    id: '6',
    type: 'intrusion',
    description: 'Window breach attempt detected',
    timestamp: new Date('2026-04-10T03:20:00'),
    imageUrl: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=400&h=300&fit=crop',
    severity: 'critical',
    isIgnored: false,
  },
]

// Mock Daily Logs
export const mockDailyLogs: DailyLog[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    username: 'John Doe',
    timestamp: new Date('2026-04-12T08:30:00'),
    description: 'Vehicle unlocked via key fob',
    isAuthorized: true,
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    username: 'Jane Smith',
    timestamp: new Date('2026-04-12T07:45:00'),
    description: 'Vehicle started with registered key',
    isAuthorized: true,
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop',
    username: null,
    timestamp: new Date('2026-04-11T23:50:00'),
    description: 'Unknown person approached vehicle',
    isAuthorized: false,
  },
  {
    id: '4',
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    username: 'Mike Johnson',
    timestamp: new Date('2026-04-11T18:20:00'),
    description: 'Vehicle locked manually',
    isAuthorized: true,
  },
  {
    id: '5',
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    username: null,
    timestamp: new Date('2026-04-11T14:10:00'),
    description: 'Attempted door access - denied',
    isAuthorized: false,
  },
]

// Mock Devices
export const mockDevices: Device[] = [
  {
    id: '1',
    name: 'Front Camera',
    status: 'active',
    lastSeen: new Date(),
  },
  {
    id: '2',
    name: 'Rear Camera',
    status: 'active',
    lastSeen: new Date(),
  },
  {
    id: '3',
    name: 'Interior Sensor',
    status: 'active',
    lastSeen: new Date(),
  },
  {
    id: '4',
    name: 'Door Sensor Array',
    status: 'maintenance',
    lastSeen: new Date(Date.now() - 3600000),
  },
]

// Mock Drowsiness Alerts
export const mockDrowsinessAlerts: DrowsinessAlert[] = [
  {
    id: '1',
    timestamp: new Date('2026-04-12T16:30:00'),
    severity: 'severe',
    duration: 5,
    imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=300&fit=crop',
  },
  {
    id: '2',
    timestamp: new Date('2026-04-12T14:15:00'),
    severity: 'moderate',
    duration: 3,
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=300&fit=crop',
  },
  {
    id: '3',
    timestamp: new Date('2026-04-12T10:45:00'),
    severity: 'mild',
    duration: 2,
    imageUrl: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400&h=300&fit=crop',
  },
  {
    id: '4',
    timestamp: new Date('2026-04-11T22:30:00'),
    severity: 'severe',
    duration: 8,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  },
  {
    id: '5',
    timestamp: new Date('2026-04-11T19:00:00'),
    severity: 'moderate',
    duration: 4,
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=300&fit=crop',
  },
]

// Dashboard Stats
export const getDashboardStats = () => ({
  totalAlerts: mockAlerts.length,
  totalDailyLogs: mockDailyLogs.length,
  activeDevices: mockDevices.filter(d => d.status === 'active').length,
  systemStatus: 'active' as const,
})

// Alert Stats
export const getAlertStats = () => ({
  totalAlerts: mockAlerts.length,
  ignoredAlerts: mockAlerts.filter(a => a.isIgnored).length,
  criticalAlerts: mockAlerts.filter(a => a.severity === 'critical').length,
})

// Daily Log Stats
export const getDailyLogStats = () => ({
  totalLogs: mockDailyLogs.length,
  authorizedCount: mockDailyLogs.filter(l => l.isAuthorized).length,
  unauthorizedCount: mockDailyLogs.filter(l => !l.isAuthorized).length,
})

// Drowsiness Stats
export const getDrowsinessStats = () => ({
  totalAlerts: mockDrowsinessAlerts.length,
  alertsToday: mockDrowsinessAlerts.filter(
    a => a.timestamp.toDateString() === new Date().toDateString()
  ).length,
  severeCounts: {
    mild: mockDrowsinessAlerts.filter(a => a.severity === 'mild').length,
    moderate: mockDrowsinessAlerts.filter(a => a.severity === 'moderate').length,
    severe: mockDrowsinessAlerts.filter(a => a.severity === 'severe').length,
  },
})

// Chart data for drowsiness
export const getDrowsinessChartData = () => [
  { day: 'Mon', alerts: 2 },
  { day: 'Tue', alerts: 4 },
  { day: 'Wed', alerts: 1 },
  { day: 'Thu', alerts: 3 },
  { day: 'Fri', alerts: 5 },
  { day: 'Sat', alerts: 2 },
  { day: 'Sun', alerts: 3 },
]
