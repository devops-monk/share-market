import { useState, useRef, useEffect, useCallback } from 'react';
import type { StockRecord, Metadata } from '../../types';
import { processQuery } from '../../lib/copilot-engine';
import { queryLLM, getApiKey, setApiKey, clearApiKey, getProviders, getProvider, setProvider, type ProviderName } from '../../lib/copilot-llm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  source?: 'engine' | 'llm';
}

interface Props {
  stocks: StockRecord[];
  contextStock?: StockRecord | null;
  metadata?: Metadata | null;
  expanded?: boolean;
}

const SUGGESTIONS = [
  'What is the score?',
  'Why is it bullish?',
  'Is it overvalued?',
  'What are the risks?',
  'Show signals',
  'Technical summary',
];

const GENERAL_SUGGESTIONS = [
  'Top 5 stocks by score',
  'Market regime',
  'Compare AAPL vs MSFT',
  'Best dividend stocks',
  'Average score',
];

export default function AICopilotChat({ stocks, contextStock, metadata, expanded: initialExpanded }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(initialExpanded ?? false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(!!getApiKey());
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>(getProvider());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  const handleSend = useCallback(async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query) return;

    const userMsg: Message = { id: generateId(), role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Try client-side engine first
    const engineResponse = processQuery(query, stocks, contextStock, metadata);

    if (engineResponse) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        text: engineResponse.text,
        source: 'engine',
      }]);
      return;
    }

    // Fall back to LLM
    setIsTyping(true);
    try {
      const llmResponse = await queryLLM(query, contextStock);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        text: llmResponse.text,
        source: 'llm',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
        source: 'llm',
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, stocks, contextStock, metadata]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setHasApiKey(true);
      setShowApiKeyInput(false);
      setApiKeyInput('');
    }
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setHasApiKey(false);
  };

  const suggestions = contextStock ? SUGGESTIONS : GENERAL_SUGGESTIONS;

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="card p-4 w-full text-left hover:bg-surface-hover transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-medium t-primary group-hover:text-accent-light transition-colors">AI Copilot</span>
            <p className="text-xs t-muted">Ask questions about {contextStock ? contextStock.ticker : 'the market'}</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent/15 flex items-center justify-center">
            <svg className="w-3 h-3 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-xs font-semibold t-tertiary uppercase tracking-wider">AI Copilot</span>
          {contextStock && <span className="text-xs text-accent-light font-mono">{contextStock.ticker}</span>}
        </div>
        <div className="flex items-center gap-1">
          {/* API Key toggle */}
          <button
            onClick={() => setShowApiKeyInput(v => !v)}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              hasApiKey ? 'bg-bullish/15 text-bullish' : 'bg-surface-hover t-muted hover:t-secondary'
            }`}
            title={hasApiKey ? 'API key set' : 'Set API key for AI responses'}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>
          <button
            onClick={() => { setIsExpanded(false); setMessages([]); }}
            className="w-6 h-6 rounded flex items-center justify-center bg-surface-hover t-muted hover:t-secondary transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* API Key + Provider input */}
      {showApiKeyInput && (
        <div className="px-4 py-3 border-b border-surface-border bg-surface-tertiary space-y-2">
          <div>
            <p className="text-xs t-muted mb-1.5">LLM Provider:</p>
            <div className="flex gap-1.5">
              {getProviders().map(p => (
                <button
                  key={p.key}
                  onClick={() => { setSelectedProvider(p.key); setProvider(p.key); }}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    selectedProvider === p.key
                      ? 'bg-accent/20 text-accent-light ring-1 ring-accent/30'
                      : 'bg-surface-hover t-muted hover:t-secondary'
                  }`}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs t-muted mb-1.5">API key ({selectedProvider === 'groq' ? 'console.groq.com — free' : selectedProvider === 'openrouter' ? 'openrouter.ai — free tier' : 'huggingface.co'}):</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder={selectedProvider === 'groq' ? 'gsk_...' : selectedProvider === 'openrouter' ? 'sk-or-...' : 'hf_...'}
                className="input-field flex-1 text-xs"
              />
              <button onClick={handleSaveApiKey} className="text-xs px-2 py-1 rounded bg-accent/15 text-accent-light hover:bg-accent/25 transition-colors">Save</button>
              {hasApiKey && (
                <button onClick={handleClearApiKey} className="text-xs px-2 py-1 rounded bg-bearish/15 text-bearish hover:bg-bearish/25 transition-colors">Clear</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="h-72 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs t-muted mb-3">Ask me anything about {contextStock ? contextStock.ticker : 'stocks'}</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-surface-hover t-secondary hover:text-accent-light hover:bg-accent/10 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-accent/15 text-accent-light'
                : 'bg-surface-tertiary t-primary'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="space-y-1.5">
                  <div className="whitespace-pre-wrap text-xs leading-relaxed" dangerouslySetInnerHTML={{
                    __html: formatMarkdown(msg.text),
                  }} />
                  {msg.source && (
                    <p className="text-[10px] t-faint">
                      {msg.source === 'engine' ? 'Instant' : 'AI'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs">{msg.text}</p>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface-tertiary rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-surface-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={contextStock ? `Ask about ${contextStock.ticker}...` : 'Ask about stocks...'}
            className="input-field flex-1 text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="px-3 py-1.5 rounded-lg bg-accent/15 text-accent-light hover:bg-accent/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Simple markdown formatter for bold and tables */
function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}
