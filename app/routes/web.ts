import type { Router, TylixRequest, TylixResponse } from '@tylix/core'
import { Contact } from '../models/Contact.js'
import { Post } from '../models/Post.js'
import { notifyContact } from '../mail/notifyContact.js'

const SUBJECTS = ['General enquiry', 'Volunteer', 'Refer a family', 'Donation question']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const hits = new Map<string, number[]>()

// Sliding-window limiter, in memory. Fine for a single server process.
function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  return false
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function excerpt(text: unknown, max = 180): string {
  const flat = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  return flat.length > max ? flat.slice(0, max).trimEnd() + '…' : flat
}

export async function routes(router: Router) {
  // ---- Public blog (read-only) ----
  router.get('/api/blog', async (_req: TylixRequest, res: TylixResponse): Promise<void> => {
    const rows: any[] = (await Post.all()) as any[]
    const data = rows
      .slice()
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 100)
      .map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: excerpt(p.body),
        created_at: p.created_at,
      }))
    res.json({ data })
  })

  router.get('/api/blog/:id', async (req: TylixRequest, res: TylixResponse): Promise<void> => {
    const id = Number.parseInt(String((req as any).params?.id ?? ''), 10)
    if (!Number.isInteger(id) || id < 1) {
      res.status(404)
      res.json({ error: 'Not found' })
      return
    }

    const post: any = await Post.find(id)
    if (!post) {
      res.status(404)
      res.json({ error: 'Not found' })
      return
    }

    res.json({
      data: { id: post.id, title: post.title, body: post.body, created_at: post.created_at },
    })
  })

  // ---- Public contact form ----
  router.post('/api/contact', async (req: TylixRequest, res: TylixResponse): Promise<void> => {
    const body = ((req as any).body ?? {}) as Record<string, unknown>

    // Honeypot: real visitors never fill this hidden field.
    if (clean(body.website, 200)) {
      res.status(201)
      res.json({ ok: true })
      return
    }
    const forwarded = String((req as any).headers?.['x-forwarded-for'] ?? '').split(',').pop()?.trim() ?? ''
    const ip = forwarded || (req as any).ip || (req as any).socket?.remoteAddress || 'unknown'

    if (limited(`ip:${ip}`, 5, 10 * 60 * 1000) || limited('global', 100, 60 * 60 * 1000)) {
      res.status(429)
      res.json({ error: 'Too many messages. Please try again later.' })
      return
    }

    const name = clean(body.name, 120)
    const email = clean(body.email, 190)
    const phone = clean(body.phone, 30)
    const subject = clean(body.subject, 60)
    const message = clean(body.message, 5000)

    const errors: Record<string, string[]> = {}
    if (!name) errors.name = ['Please enter your name.']
    if (!EMAIL_RE.test(email)) errors.email = ['Please enter a valid email address.']
    if (!SUBJECTS.includes(subject)) errors.subject = ['Please choose a subject.']
    if (message.length < 10) errors.message = ['Please write a little more (at least 10 characters).']

    if (Object.keys(errors).length > 0) {
      res.status(422)
      res.json({ errors })
      return
    }

    await Contact.create({ name, email, phone, subject, message })

    // Fire and forget: a mail failure must never lose the message or fail the form.
    notifyContact({ name, email, phone, subject, message }).catch((err) => {
      console.error('Contact notification failed:', err)
    })

    res.status(201)
    res.json({ ok: true })
  })
}