import "./LandingPage.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Home, Compass, Bookmark, User, Search, MessageCircle } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { createClient } from "@supabase/supabase-js";

// ── Supabase Client ───────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);


// ── Circuit Card ──────────────────────────────────────────────
export function CircuitCard({ title, desc, author, comments }) {
  return (
    <Card className="bg-white/10 border-white/20 text-white hover:bg-white/15 transition-colors cursor-pointer">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg leading-snug">{title}</CardTitle>
        <CardDescription className="text-white/70 text-sm mt-1">
          u/{author}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-white/80 text-sm leading-relaxed mb-4">{desc}</p>
        <div className="flex items-center gap-2 border-t border-white/10 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3"
          >
            <MessageCircle className="mr-1.5 h-4 w-4" />
            {comments}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3 ml-auto"
          >
            <Bookmark className="mr-1.5 h-4 w-4" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Home");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth0();

  // ── Fetch from Supabase ──
  useEffect(() => {
    async function fetchCircuits() {
      const { data: posts, error: postsError } = await supabase
        .from("circuit_posts")
        .select("user_id, title, short_description");

      if (postsError) {
        console.error(postsError);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const { data: users } = await supabase
        .from("users")
        .select("id, username")
        .in("id", userIds);

      const usernameMap = Object.fromEntries(
        (users || []).map((u) => [u.id, u.username])
      );

      setCards(
        posts.map((row) => ({
          id:       row.user_id,
          title:    row.title,
          desc:     row.short_description,
          author:   usernameMap[row.user_id] ?? row.user_id,
          comments: 0,
        }))
      );
      setLoading(false);
    }

    fetchCircuits();
  }, []);

  function handleSearch(e) {
    if (e.key === "Enter" && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  const navItems = [
    { label: "Home",    icon: <Home     className="h-5 w-5" /> },
    { label: "Explore", icon: <Compass  className="h-5 w-5" /> },
    { label: "Saved",   icon: <Bookmark className="h-5 w-5" /> },
    { label: "Profile", icon: <User     className="h-5 w-5" /> },
  ];

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: "#287450" }}>

      {/* ── Header ── */}
      <header className="h-16 px-6 flex items-center gap-6 border-b border-white/20 shrink-0">
        <span className="text-xl font-bold text-white whitespace-nowrap">
          Circuit Analyzer
        </span>

        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            type="search"
            placeholder="Search circuits, topics..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-emerald-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        <div className="ml-auto shrink-0">
          {isAuthenticated ? (
            <Button
              onClick={() => navigate("/profile")}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <User className="mr-2 h-4 w-4" />
              {user?.name || user?.email}
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Log In
            </Button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-56 border-r border-white/20 p-3 shrink-0">
          <nav className="flex flex-col gap-1">
            {navItems.map(({ label, icon }) => (
              <button
                key={label}
                onClick={() => {
                  setActiveNav(label);
                  if (label === "Profile") navigate("/login");
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full
                  ${activeNav === label
                    ? "bg-emerald-400 text-emerald-950 font-semibold"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Feed ── */}
        <main className="flex-1 overflow-y-auto p-6">
          <h2 className="text-2xl font-bold text-white mb-5">Popular Circuits</h2>

          {loading ? (
            <p className="text-white/60">Loading...</p>
          ) : cards.length === 0 ? (
            <p className="text-white/60">No circuits found.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {cards.map((card) => (
                <CircuitCard
                  key={card.id}
                  title={card.title}
                  desc={card.desc}
                  author={card.author}
                  comments={card.comments}
                />
              ))}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}