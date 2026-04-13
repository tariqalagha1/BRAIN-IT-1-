import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <div className="card auth-card">
        <h1>ClinicalMind</h1>
        <p className="state-text">Secure operations dashboard for clinical teams.</p>
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
          <Link href="/login" className="button">
            Login
          </Link>
          <Link href="/register" className="button button-muted">
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
