import { Logo } from "@/components/logo";

// Static and bilingual on purpose: the service worker precaches this page, so it cannot depend on cookies.
export default function OfflinePage() {
  return (
    <main className="center-screen">
      <div className="card auth-card">
        <Logo size={56} />
        <span className="green-rule" />
        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 650 }}>គ្មានអ៊ីនធឺណិត</h1>
        <p style={{ margin: 0, color: "var(--fg-3)" }}>សូមពិនិត្យការតភ្ជាប់ របស់អ្នក រួចព្យាយាមម្តងទៀត។</p>
        <h2 style={{ margin: "16px 0 4px", fontSize: 17, fontWeight: 650 }}>You are offline</h2>
        <p style={{ margin: 0, color: "var(--fg-3)" }}>Check your connection and try again. HIG Admin needs the network to show live data.</p>
        {/* A full page load on purpose: it retries the network instead of a client-side transition. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>
          Try again · ព្យាយាមម្តងទៀត
        </a>
      </div>
    </main>
  );
}
