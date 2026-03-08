export default function CommentPin({ comment, index, isSelected, onClick }) {
  const isAI = comment.user?.is_pseudo_user;

  return (
    <button
      className={[
        'absolute flex items-center justify-center',
        'w-7 h-7 rounded-full text-xs font-bold shadow-lg',
        'border-2 transition-all duration-100 z-10',
        isSelected ? 'scale-125 ring-2 ring-white' : 'hover:scale-110',
        isAI
          ? 'bg-violet-600 border-violet-400 text-white'
          : 'bg-amber-400 border-amber-300 text-amber-900',
      ].join(' ')}
      style={{ left: comment.x_coord - 14, top: comment.y_coord - 14 }}
      onClick={onClick}
      title={comment.body}
    >
      {isAI ? 'AI' : index}
    </button>
  );
}
