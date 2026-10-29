import { z } from 'zod'

export const districts = [
  'Bouldin Creek',
  'Zilker',
  'Mueller',
  'East Austin',
  'Clarksville',
  'Tarrytown',
  'Downtown',
  'Hyde Park',
] as const
export const propertyTypes = ['house', 'condo', 'townhouse'] as const
export const assets = ['limestone', 'cedar', 'condo'] as const
export const now = () => new Date().toISOString()
export const today = () => new Date().toLocaleDateString('en-CA')
export const localDateTime = (value: string) => {
  const d = new Date(value)
  return (
    d.toLocaleDateString('en-CA') +
    'T' +
    [d.getHours(), d.getMinutes()].map(n => String(n).padStart(2, '0')).join(':')
  )
}
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100)
export const compactMoney = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(cents / 100)
export const dateLabel = (date: string) =>
  new Date(date.length === 10 ? date + 'T12:00:00' : date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
export const timeLabel = (date: string) =>
  new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s[0])
    .join('')
export const centsFrom = (amount: number) => Math.round(amount * 100)
export const precise = (amount: number) =>
  Number.isFinite(amount) && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.00001
export const daysOnMarket = (property: { listedOn: string }) =>
  Math.max(0, Math.floor((Date.parse(today()) - Date.parse(property.listedOn)) / 86400000))
const id = z.string().min(1).max(100)
const name = z.string().trim().min(2).max(120)
const cents = z.number().int().positive().max(1000000000)
const note = z.string().trim().max(3000)
export const agentSchema = z.object({
  id,
  name,
  initials: z.string(),
  color: z.string(),
  role: name,
})
export const propertyInputSchema = z.object({
  address: name,
  district: z.enum(districts),
  type: z.enum(propertyTypes),
  priceCents: cents,
  bedrooms: z.number().int().min(0).max(12),
  bathrooms: z.number().min(1).max(12).multipleOf(0.5),
  area: z.number().int().min(250).max(25000),
  year: z
    .number()
    .int()
    .min(1850)
    .max(new Date().getFullYear() + 2),
  agentId: id,
  description: z.string().trim().min(10).max(3000),
  image: z.enum(assets),
  features: z.array(z.string().trim().min(2).max(60)).max(12),
})
export const propertySchema = propertyInputSchema.extend({
  id,
  reference: z.string(),
  status: z.enum(['available', 'reserved', 'sold', 'archived']),
  featured: z.boolean(),
  listedOn: z.iso.date(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export const buyerInputSchema = z
  .object({
    name,
    email: z.email(),
    phone: z.string().trim().min(7).max(30),
    agentId: id,
    budgetMinCents: cents,
    budgetMaxCents: cents,
    bedrooms: z.number().int().min(0).max(12),
    types: z.array(z.enum(propertyTypes)).min(1).max(3),
    districts: z.array(z.enum(districts)).max(8),
    funding: z.enum(['cash', 'pre-approved', 'mortgage']),
    stage: z.enum(['new', 'qualifying', 'active', 'closed']),
    notes: note,
  })
  .refine(b => b.budgetMaxCents >= b.budgetMinCents, {
    message: 'The maximum budget must be at least the minimum budget.',
    path: ['budgetMaxCents'],
  })
export const buyerSchema = buyerInputSchema.safeExtend({
  id,
  shortlistIds: z.array(id),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export const viewingInputSchema = z.object({
  propertyId: id,
  buyerId: id,
  agentId: id,
  startsAt: z.iso.datetime(),
  duration: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
  note,
})
export const viewingSchema = viewingInputSchema.extend({
  id,
  status: z.enum(['scheduled', 'completed', 'cancelled']),
  outcome: note,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export const offerInputSchema = z.object({
  propertyId: id,
  buyerId: id,
  agentId: id,
  amountCents: cents,
  closingDate: z.iso.date(),
  note,
})
export const conditionsSchema = z.object({
  funds: z.boolean(),
  inspection: z.boolean(),
  agreement: z.boolean(),
})
export const conditionLabels = {
  funds: 'Buyer funds verified',
  inspection: 'Inspection completed',
  agreement: 'Agreement signed',
}
export const offerSchema = offerInputSchema.extend({
  id,
  status: z.enum(['draft', 'submitted', 'accepted', 'declined', 'withdrawn', 'closed']),
  conditions: conditionsSchema,
  decisionNote: note,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
})
export const activitySchema = z.object({
  id,
  propertyId: id.nullable(),
  buyerId: id.nullable(),
  kind: z.enum(['listing', 'buyer', 'viewing', 'offer', 'note']),
  text: z.string().min(1).max(4000),
  actor: name,
  createdAt: z.iso.datetime(),
})
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    anchorDate: z.iso.date(),
    agents: z.array(agentSchema).min(1),
    properties: z.array(propertySchema),
    buyers: z.array(buyerSchema),
    viewings: z.array(viewingSchema),
    offers: z.array(offerSchema),
    activity: z.array(activitySchema),
  })
  .superRefine((w, ctx) => {
    const error = () =>
      ctx.addIssue({
        code: 'custom',
        message: 'Workspace relationships or deal states are inconsistent.',
      })
    const agents = new Set(w.agents.map(a => a.id)),
      properties = new Map(w.properties.map(p => [p.id, p])),
      buyers = new Map(w.buyers.map(b => [b.id, b]))
    for (const rows of [w.agents, w.properties, w.buyers, w.viewings, w.offers, w.activity])
      if (new Set(rows.map(r => r.id)).size !== rows.length) error()
    if (
      new Set(w.properties.map(p => p.reference)).size !== w.properties.length ||
      new Set(w.buyers.map(b => b.email.toLowerCase())).size !== w.buyers.length
    )
      error()
    for (const p of w.properties) {
      if (!agents.has(p.agentId)) error()
      const accepted = w.offers.filter(o => o.propertyId === p.id && o.status === 'accepted'),
        closed = w.offers.filter(o => o.propertyId === p.id && o.status === 'closed')
      if (
        accepted.length > 1 ||
        closed.length > 1 ||
        (p.status === 'reserved') !== (accepted.length === 1) ||
        (p.status === 'sold') !== (closed.length === 1)
      )
        error()
    }
    for (const b of w.buyers)
      if (
        !agents.has(b.agentId) ||
        b.shortlistIds.some(id => !properties.has(id)) ||
        new Set(b.shortlistIds).size !== b.shortlistIds.length
      )
        error()
    for (const v of w.viewings)
      if (
        !properties.has(v.propertyId) ||
        !buyers.has(v.buyerId) ||
        !agents.has(v.agentId) ||
        (v.status === 'completed' && v.outcome.length < 5)
      )
        error()
    for (const o of w.offers)
      if (
        !properties.has(o.propertyId) ||
        !buyers.has(o.buyerId) ||
        !agents.has(o.agentId) ||
        (o.status === 'closed' && (!Object.values(o.conditions).every(Boolean) || !o.closedAt)) ||
        (o.status !== 'closed' && o.closedAt) ||
        (['withdrawn', 'declined'].includes(o.status) && o.decisionNote.length < 5)
      )
        error()
    for (const e of w.activity)
      if ((e.propertyId && !properties.has(e.propertyId)) || (e.buyerId && !buyers.has(e.buyerId)))
        error()
  })
export type Workspace = z.infer<typeof workspaceSchema>
export type Property = z.infer<typeof propertySchema>
export type Buyer = z.infer<typeof buyerSchema>
export type Viewing = z.infer<typeof viewingSchema>
export type Offer = z.infer<typeof offerSchema>
export type Activity = z.infer<typeof activitySchema>
export type ConditionKey = keyof typeof conditionLabels
export interface PropertyQuery {
  search: string
  district: string
  type: string
  status: string
  agent: string
  price: string
  sort: string
  featured: boolean
  page: number
  pageSize: number
}
export interface PropertyPage {
  items: Property[]
  total: number
  valueCents: number
  page: number
  pages: number
}
export interface Mutation {
  workspace: Workspace
  id: string
}
export const matches = (p: Property, b: Buyer) =>
  b.stage !== 'closed' &&
  p.status === 'available' &&
  p.priceCents >= b.budgetMinCents &&
  p.priceCents <= b.budgetMaxCents &&
  p.bedrooms >= b.bedrooms &&
  b.types.includes(p.type) &&
  (!b.districts.length || b.districts.includes(p.district))
export const offerProgress = (offer: Offer) =>
  Object.values(offer.conditions).filter(Boolean).length
export const intersects = (
  a: Pick<Viewing, 'startsAt' | 'duration'>,
  b: Pick<Viewing, 'startsAt' | 'duration'>,
) =>
  Date.parse(a.startsAt) < Date.parse(b.startsAt) + b.duration * 60000 &&
  Date.parse(b.startsAt) < Date.parse(a.startsAt) + a.duration * 60000
