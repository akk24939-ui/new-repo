// Dr AI — Floating AI Medical Assistant Button
// Links to: https://vitasage-ai-513884026210.us-west1.run.app/
const DR_AI_URL = "https://vitasage-ai-513884026210.us-west1.run.app/";

export default function DrAIButton() {
    return (
        <a
            href={DR_AI_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Dr AI — AI Medical Assistant"
            style={{
                position: "fixed",
                bottom: "28px",
                right: "28px",
                zIndex: 9999,
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0A1F44 0%, #0d9488 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                textDecoration: "none",
                boxShadow: "0 8px 32px rgba(13,148,136,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "pointer",
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.12)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(13,148,136,0.7), 0 0 0 2px rgba(255,255,255,0.15)";
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(13,148,136,0.5), 0 0 0 1px rgba(255,255,255,0.1)";
            }}
        >
            <span style={{ fontSize: "22px", lineHeight: 1 }}>🤖</span>
            <span style={{ fontSize: "9px", fontWeight: "900", letterSpacing: "0.05em", marginTop: "2px", color: "rgba(255,255,255,0.9)" }}>Dr AI</span>
            {/* Pulse ring */}
            <span style={{
                position: "absolute",
                inset: "-4px",
                borderRadius: "50%",
                border: "2px solid rgba(13,148,136,0.4)",
                animation: "drAIPulse 2s ease-in-out infinite",
            }} />
            <style>{`
                @keyframes drAIPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0; transform: scale(1.25); }
                }
            `}</style>
        </a>
    );
}
