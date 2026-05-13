import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, LogOut } from "lucide-react"
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
    <div className="min-h-screen flex items-center justify-center p-8 bg-blue-600">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Chat — Inloggen</CardTitle>
          <CardDescription>
            Test accounts: alice@test.nl / bob@test.nl / test@test.nl — wachtwoord: test1234
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="alice@test.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Laden..." : "Inloggen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
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
          const alreadyExists = prev.some((m) => m.id === incoming.id)
          if (alreadyExists) return prev
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

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function getColor(email: string) {
    const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"]
    let hash = 0
    for (const c of email) hash = (hash + c.charCodeAt(0)) % colors.length
    return colors[hash]
  }

  function getInitial(email: string) {
    return email[0].toUpperCase()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-blue-600">
      <Card className="w-full max-w-2xl flex flex-col h-[85vh]">
        <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Chat</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="size-4" />
          </Button>
        </CardHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          <div className="flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground text-sm mt-8">Nog geen berichten. Stuur het eerste bericht!</p>
            )}
            {messages.map((msg) => {
              const isMe = msg.user_id === user.id
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`size-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getColor(msg.email)}`}>
                    {getInitial(msg.email)}
                  </div>
                  <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && <span className="text-xs text-muted-foreground px-1">{msg.email}</span>}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-muted-foreground px-1">
                      {new Date(msg.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-3">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              placeholder="Typ een bericht..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </Card>
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
    <div className="min-h-screen flex items-center justify-center bg-blue-600">
      <div className="text-white text-lg">Laden...</div>
    </div>
  )

  if (!user) return <LoginPage onLogin={setUser} />
  return <ChatPage user={user} />
}
