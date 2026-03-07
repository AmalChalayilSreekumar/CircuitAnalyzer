-- Circuit Analyzer MVP Schema
-- Supabase/Postgres-ready SQL migration
-- Designed for Auth0 + Cloudinary + public circuit posts + private owner/AI chat

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1) HELPERS
-- =========================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- 2) USERS
-- =========================
-- Stores app-level users.
-- Real users come from Auth0.
-- Pseudo-users (ex: Gemini) have is_pseudo_user = true and no auth0_user_id.

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_user_id TEXT UNIQUE,
    username TEXT NOT NULL,
    email TEXT UNIQUE,
    is_pseudo_user BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_auth0_or_pseudo_chk
    CHECK (
        (is_pseudo_user = TRUE AND auth0_user_id IS NULL)
        OR
        (is_pseudo_user = FALSE AND auth0_user_id IS NOT NULL)
    )
);

-- =========================
-- 3) CIRCUIT POSTS
-- =========================
-- Main public "Circuit Problem" post.
-- The generated circuit_json can later be edited by the post owner.

CREATE TABLE IF NOT EXISTS public.circuit_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    short_description TEXT NOT NULL,
    arduino_code TEXT NOT NULL,
    image_url TEXT NOT NULL,
    circuit_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 4) CANVAS COMMENTS
-- =========================
-- Public flat comments pinned to x/y coordinates on the rendered circuit canvas.
-- AI comments are stored here too using a pseudo-user row.

CREATE TABLE IF NOT EXISTS public.canvas_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.circuit_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    x_coord FLOAT NOT NULL,
    y_coord FLOAT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 5) POST CHATS
-- =========================
-- Exactly one private AI chat per post.
-- Only the post owner should be allowed to access it at the app layer.

CREATE TABLE IF NOT EXISTS public.post_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL UNIQUE REFERENCES public.circuit_posts(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 6) CHAT MESSAGES
-- =========================
-- Messages inside the per-post private AI chat.
-- Sender can be the post owner or the Gemini pseudo-user.

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.post_chats(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 7) INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_circuit_posts_user_id
    ON public.circuit_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_circuit_posts_created_at
    ON public.circuit_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_canvas_comments_post_id
    ON public.canvas_comments(post_id);

CREATE INDEX IF NOT EXISTS idx_canvas_comments_user_id
    ON public.canvas_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id
    ON public.chat_messages(chat_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
    ON public.chat_messages(created_at);

-- =========================
-- 8) TRIGGERS
-- =========================

DROP TRIGGER IF EXISTS trg_circuit_posts_updated_at ON public.circuit_posts;
CREATE TRIGGER trg_circuit_posts_updated_at
BEFORE UPDATE ON public.circuit_posts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_canvas_comments_updated_at ON public.canvas_comments;
CREATE TRIGGER trg_canvas_comments_updated_at
BEFORE UPDATE ON public.canvas_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- 9) OPTIONAL SEED DATA
-- =========================
-- Creates the Gemini pseudo-user once.
-- You can change the username/email if you want.

INSERT INTO public.users (username, email, is_pseudo_user)
VALUES ('Gemini', 'gemini@system.local', TRUE)
ON CONFLICT (email) DO NOTHING;

-- =========================
-- 10) NOTES
-- =========================
-- App/backend rules to enforce:
-- 1. Only authenticated users can create posts/comments.
-- 2. Users can edit only their own posts/comments.
-- 3. AI comments/messages should only be created by backend logic.
-- 4. Only the post owner can access the post's private chat.
-- 5. post_chats.owner_user_id should match circuit_posts.user_id in backend logic.
