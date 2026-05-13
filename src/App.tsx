import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { User } from "@supabase/supabase-js"

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"login" | "signup">("login")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setError("Check je e-mail om je account te bevestigen.")
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-blue-600">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Welkom!</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Uitloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-blue-600">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Inloggen" : "Account aanmaken"}</CardTitle>
          <CardDescription>
            {mode === "login" ? "Log in met je e-mail en wachtwoord." : "Maak een nieuw account aan."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="jij@voorbeeld.nl"
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
              {loading ? "Laden..." : mode === "login" ? "Inloggen" : "Registreren"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError("") }}
            >
              {mode === "login" ? "Nog geen account? Registreren" : "Al een account? Inloggen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
