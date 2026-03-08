import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import CircuitCanvas from '../components/CircuitCanvas.jsx';
import AIChatPanel from '../components/AIChatPanel.jsx';
import { CURRENT_USER } from '../utils/mockData.js';
import { supabase } from '../utils/supabase.js';

// TODO: derive isOwner from Auth0 user vs post.user_id
const IS_OWNER = true;

export default function PostPage() {
  const { id } = useParams();

  const [post, setPost]               = useState(null);
  const [circuitJson, setCircuitJson] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [saveStatus, setSaveStatus]     = useState(null); // 'saving' | 'saved' | 'error'
  const [arduinoCode, setArduinoCode]   = useState('');
  const codeTimerRef = useRef(null);

  const [comments, setComments] = useState([]);

  // Prevent the initial load from triggering a save
  const isLoadedRef   = useRef(false);
  const saveTimerRef  = useRef(null);

  const [commentMode, setCommentMode] = useState(false);
  const [chatOpen, setChatOpen]       = useState(false);
  const [codeOpen, setCodeOpen]       = useState(false);

  // ── Fetch post + comments from Supabase ─────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const [postResult, commentsResult] = await Promise.all([
        supabase
          .from('circuit_posts')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('canvas_comments')
          .select('*, user:user_id(*)')
          .eq('post_id', id)
          .order('created_at', { ascending: true }),
      ]);

      if (postResult.error) {
        setError(postResult.error.message);
      } else {
        setPost(postResult.data);
        isLoadedRef.current = false;
        setCircuitJson(postResult.data.circuit_json);
        setArduinoCode(postResult.data.arduino_code ?? '');
        // Mark as loaded after the state update settles
        setTimeout(() => { isLoadedRef.current = true; }, 0);
      }

      if (!commentsResult.error) {
        setComments(commentsResult.data);
      }

      setLoading(false);
    }
    fetchData();
  }, [id]);

  // ── Debounced save of circuit_json ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoadedRef.current || circuitJson === null) return;

    setSaveStatus('saving');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const { error: err } = await supabase
        .from('circuit_posts')
        .update({ circuit_json: circuitJson })
        .eq('id', id);

      setSaveStatus(err ? 'error' : 'saved');
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [circuitJson, id]);

  // ── Debounced save of arduino_code ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoadedRef.current) return;

    setSaveStatus('saving');
    clearTimeout(codeTimerRef.current);
    codeTimerRef.current = setTimeout(async () => {
      const { error: err } = await supabase
        .from('circuit_posts')
        .update({ arduino_code: arduinoCode })
        .eq('id', id);

      setSaveStatus(err ? 'error' : 'saved');
    }, 800);

    return () => clearTimeout(codeTimerRef.current);
  }, [arduinoCode, id]);

  const handleAddComment = useCallback(async ({ x, y, body }) => {
    const { data, error: err } = await supabase
      .from('canvas_comments')
      .insert({ post_id: id, user_id: CURRENT_USER.id, body, x_coord: x, y_coord: y })
      .select('*, user:user_id(*)')
      .single();

    if (!err && data) {
      setComments(prev => [...prev, data]);
    }
    setCommentMode(false);
  }, [id]);

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400 text-sm">
        Loading circuit…
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-red-400 text-sm">
        {error ?? 'Post not found.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-900 shrink-0">

        {/* Post info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate leading-tight">
            {post.title}
          </h1>
          <p className="text-xs text-gray-400 truncate">
            by @{post.user?.username} &middot; {post.short_description}
          </p>
        </div>

        {/* Save status */}
        {saveStatus && (
          <span className={[
            'text-xs font-medium shrink-0',
            saveStatus === 'saving' ? 'text-gray-500' :
            saveStatus === 'saved'  ? 'text-green-500' :
                                      'text-red-400',
          ].join(' ')}>
            {saveStatus === 'saving' ? 'Saving…' :
             saveStatus === 'saved'  ? 'Saved' :
                                       'Save failed'}
          </span>
        )}

        {/* Toolbar actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Arduino code toggle */}
          <button
            className={[
              'text-xs px-3 py-1.5 rounded-md font-mono font-medium transition-colors',
              codeOpen
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800',
            ].join(' ')}
            onClick={() => setCodeOpen(v => !v)}
          >
            {'</>'}
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-700" />

          {/* Comment mode */}
          <button
            className={[
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
              commentMode
                ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
            ].join(' ')}
            onClick={() => {
              setCommentMode(v => !v);
              setChatOpen(false);
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {commentMode ? 'Exit' : 'Comment'}
          </button>

          {/* AI Chat (owner only) */}
          {IS_OWNER && (
            <button
              className={[
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
                chatOpen
                  ? 'bg-violet-600 text-white hover:bg-violet-500'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
              ].join(' ')}
              onClick={() => {
                setChatOpen(v => !v);
                setCommentMode(false);
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Chat
            </button>
          )}
        </div>
      </header>

      {/* ── Arduino code panel ── */}
      {codeOpen && (
        <div className="shrink-0 bg-gray-900 border-b border-gray-800 px-5 py-3">
          <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Arduino Code</p>
          <textarea
            className="w-full h-36 bg-gray-950 text-green-400 font-mono text-xs leading-relaxed resize-none outline-none border border-gray-800 rounded p-2"
            value={arduinoCode}
            onChange={e => setArduinoCode(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}

      {/* ── Canvas area ── */}
      <div
        className="flex-1 relative overflow-hidden transition-all duration-200"
        style={{ marginRight: chatOpen ? '320px' : 0 }}
      >
        <CircuitCanvas
          circuitJson={circuitJson}
          comments={comments}
          commentMode={commentMode}
          onAddComment={handleAddComment}
          currentUser={CURRENT_USER}
          onCircuitChange={setCircuitJson}
        />
      </div>

      {/* ── AI Chat panel ── */}
      <AIChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        isOwner={IS_OWNER}
      />
    </div>
  );
}
