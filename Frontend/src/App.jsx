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

  const handleSignup = () =>
    loginWithRedirect({
      authorizationParams: { screen_hint: "signup" },
    });

  const handleLogout = () =>
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });

  if (isLoading) {
    return (
      <div className="page">
        <div className="card">
          <h2>Loading...</h2>
          <p>Please wait while we connect to Auth0.</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="page">
        <div className="card profile-card">
          <h1>Welcome</h1>
          <p className="subtitle">You are logged in with Auth0.</p>

          <div className="profile-box">
            <p><strong>Name:</strong> {user?.name || "Not available"}</p>
            <p><strong>Email:</strong> {user?.email || "Not available"}</p>
          </div>

          <h3>User Profile</h3>
          <pre className="profile-json">{JSON.stringify(user, null, 2)}</pre>

          <button className="primary-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page split-layout">
      <section className="hero-section">
        <div className="hero-content">
          <p className="badge">Secure Authentication</p>
          <h1>Build a secure login experience with Auth0</h1>
          <p className="hero-text">
            Auth0 helps secure your applications without spending hours building
            features like social sign-in, Multi-Factor Authentication, and
            passwordless login from scratch.
          </p>
          <p className="hero-text">
            You can also secure AI applications with Auth0 for AI Agents.
          </p>
          <p className="hero-text">
            Auth0 is free to try, does not require a credit card, and gives you
            a fast way to add modern authentication to your app.
          </p>
        </div>
      </section>

      <section className="login-section">
        <div className="card">
          <h2>Login</h2>
          <p className="subtitle">
            Continue securely using Auth0 Universal Login.
          </p>

          {error && <p className="error-text">Error: {error.message}</p>}

          <button className="primary-btn" onClick={() => loginWithRedirect()}>
            Login
          </button>

          <button className="secondary-btn" onClick={handleSignup}>
            Sign up
          </button>

          <p className="small-text">
            You will be redirected to Auth0 to authenticate securely.
          </p>
        </div>
      </section>
    </div>
  );
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