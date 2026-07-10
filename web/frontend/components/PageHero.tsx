/**
 * Premium page header — grid background, ambient glow, gradient title, eyebrow + lead.
 * Gives every interior page (legal, info, stats) a consistent high-end look.
 */
export default function PageHero({
  eyebrow,
  title,
  lead,
  icon,
}: {
  eyebrow?: string
  title: string
  lead?: string
  icon?: string
}) {
  return (
    <section className="relative overflow-hidden grid-bg">
      {/* Ambient glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(0,229,196,0.10) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ width: 600, height: 400, borderRadius: '50%', background: 'rgba(0,229,196,0.12)', filter: 'blur(120px)', opacity: 0.4 }}
      />

      <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-12 text-center z-10">
        {icon && (
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 fade-in-up"
            style={{ background: 'rgba(0,229,196,0.08)', border: '1px solid rgba(0,229,196,0.25)' }}
          >
            <span className="text-3xl">{icon}</span>
          </div>
        )}
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4 fade-in-up-1" style={{ color: '#00e5c4' }}>
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4 gradient-text fade-in-up-2 leading-tight">
          {title}
        </h1>
        {lead && (
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed fade-in-up-3">
            {lead}
          </p>
        )}
      </div>
    </section>
  )
}
