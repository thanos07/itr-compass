import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section-py">
      <div className="container-page flex flex-col items-center text-center">
        <p className="eyebrow"><span className="trace-tick" aria-hidden="true" />404</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold" style={{ color: "var(--heading)" }}>Page not found</h1>
        <p className="mt-4 max-w-[50ch]" style={{ color: "var(--text-soft)" }}>The requested page does not exist or has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/" className="btn btn-secondary">Back home</Link><Link href="/prepare" className="btn btn-primary">Prepare return</Link></div>
      </div>
    </section>
  );
}
