import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import PostPage from './pages/PostPage.jsx'

export default function App() {
  const { isLoading } = useAuth0()

  if (isLoading) return null

  return (
    <Routes>
      <Route path="/posts/:id" element={<PostPage />} />
      <Route path="/" element={<Navigate to="/posts/b1000001-0000-4000-8000-000000000001" replace />} />
    </Routes>
  )
}
