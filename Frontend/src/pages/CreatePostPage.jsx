import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { supabase } from "../utils/supabase.js";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, loginWithRedirect } = useAuth0();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [arduinoCode, setArduinoCode] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sync Auth0 user to Supabase users table (same pattern as PostPage.jsx)
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    async function syncUser() {
      const { data: existing } = await supabase
        .from("users")
        .select()
        .eq("auth0_user_id", user.sub)
        .single();
      if (existing) return;
      await supabase
        .from("users")
        .insert({
          auth0_user_id: user.sub,
          email: user.email,
          username: user.nickname ?? user.name,
          is_pseudo_user: false,
        });
    }
    syncUser();
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#287450" }}>
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    loginWithRedirect({ appState: { returnTo: "/create-post" } });
    return null;
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!imageFile) {
      setError("Please select a circuit image.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("auth0_user_id", user.sub);
    formData.append("title", title);
    formData.append("short_description", description);
    formData.append("arduino_code", arduinoCode);
    formData.append("image", imageFile);

    try {
      const res = await fetch("http://localhost:8000/api/create-post", {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type — browser sets it with multipart boundary
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Server error ${res.status}`);
      }
      const { id } = await res.json();
      navigate(`/posts/${id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#287450" }}>
      {/* Header */}
      <header className="h-16 px-6 flex items-center gap-4 border-b border-white/20">
        <button
          onClick={() => navigate("/")}
          className="text-white/80 hover:text-white text-sm font-medium"
          disabled={submitting}
        >
          ← Back
        </button>
        <h1 className="text-white font-bold text-lg">Create Post</h1>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Image Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-white font-medium text-sm">Circuit Image *</label>
            <div
              className="relative border-2 border-dashed border-white/30 rounded-xl overflow-hidden cursor-pointer hover:border-white/60 transition-colors"
              style={{ minHeight: "180px" }}
              onClick={() => !submitting && document.getElementById("image-input").click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Circuit preview"
                  className="w-full object-contain max-h-64"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 gap-2">
                  <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-white/50 text-sm">Click to upload a circuit photo</p>
                </div>
              )}
            </div>
            <input
              id="image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={submitting}
            />
            {imagePreview && (
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="text-white/50 hover:text-white text-xs self-start"
                disabled={submitting}
              >
                Remove image
              </button>
            )}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-white font-medium text-sm">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's wrong with your circuit?"
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/50"
              disabled={submitting}
              maxLength={200}
            />
          </div>

          {/* Short Description */}
          <div className="flex flex-col gap-2">
            <label className="text-white font-medium text-sm">Short Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe the issue..."
              rows={3}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/50 resize-none"
              disabled={submitting}
            />
          </div>

          {/* Arduino Code */}
          <div className="flex flex-col gap-2">
            <label className="text-white font-medium text-sm">Arduino Code</label>
            <textarea
              value={arduinoCode}
              onChange={(e) => setArduinoCode(e.target.value)}
              placeholder={"void setup() {\n  // ...\n}\n\nvoid loop() {\n  // ...\n}"}
              rows={10}
              className="bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-green-300 placeholder-white/20 text-xs font-mono focus:outline-none focus:border-white/50 resize-y"
              disabled={submitting}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-300 text-sm bg-red-900/30 border border-red-400/30 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-emerald-950 font-semibold rounded-lg px-6 py-3 text-sm transition-colors"
          >
            {submitting ? "Analyzing circuit with AI..." : "Create Post"}
          </button>
        </form>
      </main>
    </div>
  );
}
