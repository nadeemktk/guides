import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, Send, User, Sparkles, TrendingUp, AlertTriangle,
  FileText, DollarSign, Car, Users, BarChart2, Trash2,
  Loader2, Mic, ChevronDown, Settings
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const QUICK_ACTIONS = [
  { label: 'Unpaid invoices', icon: FileText, query: 'Show me all unpaid invoices and their amounts' },
  { label: 'Outstanding payments', icon: AlertTriangle, query: 'Which clients have outstanding unpaid trip payments?' },
  { label: 'Monthly revenue', icon: TrendingUp, query: 'What is the total revenue this month? Give me a summary.' },
  { label: 'Vehicle expenses', icon: Car, query: 'Show me the vehicle expense summary for this month' },
  { label: 'Driver salaries', icon: Users, query: 'Which drivers have pending salary payments?' },
  { label: 'Financial summary', icon: BarChart2, query: 'Give me a complete financial summary including revenue, expenses, and profit' },
  { label: 'Pending invoices', icon: DollarSign, query: 'List all invoices with outstanding balances' },
  { label: 'Top clients', icon: TrendingUp, query: 'Who are our top 5 clients by revenue?' }
]

const SUGGESTIONS = [
  "How much profit did we make this month?",
  "Show unpaid trips older than 30 days",
  "Which vehicle has the highest expenses?",
  "Generate a summary of this week's trips",
  "Are there any anomalies in expenses?",
  "Send reminders to clients with unpaid balances"
]

function formatContent(text: string) {
  // Convert markdown-like formatting to HTML
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1 rounded text-blue-300 text-xs font-mono">$1</code>')
    .replace(/^### (.*)/gm, '<h3 class="font-bold text-slate-100 mt-3 mb-1">$1</h3>')
    .replace(/^## (.*)/gm, '<h2 class="font-bold text-slate-100 mt-4 mb-2 text-base">$1</h2>')
    .replace(/^- (.*)/gm, '<li class="ml-4 text-slate-300">• $1</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br />')
}

export default function AIChatModule() {
  const { user } = useAuth()
  const { settings, setCurrentPage } = useApp()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [apiKey, setApiKey] = useState(settings.anthropic_key || '')
  const [showApiKeyInput, setShowApiKeyInput] = useState(!settings.anthropic_key)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (settings.anthropic_key) {
      setApiKey(settings.anthropic_key)
      setShowApiKeyInput(false)
    }
  }, [settings.anthropic_key])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setShowSuggestions(false)

    const conversationMessages = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content
    }))

    const result = await window.api.aiChat({
      messages: conversationMessages,
      userId: user?.id,
      sessionId,
      apiKey: apiKey || undefined
    })

    if (result.error) {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: `⚠️ **Error:** ${result.error}\n\n${!apiKey ? 'Please configure your Anthropic API key in Settings to use CST CHAT INTELLIGENT.' : ''}`,
        timestamp: new Date()
      }])
    } else {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: result.content || 'I was unable to generate a response.',
        timestamp: new Date()
      }])
    }
    setLoading(false)
  }, [messages, loading, user, sessionId, apiKey])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([])
    setShowSuggestions(true)
  }

  const handleNavigation = (page: string) => {
    if (['invoices','trips','soa','reports','expenses','salaries','drivers','vehicles'].includes(page)) {
      setCurrentPage(page as any)
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100">CST CHAT INTELLIGENT</h1>
            <p className="text-xs text-slate-500">AI-powered business assistant with full system awareness</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowApiKeyInput(!showApiKeyInput)} className="btn-icon" title="Configure API Key">
            <Settings className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-ghost text-xs">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Online</span>
          </div>
        </div>
      </div>

      {/* API Key input */}
      {showApiKeyInput && (
        <div className="card p-4 mb-4 border-blue-700/50">
          <p className="text-sm font-medium text-slate-200 mb-2">Anthropic API Key</p>
          <div className="flex gap-2">
            <input
              className="input flex-1 font-mono text-xs"
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <button
              onClick={async () => {
                await window.api.saveSettings({ anthropic_key: apiKey })
                setShowApiKeyInput(false)
              }}
              className="btn-primary"
            >
              Save
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Get your API key from console.anthropic.com. It's stored locally only.</p>
        </div>
      )}

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Quick Actions:</p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.query)}
                  className="card p-3 text-left hover:border-blue-600/50 hover:bg-blue-600/5 transition-all group"
                >
                  <Icon className="w-4 h-4 text-blue-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-medium text-slate-300">{action.label}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-glow opacity-80">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Welcome to CST CHAT INTELLIGENT</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              I have real-time access to all your business data — trips, invoices, payments, expenses, driver salaries, and more.
              Ask me anything about your transport operations!
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-full text-slate-300 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-glow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                />
              ) : (
                <p className="leading-relaxed">{msg.content}</p>
              )}
              <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-600'}`}>
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-glow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>CST CHAT INTELLIGENT is analyzing your data...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0">
        <div className="card p-2 flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-200 placeholder-slate-500 resize-none max-h-32 min-h-[36px] py-2 px-2"
            placeholder="Ask anything about your business... (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="btn-primary flex-shrink-0 self-end"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-600 mt-2">
          Powered by Claude claude-opus-4-7 · CST CHAT INTELLIGENT has read-only access to your business data
        </p>
      </div>
    </div>
  )
}
