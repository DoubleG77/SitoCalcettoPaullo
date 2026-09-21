import { useState } from "react"
import { useAuth } from "./authContext"
import Login from "./pages/Login"
import Home from "./pages/Home"
import Classifica from "./pages/Classifica"
import Marcatori from "./pages/Marcatori"
import Storico from "./pages/Storico"
import Pagelle from "./pages/Pagelle"
import Profilo from "./pages/Profilo"
import NuovaPartita from "./pages/NuovaPartita"
import Setup from "./pages/Setup"
import { useSignedUrl } from "./hooks/useSignedUrl"

const NAV = [
  { id: "home", label: "Home", icon: "⚽" },
  { id: "classifica", label: "Classifica", icon: "🏆" },
  { id: "marcatori", label: "Marcatori", icon: "👟" },
  { id: "storico", label: "Storico", icon: "📅" },
  { id: "pagelle", label: "Pagelle", icon: "🗳️" },
  { id: "profilo", label: "Profilo", icon: "👤" },
  { id: "nuova", label: "Nuova", icon: "➕" },
]

function HeaderAvatar({ player, onClick }) {
  const avatarUrl = useSignedUrl(player?.avatar_url)
  return (
    <button onClick={onClick} aria-label="Apri menu profilo" title="Menu profilo" style={{
      width: 38, height: 38, borderRadius: "50%",
      background: "#00e67620", border: "2px solid #00e67640",
      overflow: "hidden", cursor: "pointer", padding: 0,
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="Avatar del profilo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: "#00e676", fontWeight: 900, fontSize: 15 }}>
            {player?.name?.[0]?.toUpperCase()}
          </span>
      }
    </button>
  )
}

export default function App() {
  const [page, setPage] = useState("home")
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const { user, player, loading, signOut, refreshPlayer } = useAuth()

  if (loading) return (
    <div style={{ background: "linear-gradient(180deg, #07121b 0%, #0d1b29 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#71f0b0", fontSize: 32 }}>⚽</div>
    </div>
  )

  if (!user) return <Login />
  if (!player) return <Setup onComplete={refreshPlayer} />

  const current = NAV.find(n => n.id === page)

  const pages = {
    home: <Home onNavigate={setPage} />,
    classifica: <Classifica />,
    marcatori: <Marcatori />,
    storico: <Storico />,
    pagelle: <Pagelle />,
    profilo: <Profilo />,
    nuova: <NuovaPartita />,
  }

  return (
    <div style={{
      background: "linear-gradient(180deg, rgba(5,10,15,0.96) 0%, rgba(11,19,29,0.96) 100%)",
      minHeight: "100vh",
      maxWidth: 430,
      margin: "0 auto",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 0 0 1px rgba(148, 163, 184, 0.08)",
    }}>
      <div style={{
        background: "rgba(10, 18, 25, 0.92)",
        borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
        backdropFilter: "blur(10px)",
        padding: "14px 18px",
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <div style={{ color: "#71f0b0", fontSize: 10, letterSpacing: 3, fontWeight: 800, marginBottom: 3 }}>IL CALCETTO</div>
          <div style={{ color: "#edf6ff", fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{current?.icon}</span>
            <span>{current?.label}</span>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <HeaderAvatar
            player={player}
            onClick={() => setProfileMenuOpen(open => !open)}
          />
          {profileMenuOpen && (
            <div style={{
              position: "absolute",
              top: 48,
              right: 0,
              width: 160,
              background: "rgba(16, 35, 50, 0.98)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: 14,
              padding: 8,
              boxShadow: "0 18px 38px rgba(0,0,0,0.38)",
              zIndex: 30,
            }}>
              <button onClick={() => { setPage("profilo"); setProfileMenuOpen(false) }} style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#edf6ff",
                padding: "10px 12px",
                textAlign: "left",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}>Profilo</button>
              <button onClick={() => {
                if (window.confirm("Vuoi uscire dall'app?")) signOut()
              }} style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#ff8b9d",
                padding: "10px 12px",
                textAlign: "left",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
              }}>Esci</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, padding: "18px 16px 92px" }}>
        {pages[page]}
      </div>

      <div style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        background: "rgba(12, 22, 30, 0.96)",
        borderTop: "1px solid rgba(148, 163, 184, 0.12)",
        backdropFilter: "blur(12px)",
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        zIndex: 20,
      }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} aria-label={item.label}
            aria-current={page === item.id ? "page" : undefined} style={{
            background: page === item.id ? "rgba(113, 240, 176, 0.08)" : "transparent",
            border: "none",
            padding: "10px 2px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
            borderTop: page === item.id ? "2px solid #71f0b0" : "2px solid transparent",
            transition: "all 0.2s ease",
          }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: page === item.id ? "#71f0b0" : "#7f93a7" }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}