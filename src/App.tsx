import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, LogOut, MessageCircle } from "lucide-react"
import type { User } from "@supabase/supabase-js"

type Message = {
  id: string
  user_id: string
  email: string
  content: string
  created_at: string
}

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else if (data.user) onLogin(data.user)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-white/20 backdrop-blur p-4 rounded-2xl">
            <MessageCircle className="size-8 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Chat</h1>
          <p className="text-blue-100 text-sm text-center">Log in om te beginnen met chatten</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="alice@test.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11">
              {loading ? "Laden..." : "Inloggen"}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-2">Test accounts (wachtwoord: test1234)</p>
            <div className="flex flex-col gap-1">
              {["alice@test.nl", "bob@test.nl", "test@test.nl"].map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => setEmail(acc)}
                  className="text-left text-xs text-blue-500 hover:text-blue-700 hover:underline"
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getColor(email: string) {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-orange-500", "bg-pink-500", "bg-cyan-500",
  ]
  let hash = 0
  for (const c of email) hash = (hash + c.charCodeAt(0)) % colors.length
  return colors[hash]
}

function getInitial(email: string) {
  return email[0].toUpperCase()
}

function ChatPage({ user }: { user: User }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data)
      })

    const channel = supabase
      .channel("messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const incoming = payload.new as Message
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev
          return [...prev, incoming]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setSending(true)
    const optimistic: Message = {
      id: crypto.randomUUID(),
      user_id: user.id,
      email: user.email!,
      content: input.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setInput("")
    const { data } = await supabase.from("messages").insert({
      user_id: user.id,
      email: user.email,
      content: optimistic.content,
    }).select().single()
    if (data) {
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? data : m))
    }
    setSending(false)
  }

  const name = user.email?.split("@")[0] ?? "?"

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-600 to-indigo-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <MessageCircle className="size-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold leading-tight">Chat</p>
            <p className="text-blue-200 text-xs">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <LogOut className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 mt-16 text-white/50">
              <MessageCircle className="size-10" />
              <p className="text-sm">Nog geen berichten. Zeg hallo!</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe = msg.user_id === user.id
            const prevMsg = messages[i - 1]
            const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id

            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                <div className="w-8 shrink-0">
                  {showAvatar && !isMe && (
                    <div className={`size-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getColor(msg.email)}`}>
                      {getInitial(msg.email)}
                    </div>
                  )}
                </div>
                <div className={`flex flex-col gap-1 max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                  {showAvatar && !isMe && (
                    <span className="text-xs text-white/60 px-1">{msg.email.split("@")[0]}</span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMe
                      ? "bg-white text-gray-800 rounded-br-md"
                      : "bg-white/15 backdrop-blur text-white rounded-bl-md"
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-white/40 px-1">
                    {new Date(msg.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 bg-white/10 backdrop-blur border-t border-white/10">
        <form onSubmit={sendMessage} className="max-w-2xl mx-auto flex gap-2">
          <Input
            placeholder={`Bericht als ${name}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            className="flex-1 rounded-xl bg-white/20 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30 h-11"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
            className="rounded-xl h-11 w-11 bg-white text-blue-600 hover:bg-blue-50 shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="text-white/80 text-sm animate-pulse">Laden...</div>
    </div>
  )

  if (!user) return <LoginPage onLogin={setUser} />
  return <ChatPage user={user} />
}
