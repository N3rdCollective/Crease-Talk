import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { VideosPage } from './pages/VideosPage'
import { NewArtistsPage } from './pages/NewArtistsPage'
import { NewMusicPage } from './pages/NewMusicPage'
import { OnesToWatchPage } from './pages/OnesToWatchPage'
import { SubmitPage } from './pages/SubmitPage'
import { AdminLoginPage } from './admin/AdminLoginPage'
import { AdminLayout } from './admin/AdminLayout'
import { RequireStaff } from './admin/RequireStaff'
import { VideoQueuePage } from './admin/VideoQueuePage'
import { ArtistsAdminPage } from './admin/ArtistsAdminPage'
import { SubmissionsAdminPage } from './admin/SubmissionsAdminPage'
import { StaffPage } from './admin/StaffPage'

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireStaff>
              <AdminLayout />
            </RequireStaff>
          }
        >
          <Route index element={<VideoQueuePage />} />
          <Route path="artists" element={<ArtistsAdminPage />} />
          <Route path="submissions" element={<SubmissionsAdminPage />} />
          <Route path="staff" element={<StaffPage />} />
        </Route>

        <Route
          path="/"
          element={
            <PublicShell>
              <HomePage />
            </PublicShell>
          }
        />
        <Route
          path="/videos"
          element={
            <PublicShell>
              <VideosPage />
            </PublicShell>
          }
        />
        <Route
          path="/new-artists"
          element={
            <PublicShell>
              <NewArtistsPage />
            </PublicShell>
          }
        />
        <Route
          path="/new-music"
          element={
            <PublicShell>
              <NewMusicPage />
            </PublicShell>
          }
        />
        <Route
          path="/ones-to-watch"
          element={
            <PublicShell>
              <OnesToWatchPage />
            </PublicShell>
          }
        />
        <Route
          path="/submit"
          element={
            <PublicShell>
              <SubmitPage />
            </PublicShell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
