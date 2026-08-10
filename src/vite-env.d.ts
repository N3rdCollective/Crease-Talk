/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_YOUTUBE_API_KEY: string
  readonly VITE_YOUTUBE_CHANNEL_HANDLE?: string
  readonly VITE_REMARKABLE_YOUTUBE_HANDLE?: string
}


interface ImportMeta {
  readonly env: ImportMetaEnv
}
