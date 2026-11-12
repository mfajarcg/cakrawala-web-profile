import { Globe, Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

export function Contact() {
  const { t, lang } = useI18n()
  const c = t.contact
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`[Cakrawala] ${form.name}`)
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`)
    window.location.href = `mailto:${c.email}?subject=${subject}&body=${body}`
  }

  return (
    <Panel id="contact">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{c.title}</h2>
      <p className="mt-2 text-sm text-[#101418]/70">{c.lead}</p>

      <div className="mt-6 space-y-4">
        <div className="flex gap-3">
          <MapPin className="mt-0.5 shrink-0 text-[#408fb4]" size={18} aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#101418]/50">
              {c.addressLabel}
            </p>
            <p className="mt-0.5 text-sm text-[#101418]/85">{c.address}</p>
            <a
              href={c.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-semibold text-[#2e6f8e] underline underline-offset-2"
            >
              {c.map}
            </a>
          </div>
        </div>
        <div className="flex gap-3">
          <Phone className="mt-0.5 shrink-0 text-[#408fb4]" size={18} aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#101418]/50">
              {c.phoneLabel}
            </p>
            <a href={`tel:${c.phone.replace(/[^+\d]/g, '')}`} className="text-sm text-[#101418]/85">
              {c.phone}
            </a>
          </div>
        </div>
        <div className="flex gap-3">
          <Mail className="mt-0.5 shrink-0 text-[#408fb4]" size={18} aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#101418]/50">
              {c.emailLabel}
            </p>
            <a href={`mailto:${c.email}`} className="text-sm text-[#101418]/85">
              {c.email}
            </a>
          </div>
        </div>
        <div className="flex gap-3">
          <Globe className="mt-0.5 shrink-0 text-[#408fb4]" size={18} aria-hidden="true" />
          <a
            href="https://www.linkedin.com/company/cartenz"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[#101418]/85"
          >
            LinkedIn{lang === 'id' ? ' — PT Cartenz Technology Indonesia' : ''}
          </a>
        </div>
      </div>

      <form onSubmit={send} className="mt-7 space-y-3">
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={c.form.name}
          className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#408fb4]"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={c.form.email}
          className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#408fb4]"
        />
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder={c.form.message}
          className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#408fb4]"
        />
        <button
          type="submit"
          className="rounded-full bg-[#408fb4] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#2e6f8e] focus-visible:outline-2 focus-visible:outline-[#101418]"
        >
          {c.form.send}
        </button>
        <p className="text-xs text-[#101418]/50">{c.form.note}</p>
      </form>
    </Panel>
  )
}
