export default function CommentPopup({ comment, screenPos, onClose }) {
  const isAI = comment.user?.is_pseudo_user;
  const date = new Date(comment.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });

  return (
    <div
      className="absolute z-20 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
      style={{ left: screenPos.x + 18, top: screenPos.y - 8 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-semibold ${isAI ? 'text-violet-600' : 'text-gray-700'}`}>
            {isAI ? 'Gemini (AI)' : `@${comment.user?.username}`}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{date}</span>
            <button
              className="text-gray-400 hover:text-gray-600 leading-none text-sm"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed">{comment.body}</p>
      </div>
    </div>
  );
}
