import { useAuth } from "../authContext"
import AppIcon from "../components/AppIcon"

const C = {
  bg: "#07131b",
  bgGlow: "#0f2436",
  card: "rgba(18, 38, 58, 0.9)",
  cardStrong: "#11283a",
  border: "rgba(148, 163, 184, 0.18)",
  accent: "#71f0b0",
  accentStrong: "#35d98c",
  text: "#edf6ff",
  muted: "#9bb2c6",
  panel: "rgba(12, 20, 29, 0.72)",
}

export default function Login() {
  const { signInWithGoogle } = useAuth()

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top, rgba(53, 217, 140, 0.18), transparent 30%), linear-gradient(180deg, #07131b 0%, #0d1d2b 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, rgba(113, 240, 176, 0.08), transparent 30%, rgba(31, 58, 77, 0.18))",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: 420,
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          background: "rgba(12, 20, 29, 0.7)",
          border: `1px solid ${C.border}`,
          borderRadius: 28,
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.42)",
          backdropFilter: "blur(10px)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "28px 28px 14px",
            textAlign: "center",
            background: "linear-gradient(180deg, rgba(17, 40, 58, 0.94), rgba(12, 20, 29, 0.4))",
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, rgba(113, 240, 176, 0.22), rgba(53, 217, 140, 0.06))",
              border: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              boxShadow: "0 16px 26px rgba(53, 217, 140, 0.12)",
              fontSize: 32,
            }}>
              <AppIcon name="goals" size={34} color={C.accent} strokeWidth={1.6} />
            </div>

            <div style={{
              color: C.accent,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 3.2,
              marginBottom: 12,
            }}>
              IL CALCETTO
            </div>

            <h1 style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: C.text,
              fontWeight: 900,
            }}>
              Entra in campo
            </h1>

            <p style={{
              margin: "12px 0 0",
              color: C.muted,
              fontSize: 15,
              lineHeight: 1.6,
            }}>
              Gestisci classifica, marcatori, pagelle e storico in un solo posto.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
              marginTop: 22,
            }}>
              {[
                ["trophy", "Classifica"],
                ["boots", "Marcatori"],
                ["ratings", "Pagelle"],
              ].map(([icon, label]) => (
                <div key={label} style={{
                  background: "rgba(17, 40, 58, 0.7)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "10px 8px",
                  color: C.text,
                  fontWeight: 700,
                  fontSize: 12,
                }}>
                  <AppIcon name={icon} size={18} color={C.accent} strokeWidth={1.8} />
                  <div>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding: 28,
            background: "linear-gradient(180deg, rgba(9, 18, 27, 0.66), rgba(17, 40, 58, 0.44))",
          }}>
            <div style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: 20,
              marginBottom: 18,
            }}>
              <div style={{
                color: C.muted,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}>
                Accesso rapido
              </div>
              <div style={{
                color: C.text,
                fontSize: 18,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}>
                <span>Accedi con Google</span>
                <span style={{
                  background: "rgba(113, 240, 176, 0.12)",
                  color: C.accent,
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 800,
                }}>
                  Sicuro
                </span>
              </div>
            </div>

            <button onClick={signInWithGoogle} style={{
              width: "100%",
              background: "#fff",
              color: "#121826",
              border: "none",
              borderRadius: 14,
              padding: "16px 18px",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              boxShadow: "0 14px 28px rgba(255, 255, 255, 0.12)",
              transition: "transform 0.18s ease, box-shadow 0.18s ease",
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)"
              e.currentTarget.style.boxShadow = "0 18px 30px rgba(255, 255, 255, 0.18)"
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 14px 28px rgba(255, 255, 255, 0.12)"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continua con Google
            </button>

            <div style={{
              textAlign: "center",
              color: C.muted,
              fontSize: 12,
              marginTop: 18,
              lineHeight: 1.5,
            }}>
              Nessun account? Potrai crearne uno direttamente con Google.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}