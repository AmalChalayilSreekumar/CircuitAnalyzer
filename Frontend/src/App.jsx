import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import LandingPage, { CircuitCard } from "./LandingPage";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function LoginPage() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();
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

function ProfilePage() {
  const { isLoading, isAuthenticated, user, logout } = useAuth0();
  const navigate = useNavigate();

  const handleLogout = () =>
    logout({ logoutParams: { returnTo: window.location.origin } });

  if (isLoading) return <div className="page"><div className="card"><h2>Loading...</h2></div></div>;

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  return (
    <div className="page">
      <div className="card profile-card">
        <h1>Profile</h1>
        <div className="profile-box">
          <p><strong>Name:</strong> {user?.name || "Not available"}</p>
          <p><strong>Email:</strong> {user?.email || "Not available"}</p>
        </div>
        <h3>User Data</h3>
        <pre className="profile-json">{JSON.stringify(user, null, 2)}</pre>
        <button className="primary-btn" onClick={handleLogout}>Logout</button>
        <button className="secondary-btn" onClick={() => navigate("/")}>Back to Home</button>
      </div>
    </div>
  );
}

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      const { data: posts, error } = await supabase
        .from("circuit_posts")
        .select("user_id, title, short_description")
        .or(`title.ilike.%${query}%,short_description.ilike.%${query}%`);

      if (!error && posts) {
        const userIds = [...new Set(posts.map((p) => p.user_id))];
        const { data: users } = await supabase
          .from("users")
          .select("id, username")
          .in("id", userIds);

        const usernameMap = Object.fromEntries(
          (users || []).map((u) => [u.id, u.username])
        );

        setResults(
          posts.map((row) => ({
            id: row.user_id,
            title: row.title,
            desc: row.short_description,
            author: usernameMap[row.user_id] ?? row.user_id,
            comments: 0,
          }))
        );
      }
      setLoading(false);
    }
    fetchResults();
  }, [query]);

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: "#287450" }}>
      <header className="h-16 px-6 flex items-center gap-4 border-b border-white/20 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="text-white/80 hover:text-white text-sm font-medium"
        >
          ← Back
        </button>
        <h1 className="text-white font-bold text-lg">
          Search results for "{query}"
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        {loading ? (
          <p className="text-white/60">Loading...</p>
        ) : results.length === 0 ? (
          <p className="text-white/70">No results found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {results.map((card) => (
              <CircuitCard key={card.id} {...card} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/search" element={<SearchPage />} />
    </Routes>
  );
}

export default App;
