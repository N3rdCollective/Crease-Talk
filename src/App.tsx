import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { VideosPage } from './pages/VideosPage'
import { NewArtistsPage } from './pages/NewArtistsPage'
import { NewMusicPage } from './pages/NewMusicPage'
import { OnesToWatchPage } from './pages/OnesToWatchPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/new-artists" element={<NewArtistsPage />} />
            <Route path="/new-music" element={<NewMusicPage />} />
            <Route path="/ones-to-watch" element={<OnesToWatchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
