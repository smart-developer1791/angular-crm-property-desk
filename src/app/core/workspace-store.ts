import { Injectable, computed, inject, signal } from '@angular/core'
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'
import { LiveAnnouncer } from '@angular/cdk/a11y'
import { firstValueFrom } from 'rxjs'
import {
  matches,
  now,
  today,
  workspaceSchema,
  type Mutation,
  type PropertyPage,
  type PropertyQuery,
  type Workspace,
} from './domain'
@Injectable({ providedIn: 'root' })
export class WorkspaceStore {
  private http = inject(HttpClient)
  private announcer = inject(LiveAnnouncer)
  readonly workspace = signal<Workspace | null>(null)
  readonly loading = signal(true)
  readonly error = signal('')
  readonly busy = signal(false)
  readonly toast = signal<{ text: string; error: boolean } | null>(null)
  private toastTimer?: ReturnType<typeof setTimeout>
  readonly properties = computed(() => this.workspace()?.properties || [])
  readonly buyers = computed(() => this.workspace()?.buyers || [])
  readonly agents = computed(() => this.workspace()?.agents || [])
  readonly viewings = computed(() => this.workspace()?.viewings || [])
  readonly offers = computed(() => this.workspace()?.offers || [])
  readonly activity = computed(() => this.workspace()?.activity || [])
  readonly metrics = computed(() => ({
    available: this.properties().filter(p => p.status === 'available').length,
    portfolio: this.properties()
      .filter(p => ['available', 'reserved'].includes(p.status))
      .reduce((s, p) => s + p.priceCents, 0),
    buyers: this.buyers().filter(b => b.stage !== 'closed').length,
    viewings: this.viewings().filter(v => v.status === 'scheduled' && v.startsAt >= now()).length,
    pending: this.offers().filter(o => o.status === 'submitted').length,
    reserved: this.offers()
      .filter(o => o.status === 'accepted')
      .reduce((s, o) => s + o.amountCents, 0),
    sold: this.offers()
      .filter(o => o.status === 'closed')
      .reduce((s, o) => s + o.amountCents, 0),
  }))
  property(id: string) {
    return this.properties().find(p => p.id === id)!
  }
  buyer(id: string) {
    return this.buyers().find(b => b.id === id)!
  }
  agent(id: string) {
    return this.agents().find(a => a.id === id)!
  }
  matches(id: string) {
    const buyer = this.buyer(id)
    return buyer ? this.properties().filter(p => matches(p, buyer)) : []
  }
  async load() {
    this.loading.set(true)
    this.error.set('')
    try {
      this.workspace.set(
        workspaceSchema.parse(await firstValueFrom(this.http.get('/api/workspace'))),
      )
    } catch (error) {
      this.error.set(this.message(error))
    } finally {
      this.loading.set(false)
    }
  }
  listProperties(query: PropertyQuery) {
    let params = new HttpParams()
    Object.entries(query).forEach(([k, v]) => (params = params.set(k, String(v))))
    return this.http.get<PropertyPage>('/api/properties', { params })
  }
  async mutate(
    method: 'POST' | 'PATCH',
    path: string,
    body: unknown,
    message: string,
  ): Promise<string | null> {
    if (this.busy()) return null
    this.busy.set(true)
    try {
      const result = await firstValueFrom(
        this.http.request<Mutation>(method, '/api' + path, { body }),
      )
      this.workspace.set(workspaceSchema.parse(result.workspace))
      this.notify(message)
      return result.id
    } catch (error) {
      this.notify(this.message(error), true)
      return null
    } finally {
      this.busy.set(false)
    }
  }
  notify(text: string, error = false) {
    clearTimeout(this.toastTimer)
    this.toast.set({ text, error })
    void this.announcer.announce(text, error ? 'assertive' : 'polite', 9000)
    this.toastTimer = setTimeout(() => this.toast.set(null), error ? 9000 : 4500)
  }
  message(error: unknown) {
    return error instanceof HttpErrorResponse
      ? error.error?.message || 'Could not connect. Please try again.'
      : 'The workspace data could not be read. Please try again.'
  }
}
