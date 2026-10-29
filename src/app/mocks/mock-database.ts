import { Injectable, inject } from '@angular/core'
import { HttpErrorResponse, HttpRequest } from '@angular/common/http'
import { createStore, get, set } from 'idb-keyval'
import { z } from 'zod'
import {
  buyerInputSchema,
  conditionsSchema,
  intersects,
  now,
  offerInputSchema,
  propertyInputSchema,
  today,
  viewingInputSchema,
  workspaceSchema,
  type Workspace,
  type Mutation,
} from '../core/domain'
import { MockOptions } from './mock-options'
const fail = (status: number, message: string): never => {
  throw new HttpErrorResponse({ status, error: { message } })
}
@Injectable({ providedIn: 'root' })
export class MockDatabase {
  private options = inject(MockOptions)
  private db = createStore('haven-property-desk', 'workspace')
  private state?: Workspace
  private loading?: Promise<Workspace>
  private queue: Promise<unknown> = Promise.resolve()
  private unavailable() {
    this.options.storageAvailable.set(false)
    this.options.storageNotice.set(
      'Browser storage is unavailable. Your changes are kept for this session.',
    )
  }
  private async persist(state: Workspace) {
    try {
      await set('data', state, this.db)
    } catch {
      this.unavailable()
    }
  }
  private async seed() {
    const response = await fetch('/sample-workspace.json')
    if (!response.ok)
      return fail(503, 'The sample workspace could not be loaded. Please try again.')
    const raw = await response.json()
    const anchor = z.iso.date().parse(raw.anchorDate),
      offset = Date.parse(today()) - Date.parse(anchor)
    const shift = (value: string) => new Date(Date.parse(value) + offset).toISOString()
    for (const p of raw.properties) {
      p.listedOn = shift(p.listedOn).slice(0, 10)
      p.createdAt = shift(p.createdAt)
      p.updatedAt = shift(p.updatedAt)
    }
    for (const b of raw.buyers) {
      b.createdAt = shift(b.createdAt)
      b.updatedAt = shift(b.updatedAt)
    }
    for (const v of raw.viewings) {
      v.startsAt = shift(v.startsAt)
      v.createdAt = shift(v.createdAt)
      v.updatedAt = shift(v.updatedAt)
    }
    for (const o of raw.offers) {
      o.closingDate = shift(o.closingDate).slice(0, 10)
      o.createdAt = shift(o.createdAt)
      o.updatedAt = shift(o.updatedAt)
      if (o.closedAt) o.closedAt = shift(o.closedAt)
    }
    for (const e of raw.activity) e.createdAt = shift(e.createdAt)
    raw.anchorDate = today()
    return workspaceSchema.parse(raw)
  }
  private async load(): Promise<Workspace> {
    if (this.state) return this.state
    if (!this.loading)
      this.loading = (async () => {
        try {
          const data = await get('data', this.db),
            parsed = workspaceSchema.safeParse(data)
          if (parsed.success) return (this.state = parsed.data)
          if (data)
            this.options.storageNotice.set(
              'Incompatible local data was replaced with the original Haven workspace.',
            )
        } catch {
          this.unavailable()
        }
        this.state = await this.seed()
        await this.persist(this.state)
        return this.state
      })().catch(error => {
        this.loading = undefined
        throw error
      })
    return this.loading
  }
  request(req: HttpRequest<unknown>) {
    const job = this.queue.then(() => this.handle(req))
    this.queue = job.catch(() => undefined)
    return job
  }
  private async handle(req: HttpRequest<unknown>): Promise<unknown> {
    const state = await this.load(),
      path = req.url.replace(/^\/api/, ''),
      parts = path.split('/'),
      stamp = now()
    if (req.method === 'GET' && path === '/workspace') return structuredClone(state)
    if (req.method === 'GET' && path === '/properties') {
      const q = req.params,
        search = (q.get('search') || '').trim().toLowerCase()
      const items = state.properties
        .filter(
          p =>
            (!search ||
              [p.address, p.district, p.reference, p.description]
                .join(' ')
                .toLowerCase()
                .includes(search)) &&
            (!q.get('district') || p.district === q.get('district')) &&
            (!q.get('type') || p.type === q.get('type')) &&
            (!q.get('status') || p.status === q.get('status')) &&
            (!q.get('agent') || p.agentId === q.get('agent')) &&
            (q.get('featured') !== 'true' || p.featured) &&
            (!q.get('price') ||
              (q.get('price') === 'under-750'
                ? p.priceCents < 75000000
                : q.get('price') === '750-1250'
                  ? p.priceCents >= 75000000 && p.priceCents <= 125000000
                  : p.priceCents > 125000000)),
        )
        .sort((a, b) =>
          q.get('sort') === 'price-asc'
            ? a.priceCents - b.priceCents
            : q.get('sort') === 'price-desc'
              ? b.priceCents - a.priceCents
              : q.get('sort') === 'oldest'
                ? a.listedOn.localeCompare(b.listedOn)
                : b.updatedAt.localeCompare(a.updatedAt),
        )
      const size = Math.max(1, Math.min(100, Math.floor(Number(q.get('pageSize'))) || 9)),
        pages = Math.max(1, Math.ceil(items.length / size)),
        page = Math.max(1, Math.min(pages, Math.floor(Number(q.get('page'))) || 1))
      return structuredClone({
        items: items.slice((page - 1) * size, page * size),
        total: items.length,
        valueCents: items.reduce((s, p) => s + p.priceCents, 0),
        page,
        pages,
      })
    }
    const next = structuredClone(state)
    let resultId = parts[2] || ''
    const activity = (
      propertyId: string | null,
      buyerId: string | null,
      kind: Workspace['activity'][number]['kind'],
      text: string,
    ) =>
      next.activity.unshift({
        id: crypto.randomUUID(),
        propertyId,
        buyerId,
        kind,
        text,
        actor: 'Alex Morgan',
        createdAt: stamp,
      })
    const cancelViewings = (propertyId: string, buyerId: string | null, reason: string) => {
      for (const v of next.viewings.filter(
        v => v.propertyId === propertyId && v.status === 'scheduled' && v.buyerId !== buyerId,
      )) {
        v.status = 'cancelled'
        v.outcome = reason
        v.updatedAt = stamp
        activity(propertyId, v.buyerId, 'viewing', reason)
      }
    }
    try {
      if (req.method === 'POST' && path === '/reset') {
        const seed = await this.seed()
        this.state = seed
        await this.persist(seed)
        return { workspace: structuredClone(seed), id: 'reset' }
      }
      if (req.method === 'POST' && path === '/properties') {
        const data = propertyInputSchema.parse(req.body)
        if (next.properties.some(p => p.address.toLowerCase() === data.address.toLowerCase()))
          return fail(409, 'A listing with this address already exists.')
        resultId = 'property-' + crypto.randomUUID()
        next.properties.unshift({
          ...data,
          id: resultId,
          reference: 'HV-' + String(2401 + next.properties.length),
          status: 'available',
          featured: false,
          listedOn: today(),
          createdAt: stamp,
          updatedAt: stamp,
        })
        activity(resultId, null, 'listing', 'Added a new listing: ' + data.address)
      } else if (req.method === 'PATCH' && parts[1] === 'properties' && parts.length === 3) {
        const p = next.properties.find(p => p.id === parts[2])
        if (!p) return fail(404, 'This property was not found.')
        const body = z.record(z.string(), z.unknown()).parse(req.body)
        if ('featured' in body) p.featured = z.boolean().parse(body['featured'])
        else if ('status' in body) {
          const status = z.enum(['available', 'archived']).parse(body['status'])
          if (!['available', 'archived'].includes(p.status))
            return fail(409, 'Reserved or sold properties cannot be archived or relisted.')
          if (
            status === 'archived' &&
            (next.offers.some(
              o => o.propertyId === p.id && ['draft', 'submitted', 'accepted'].includes(o.status),
            ) ||
              next.viewings.some(v => v.propertyId === p.id && v.status === 'scheduled'))
          )
            return fail(
              409,
              'Resolve open offers and scheduled viewings before archiving this listing.',
            )
          p.status = status
          activity(
            p.id,
            null,
            'listing',
            (status === 'archived' ? 'Archived listing: ' : 'Relisted property: ') + p.address,
          )
        } else {
          if (p.status === 'sold')
            return fail(409, 'Sold listing details are kept with the completed deal.')
          const data = propertyInputSchema.parse({ ...p, ...body })
          if (
            next.properties.some(
              other =>
                other.id !== p.id && other.address.toLowerCase() === data.address.toLowerCase(),
            )
          )
            return fail(409, 'A listing with this address already exists.')
          Object.assign(p, data)
          activity(p.id, null, 'listing', 'Updated listing details: ' + p.address)
        }
        p.updatedAt = stamp
      } else if (req.method === 'POST' && path === '/buyers') {
        const data = buyerInputSchema.parse(req.body)
        if (next.buyers.some(b => b.email.toLowerCase() === data.email.toLowerCase()))
          return fail(409, 'A buyer with this email already exists.')
        resultId = 'buyer-' + crypto.randomUUID()
        next.buyers.unshift({
          ...data,
          id: resultId,
          shortlistIds: [],
          createdAt: stamp,
          updatedAt: stamp,
        })
        activity(null, resultId, 'buyer', 'Welcomed ' + data.name + ' to the buyer desk')
      } else if (req.method === 'PATCH' && parts[1] === 'buyers' && parts.length === 3) {
        const b = next.buyers.find(b => b.id === parts[2])
        if (!b) return fail(404, 'This buyer was not found.')
        const data = buyerInputSchema.parse({
          ...b,
          ...z.record(z.string(), z.unknown()).parse(req.body),
        })
        if (
          next.buyers.some(
            other => other.id !== b.id && other.email.toLowerCase() === data.email.toLowerCase(),
          )
        )
          return fail(409, 'A buyer with this email already exists.')
        Object.assign(b, data, { updatedAt: stamp })
        activity(null, b.id, 'buyer', 'Updated preferences for ' + b.name)
      } else if (req.method === 'POST' && parts[1] === 'buyers' && parts[3] === 'shortlist') {
        const b = next.buyers.find(b => b.id === parts[2])
        if (!b) return fail(404, 'This buyer was not found.')
        const { propertyId } = z.object({ propertyId: z.string() }).parse(req.body)
        const p = next.properties.find(p => p.id === propertyId)
        if (!p) return fail(404, 'This property was not found.')
        const exists = b.shortlistIds.includes(p.id)
        b.shortlistIds = exists
          ? b.shortlistIds.filter(id => id !== p.id)
          : [...b.shortlistIds, p.id]
        b.updatedAt = stamp
        activity(
          p.id,
          b.id,
          'buyer',
          (exists ? 'Removed from' : 'Added to') + ' ' + b.name + '’s shortlist: ' + p.address,
        )
      } else if (
        (req.method === 'POST' && path === '/viewings') ||
        (req.method === 'PATCH' && parts[1] === 'viewings' && parts.length === 3)
      ) {
        const current = next.viewings.find(v => v.id === parts[2])
        if (req.method === 'PATCH' && !current) return fail(404, 'This viewing was not found.')
        const body = z.record(z.string(), z.unknown()).parse(req.body)
        if (current && 'status' in body) {
          const status = z.enum(['completed', 'cancelled']).parse(body['status'])
          if (current.status !== 'scheduled')
            return fail(409, 'This viewing already has an outcome.')
          const outcome = z
            .string()
            .trim()
            .min(5, 'Add at least 5 characters of feedback.')
            .max(3000)
            .parse(body['outcome'])
          if (status === 'completed' && current.startsAt > stamp)
            return fail(409, 'A viewing cannot be completed before its scheduled start.')
          current.status = status
          current.outcome = outcome
          current.updatedAt = stamp
          activity(
            current.propertyId,
            current.buyerId,
            'viewing',
            (status === 'completed' ? 'Completed viewing: ' : 'Cancelled viewing: ') + outcome,
          )
        } else {
          if (current && current.status !== 'scheduled')
            return fail(409, 'Only scheduled viewings can be rescheduled.')
          const data = viewingInputSchema.parse({ ...current, ...body }),
            p = next.properties.find(p => p.id === data.propertyId),
            b = next.buyers.find(b => b.id === data.buyerId)
          if (!p || !b) return fail(404, 'Select an existing property and buyer.')
          const continuingReservation =
            current &&
            current.propertyId === p.id &&
            p.status === 'reserved' &&
            next.offers.some(
              offer =>
                offer.propertyId === p.id && offer.buyerId === b.id && offer.status === 'accepted',
            )
          if (p.status !== 'available' && !continuingReservation)
            return fail(409, 'Only available properties can be booked for a new viewing.')
          if (b.stage === 'closed') return fail(409, 'Reopen this buyer before booking a viewing.')
          if (data.startsAt <= stamp) return fail(422, 'Choose a viewing time in the future.')
          const conflict = next.viewings.find(
            v =>
              v.id !== current?.id &&
              v.status === 'scheduled' &&
              intersects(v, data) &&
              (v.agentId === data.agentId ||
                v.buyerId === data.buyerId ||
                v.propertyId === data.propertyId),
          )
          if (conflict)
            return fail(
              409,
              'This time overlaps another viewing for the agent, buyer, or property. Choose another time.',
            )
          if (current) Object.assign(current, data, { updatedAt: stamp })
          else {
            resultId = 'viewing-' + crypto.randomUUID()
            next.viewings.push({
              ...data,
              id: resultId,
              status: 'scheduled',
              outcome: '',
              createdAt: stamp,
              updatedAt: stamp,
            })
          }
          activity(
            p.id,
            b.id,
            'viewing',
            (current ? 'Rescheduled' : 'Booked') + ' a viewing at ' + p.address + ' with ' + b.name,
          )
        }
      } else if (req.method === 'POST' && path === '/offers') {
        const data = offerInputSchema.parse(req.body),
          p = next.properties.find(p => p.id === data.propertyId),
          b = next.buyers.find(b => b.id === data.buyerId)
        if (!p || !b) return fail(404, 'Select an existing property and buyer.')
        if (p.status !== 'available' || b.stage === 'closed')
          return fail(409, 'Choose an available property and an open buyer.')
        if (data.closingDate < today())
          return fail(422, 'The planned closing date cannot be in the past.')
        if (
          next.offers.some(
            o =>
              o.propertyId === p.id &&
              o.buyerId === b.id &&
              ['draft', 'submitted', 'accepted'].includes(o.status),
          )
        )
          return fail(409, 'This buyer already has an open offer for the property.')
        resultId = 'offer-' + crypto.randomUUID()
        next.offers.unshift({
          ...data,
          id: resultId,
          status: 'draft',
          conditions: { funds: false, inspection: false, agreement: false },
          decisionNote: '',
          createdAt: stamp,
          updatedAt: stamp,
          closedAt: null,
        })
        activity(p.id, b.id, 'offer', 'Prepared an offer for ' + p.address + ' · ' + b.name)
      } else if (req.method === 'PATCH' && parts[1] === 'offers' && parts.length === 3) {
        const o = next.offers.find(o => o.id === parts[2])
        if (!o) return fail(404, 'This offer was not found.')
        const p = next.properties.find(p => p.id === o.propertyId)!,
          body = z.record(z.string(), z.unknown()).parse(req.body)
        if ('conditions' in body) {
          if (o.status !== 'accepted')
            return fail(409, 'Conditions can only be updated on an accepted offer.')
          o.conditions = conditionsSchema.parse(body['conditions'])
          activity(p.id, o.buyerId, 'offer', 'Updated closing conditions for ' + p.address)
        } else if ('status' in body) {
          const status = z
            .enum(['submitted', 'accepted', 'declined', 'withdrawn', 'closed'])
            .parse(body['status'])
          if (o.status === status && (status === 'accepted' || status === 'closed'))
            return { workspace: structuredClone(state), id: o.id } satisfies Mutation
          const allowed: Record<string, string[]> = {
            draft: ['submitted', 'withdrawn'],
            submitted: ['accepted', 'declined', 'withdrawn'],
            accepted: ['closed', 'withdrawn'],
            declined: [],
            withdrawn: [],
            closed: [],
          }
          if (!allowed[o.status].includes(status))
            return fail(409, 'This offer cannot move to that status.')
          if (['submitted', 'accepted'].includes(status) && p.status !== 'available')
            return fail(
              409,
              'This property is no longer available. Resolve its current reservation first.',
            )
          if (['declined', 'withdrawn'].includes(status))
            o.decisionNote = z
              .string()
              .trim()
              .min(5, 'Add a reason of at least 5 characters.')
              .max(3000)
              .parse(body['decisionNote'])
          if (status === 'accepted') {
            if (
              next.offers.some(
                other =>
                  other.id !== o.id && other.propertyId === p.id && other.status === 'accepted',
              )
            )
              return fail(409, 'Another offer already reserves this property.')
            p.status = 'reserved'
            cancelViewings(
              p.id,
              o.buyerId,
              'Viewing cancelled because the property was reserved for another buyer.',
            )
          }
          if (status === 'withdrawn' && o.status === 'accepted') p.status = 'available'
          if (status === 'closed') {
            if (!Object.values(o.conditions).every(Boolean))
              return fail(409, 'Complete all three closing conditions before recording the sale.')
            p.status = 'sold'
            o.closedAt = stamp
            cancelViewings(p.id, null, 'Viewing cancelled because the property was sold.')
            for (const other of next.offers.filter(
              other =>
                other.id !== o.id &&
                other.propertyId === p.id &&
                ['draft', 'submitted'].includes(other.status),
            )) {
              other.status = 'withdrawn'
              other.decisionNote = 'Property sold to another buyer.'
              other.updatedAt = stamp
              activity(
                p.id,
                other.buyerId,
                'offer',
                'Withdrew an open offer because ' + p.address + ' was sold',
              )
            }
          }
          o.status = status
          p.updatedAt = stamp
          activity(
            p.id,
            o.buyerId,
            'offer',
            {
              submitted: 'Recorded submitted offer for ',
              accepted: 'Accepted offer and reserved ',
              declined: 'Declined offer for ',
              withdrawn: 'Withdrew offer for ',
              closed: 'Recorded completed sale of ',
            }[status] +
              p.address +
              (o.decisionNote ? ' — ' + o.decisionNote : ''),
          )
        } else {
          if (o.status !== 'draft') return fail(409, 'Only draft offers can be edited.')
          const data = z
            .object({
              amountCents: z.number().int().positive().max(1000000000),
              closingDate: z.iso.date(),
              note: z.string().trim().max(3000),
            })
            .parse({ ...o, ...body })
          if (data.closingDate < today())
            return fail(422, 'The planned closing date cannot be in the past.')
          Object.assign(o, data)
          activity(p.id, o.buyerId, 'offer', 'Refined draft offer for ' + p.address)
        }
        o.updatedAt = stamp
      } else if (req.method === 'POST' && path === '/notes') {
        const data = z
          .object({
            propertyId: z.string().nullable(),
            buyerId: z.string().nullable(),
            text: z.string().trim().min(3).max(3000),
          })
          .parse(req.body)
        if (!data.propertyId && !data.buyerId)
          return fail(422, 'Choose a property or buyer for this note.')
        activity(data.propertyId, data.buyerId, 'note', data.text)
        resultId = next.activity[0].id
      } else return fail(404, 'This demo endpoint does not exist.')
      this.state = workspaceSchema.parse(next)
      await this.persist(this.state)
      return { workspace: structuredClone(this.state), id: resultId } satisfies Mutation
    } catch (error) {
      if (error instanceof z.ZodError)
        return fail(422, error.issues[0]?.message || 'Check the submitted details.')
      throw error
    }
  }
}
