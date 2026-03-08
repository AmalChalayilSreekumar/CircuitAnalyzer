import { useState, useRef, useEffect } from 'react';

const INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'ai',
    body: "Hi! I've analyzed your circuit. Ask me anything about it — I can help you debug connections, check component values, or explain what might be wrong.",
  },
];

export default function AIChatPanel({ isOpen, onClose, isOwner, circuitJson, arduinoCode }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = { id: Date.now(), sender: 'user', body: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    // Build conversation history in the format the backend expects
    const history = updatedMessages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.body,
    }));

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circuit_json: circuitJson ?? {},
          arduino_code: arduinoCode ?? '',
          messages: history,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      // The response is a JSON string with general_feedback and specific_point_feedback
      let body;
      try {
        const parsed = JSON.parse(data.response);
        body = parsed.general_feedback ?? data.response;
      } catch {
        body = data.response;
      }

      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', body },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', body: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className={[
        'fixed top-0 right-0 h-full w-80 flex flex-col z-40',
        'bg-gray-950 border-l border-gray-800 shadow-2xl',
        'transition-transform duration-200',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">AI Chat</span>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">private</span>
        </div>
        <button
          className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {!isOwner ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-gray-500 text-sm">
            This AI chat is private to the post owner.
          </p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={[
                    'max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-800 text-gray-100 rounded-bl-sm',
                  ].join(' ')}
                >
                  {msg.sender === 'ai' && (
                    <p className="text-xs text-violet-400 font-semibold mb-1">Gemini</p>
                  )}
                  {msg.body}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-4 pt-2 border-t border-gray-800 shrink-0">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-gray-700 focus:border-violet-500 placeholder-gray-500 transition-colors"
                placeholder="Ask about your circuit…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-3 rounded-xl text-sm font-bold transition-colors"
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                ↑
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
