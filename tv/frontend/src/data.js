export const LOCATIONS = ['All', 'Front Door', 'Backyard', 'Basement', 'Living Room', 'Garage']

export const CAMERAS = [
  // Front Door
  { id: 1,  location: 'Front Door', name: 'Camera 1', node: '100.64.1.10', wifi: 90, battery: 86, motion: 3,  status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#2a3a1a','#1a2810'] },
  { id: 2,  location: 'Front Door', name: 'Camera 2', node: '100.64.1.11', wifi: 75, battery: 56, motion: 12, status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#1e2a18','#141e10'] },
  // Backyard
  { id: 3,  location: 'Backyard',   name: 'Camera 1', node: '100.64.1.12', wifi: 80, battery: 32, motion: 8,  status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#162814','#0e1e0c'] },
  { id: 4,  location: 'Backyard',   name: 'Camera 2', node: '100.64.1.13', wifi: 65, battery: 18, motion: 5,  status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#1a2c14','#102010'] },
  { id: 5,  location: 'Backyard',   name: 'Camera 3', node: '100.64.1.14', wifi: 55, battery: 24, motion: 2,  status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#1e2618','#141c10'] },
  { id: 6,  location: 'Backyard',   name: 'Camera 4', node: '100.64.1.15', wifi: 70, battery: 14, motion: 0,  status: 'offline',lastSeen: '11:00:00 AM', date: '15-05-2024', gradient: ['#1c2416','#12180e'] },
  // Basement
  { id: 7,  location: 'Basement',   name: 'Camera 1', node: '100.64.1.16', wifi: 95, battery: 100,motion: 1,  status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#1a1e2e','#10121e'] },
  { id: 8,  location: 'Basement',   name: 'Camera 2', node: '100.64.1.17', wifi: 88, battery: 72, motion: 0,  status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#16182a','#0e1020'] },
  // Living Room
  { id: 9,  location: 'Living Room',name: 'Camera 1', node: '100.64.1.18', wifi: 100,battery: 62, motion: 4,  status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#2a1e14','#1e1410'] },
  { id: 10, location: 'Living Room',name: 'Camera 2', node: '100.64.1.19', wifi: 82, battery: 44, motion: 0,  status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#261a12','#1c120e'] },
  // Garage
  { id: 11, location: 'Garage',     name: 'Camera 1', node: '100.64.1.20', wifi: 60, battery: 88, motion: 0,  status: 'live', lastSeen: '12:19:49 PM', date: '15-05-2024', gradient: ['#1e1c28','#14121e'] },
]

export const FEED_EVENTS = [
  { id: 1,  cameraName: 'Front Door 2', type: 'PIR Alarm', time: '12:19:49 PM', gradient: ['#1e2a18','#141e10'] },
  { id: 2,  cameraName: 'Front Door 2', type: 'PIR Alarm', time: '12:01:03 PM', gradient: ['#1e2a18','#141e10'] },
  { id: 3,  cameraName: 'Front Door 2', type: 'PIR Alarm', time: '8:34:50 AM',  gradient: ['#1e2a18','#141e10'] },
  { id: 4,  cameraName: 'Front Door 1', type: 'PIR Alarm', time: '8:28:15 AM',  gradient: ['#2a3a1a','#1a2810'] },
  { id: 5,  cameraName: 'Front Door 1', type: 'PIR Alarm', time: '8:34:50 AM',  gradient: ['#2a3a1a','#1a2810'] },
  { id: 6,  cameraName: 'Front Door 1', type: 'PIR Alarm', time: '8:31:48 AM',  gradient: ['#2a3a1a','#1a2810'] },
  { id: 7,  cameraName: 'Front Door 2', type: 'PIR Alarm', time: '11:12:56 AM', gradient: ['#1e2a18','#141e10'] },
  { id: 8,  cameraName: 'Front Door 2', type: 'PIR Alarm', time: '11:06:22 AM', gradient: ['#1e2a18','#141e10'] },
  { id: 9,  cameraName: 'Front Door 2', type: 'PIR Alarm', time: '10:56:57 AM', gradient: ['#1e2a18','#141e10'] },
  { id: 10, cameraName: 'Backyard 1',   type: 'Motion',    time: '10:45:30 AM', gradient: ['#162814','#0e1e0c'] },
  { id: 11, cameraName: 'Garage 1',     type: 'Door Open', time: '9:30:12 AM',  gradient: ['#1e1c28','#14121e'] },
]

export const WEEK_DAYS = [
  { day: 'Thu', date: '09' },
  { day: 'Fri', date: '10' },
  { day: 'Sat', date: '11' },
  { day: 'Sun', date: '12' },
  { day: 'Mon', date: '13' },
  { day: 'Tue', date: '14' },
  { day: 'Wed', date: '15', today: true },
]

export const CLIP_TIMES = ['12:19:49 PM', '11:39 AM', '10:56 AM', '10:25 AM', '9:34 AM']
