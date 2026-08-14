/** Canonical music genres for admin picker + Last.fm tag normalization. */
export const MUSIC_GENRES = [
  'Afrobeats',
  'Afro-fusion',
  'Alternative',
  'Alternative R&B',
  'Amapiano',
  'Ambient',
  'Ballad',
  'Bass',
  'Boom Bap',
  'Country',
  'Dance',
  'Dancehall',
  'Disco',
  'Drill',
  'Dubstep',
  'EDM',
  'Electronic',
  'Emo Rap',
  'Experimental',
  'Folk',
  'Funk',
  'Gangsta Rap',
  'Gospel',
  'Grime',
  'Hip Hop',
  'House',
  'Indie',
  'Indie Pop',
  'Jazz',
  'Jersey Club',
  'Latin',
  'Lo-fi',
  'Metal',
  'New Jack Swing',
  'Pop',
  'Pop Rap',
  'Punk',
  'R&B',
  'Rap',
  'Reggae',
  'Reggaeton',
  'Rock',
  'Soul',
  'Synthwave',
  'Techno',
  'Trap',
  'UK Drill',
  'UK Rap',
  'Underground Hip Hop',
  'World',
] as const

export type MusicGenre = (typeof MUSIC_GENRES)[number]

const ALIASES: Record<string, string> = {
  'hip hop': 'Hip Hop',
  'hip-hop': 'Hip Hop',
  hiphop: 'Hip Hop',
  rap: 'Rap',
  'r&b': 'R&B',
  'r and b': 'R&B',
  rnb: 'R&B',
  'rhythm and blues': 'R&B',
  'alternative r&b': 'Alternative R&B',
  'alt r&b': 'Alternative R&B',
  trap: 'Trap',
  drill: 'Drill',
  'uk drill': 'UK Drill',
  grime: 'Grime',
  afrobeats: 'Afrobeats',
  afrobeat: 'Afrobeats',
  amapiano: 'Amapiano',
  dancehall: 'Dancehall',
  reggae: 'Reggae',
  reggaeton: 'Reggaeton',
  pop: 'Pop',
  'pop rap': 'Pop Rap',
  soul: 'Soul',
  funk: 'Funk',
  jazz: 'Jazz',
  electronic: 'Electronic',
  edm: 'EDM',
  house: 'House',
  techno: 'Techno',
  dubstep: 'Dubstep',
  indie: 'Indie',
  'indie pop': 'Indie Pop',
  alternative: 'Alternative',
  rock: 'Rock',
  metal: 'Metal',
  punk: 'Punk',
  country: 'Country',
  folk: 'Folk',
  gospel: 'Gospel',
  latin: 'Latin',
  'lo-fi': 'Lo-fi',
  lofi: 'Lo-fi',
  'emo rap': 'Emo Rap',
  'underground hip hop': 'Underground Hip Hop',
  'gangsta rap': 'Gangsta Rap',
  boom: 'Boom Bap',
  'boom bap': 'Boom Bap',
  'jersey club': 'Jersey Club',
  'uk rap': 'UK Rap',
}

/** Map free-text / Last.fm tags onto the canonical list when possible. */
export function normalizeGenreLabel(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  const key = cleaned.toLowerCase()
  if (ALIASES[key]) return ALIASES[key]
  const exact = MUSIC_GENRES.find((g) => g.toLowerCase() === key)
  if (exact) return exact
  // Title-case leftover tags (still allow custom genres)
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function filterMusicGenres(query: string, selected: string[] = []) {
  const q = query.trim().toLowerCase()
  const selectedSet = new Set(selected.map((s) => s.toLowerCase()))
  return MUSIC_GENRES.filter((g) => {
    if (selectedSet.has(g.toLowerCase())) return false
    if (!q) return true
    return g.toLowerCase().includes(q)
  })
}
