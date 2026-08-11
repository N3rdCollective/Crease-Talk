export type VideoItem = {
  id: string
  artist: string
  title: string
  type: 'VIDEO' | 'INTERVIEW'
}

export type Artist = {
  id: string
  name: string
  genre: string
}

export type DiscoverItem = {
  id: string
  title: string
  description: string
  icon: 'star' | 'music' | 'video' | 'eye'
  href: string
}

export const navLinks = [
  { label: 'HOME', href: '/#home' },
  { label: 'DISCOVER', href: '/#discover' },
  { label: 'ARTISTS', href: '/new-artists' },
  { label: 'VIDEOS', href: '/videos' },
  { label: 'MUSIC', href: '/new-music' },
  { label: 'INTERVIEWS', href: '/#interviews' },
  { label: 'SUBMIT MUSIC', href: '/submit' },
] as const

export const latestVideos: VideoItem[] = [
  { id: 'v1', artist: 'SUZI', title: 'Fine By Me', type: 'VIDEO' },
  { id: 'v2', artist: 'J STONE', title: 'Night Shift', type: 'VIDEO' },
  { id: 'v3', artist: 'NINA WOODS', title: 'Soft Lights', type: 'VIDEO' },
  { id: 'v4', artist: 'KAI RIVERS', title: 'Afterglow', type: 'VIDEO' },
  { id: 'v5', artist: 'MAYA BLUE', title: 'City Line', type: 'VIDEO' },
  { id: 'v6', artist: 'DREW PARKS', title: 'Low Key', type: 'VIDEO' },
]

export const interviews: VideoItem[] = [
  {
    id: 'i1',
    artist: 'NINA WOODS',
    title: '5 QUESTIONS WITH NINA WOODS',
    type: 'INTERVIEW',
  },
  {
    id: 'i2',
    artist: 'J STONE',
    title: 'IN THE STUDIO WITH J STONE',
    type: 'INTERVIEW',
  },
  {
    id: 'i3',
    artist: 'KAI RIVERS',
    title: 'KAI RIVERS ON THE COME UP',
    type: 'INTERVIEW',
  },
  {
    id: 'i4',
    artist: 'LUNA VEE',
    title: 'LUNA VEE: SOUND & VISION',
    type: 'INTERVIEW',
  },
]

export const featuredArtists: Artist[] = [
  { id: 'a1', name: 'J STONE', genre: 'Hip-Hop' },
  { id: 'a2', name: 'NINA WOODS', genre: 'R&B' },
  { id: 'a3', name: 'KAI RIVERS', genre: 'Alternative' },
  { id: 'a4', name: 'MAYA BLUE', genre: 'Pop' },
  { id: 'a5', name: 'DREW PARKS', genre: 'Hip-Hop' },
  { id: 'a6', name: 'LUNA VEE', genre: 'Electronic' },
  { id: 'a7', name: 'SUZI', genre: 'R&B' },
  { id: 'a8', name: 'REX LANE', genre: 'Indie' },
]

export const discoverItems: DiscoverItem[] = [
  {
    id: 'd1',
    title: 'NEW ARTISTS',
    description: 'Fresh talent breaking through right now.',
    icon: 'star',
    href: '/new-artists',
  },
  {
    id: 'd2',
    title: 'NEW MUSIC',
    description: 'The latest drops from the underground.',
    icon: 'music',
    href: '/new-music',
  },
  {
    id: 'd3',
    title: 'NEW VIDEOS',
    description: 'Visuals, performances, and exclusive cuts.',
    icon: 'video',
    href: '/videos',
  },
  {
    id: 'd4',
    title: 'ONES TO WATCH',
    description: 'Artists on the verge of their next wave.',
    icon: 'eye',
    href: '/ones-to-watch',
  },
]
