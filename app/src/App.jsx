import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import EventDetailPage from './pages/EventDetailPage'

export default function App() {
  return (
    <BrowserRouter basename="/autox2">
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/event/:id" element={<EventDetailPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
