import { useEffect, useState } from "react"
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
import AppIcon from "./components/AppIcon"
import {
  dismissStoredNotification,
  getStoredNotifications,
  requestNotificationPermission,
  shouldAskForNotificationPermission,
} from "./notifications"

const NAV = [
  { id: "home", label: "Home", icon: "goals" },
  { id: "classifica", label: "Classifica", icon: "trophy" },
  { id: "marcatori", label: "Marcatori", icon: "boots" },
  { id: "storico", label: "Storico", icon: "calendar" },
  { id: "pagelle", label: "Pagelle", icon: "ratings" },
  { id: "profilo", label: "Profilo", icon: "user" },
  { id: "nuova", label: "Nuova", icon: "plus" },
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
  const [notifications, setNotifications] = useState(getStoredNotifications)
  const { user, player, loading, profileError, signOut, refreshPlayer } = useAuth()

  useEffect(() => {
    if (user && player && shouldAskForNotificationPermission()) {
      requestNotificationPermission()
    }
  }, [user, player])

  const latestNotification = notifications[0]

  if (loading) return (
    <div style={{ background: "linear-gradient(180deg, #07121b 0%, #0d1b29 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <AppIcon name="goals" size={34} color="#71f0b0" strokeWidth={1.8} title="Caricamento" />
    </div>
  )

  if (!user) return <Login />
  if (profileError && !player) return (
    <div style={{ background: "linear-gradient(180deg, #07121b 0%, #0d1b29 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, color: "#edf6ff", textAlign: "center" }}>
        <AppIcon name="user" size={42} color="#ff7c8b" strokeWidth={1.6} />
        <h1 style={{ fontSize: 22, margin: "18px 0 10px" }}>Profilo non trovato</h1>
        <p style={{ color: "#9bb2c6", lineHeight: 1.6, margin: 0 }}>{profileError}</p>
        <p style={{ color: "#9bb2c6", fontSize: 13, lineHeight: 1.5, margin: "16px 0 0" }}>
          Account Google: {user.email || "email non disponibile"}
        </p>
        <button onClick={signOut} style={{ marginTop: 22, background: "#71f0b0", color: "#07131b", border: "none", borderRadius: 10, padding: "12px 18px", fontWeight: 800, cursor: "pointer" }}>
          Esci e cambia account
        </button>
      </div>
    </div>
  )
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
    <div className="app-shell" style={{
      background: "linear-gradient(180deg, rgba(5,10,15,0.96) 0%, rgba(11,19,29,0.96) 100%)",
      minHeight: "100vh",
      margin: "0 auto",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 0 0 1px rgba(148, 163, 184, 0.08)",
    }}>
      {latestNotification && (
        <div style={{
          margin: "12px 16px 0",
          background: "linear-gradient(135deg, rgba(113, 240, 176, 0.18), rgba(247, 199, 93, 0.14))",
          border: "1px solid rgba(113, 240, 176, 0.35)",
          borderRadius: 16,
          padding: "12px 14px",
          boxShadow: "0 10px 20px rgba(0,0,0,0.14)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#71f0b0", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>Notifica</div>
              <div style={{ color: "#edf6ff", fontSize: 15, fontWeight: 800, marginTop: 4 }}>{latestNotification.title}</div>
              <div style={{ color: "#dceaf8", fontSize: 12, marginTop: 4 }}>{latestNotification.body}</div>
              <button onClick={() => {
                dismissStoredNotification(latestNotification.id)
                setNotifications(getStoredNotifications())
                setPage("pagelle")
              }} style={{
                marginTop: 10,
                background: "#71f0b0",
                color: "#07131b",
                border: "none",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                cursor: "pointer",
              }}>Vai alle pagelle</button>
            </div>
            <button onClick={() => {
              dismissStoredNotification(latestNotification.id)
              setNotifications(getStoredNotifications())
            }} style={{
              background: "transparent",
              border: "none",
              color: "#dceaf8",
              fontSize: 18,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }} aria-label="Chiudi notifica">×</button>
          </div>
        </div>
      )}

      <div className="app-header" style={{
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <img src="/logo-square.jpg" alt="Logo Calcetto Paullo" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 7 }} />
            <div style={{ color: "#71f0b0", fontSize: 10, letterSpacing: 3, fontWeight: 800 }}>IL CALCETTO</div>
          </div>
          <div style={{ color: "#edf6ff", fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
            <AppIcon name={current?.icon} size={18} color="#71f0b0" strokeWidth={2.2} />
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

      <main className="app-content" style={{ flex: 1, padding: "18px 16px 92px" }}>
        <div className="app-content-inner">
          {pages[page]}
        </div>
      </main>

      <nav className="app-nav" aria-label="Navigazione principale" style={{
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
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        zIndex: 20,
      }}>
        <div className="app-nav-inner">
        {NAV.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} aria-label={item.label}
            aria-current={page === item.id ? "page" : undefined} style={{
            background: page === item.id ? "rgba(113, 240, 176, 0.08)" : "transparent",
            border: "none",
            padding: "10px 2px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: 0,
            gap: 5,
            cursor: "pointer",
            borderTop: page === item.id ? "2px solid #71f0b0" : "2px solid transparent",
            transition: "all 0.2s ease",
          }}>
            <AppIcon name={item.icon} size={16} color={page === item.id ? "#71f0b0" : "#7f93a7"} strokeWidth={2.1} />
            <span style={{ fontSize: 9, fontWeight: 700, color: page === item.id ? "#71f0b0" : "#7f93a7" }}>
              {item.label}
            </span>
          </button>
        ))}
        </div>
      </nav>
    </div>
  )
}