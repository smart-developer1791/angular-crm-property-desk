import { Component, effect, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { Dialog } from '@angular/cdk/dialog'
import { firstValueFrom, switchMap, timer } from 'rxjs'
import { WorkspaceStore } from '../../core/workspace-store'
import {
  PropertyPage,
  PropertyQuery,
  compactMoney,
  daysOnMarket,
  districts,
  money,
  propertyTypes,
} from '../../core/domain'
import { Icon } from '../../shared/icon'
import { PropertyCard } from '../../shared/property-card'
import { PropertyForm } from './property-form'
@Component({
  selector: 'app-properties',
  imports: [FormsModule, RouterLink, Icon, PropertyCard],
  templateUrl: './properties.html',
})
export class Properties {
  readonly store = inject(WorkspaceStore)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private dialog = inject(Dialog)
  readonly districts = districts
  readonly types = propertyTypes
  readonly money = money
  readonly compactMoney = compactMoney
  readonly daysOnMarket = daysOnMarket
  readonly query = signal<PropertyQuery>({
    search: '',
    district: '',
    type: '',
    status: '',
    agent: '',
    price: '',
    sort: 'recent',
    featured: false,
    page: 1,
    pageSize: 9,
  })
  readonly view = signal('grid')
  readonly loading = signal(true)
  readonly error = signal('')
  readonly retry = signal(0)
  readonly exporting = signal(false)
  readonly result = signal<PropertyPage>({ items: [], total: 0, valueCents: 0, page: 1, pages: 1 })
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(q => {
      const view = q.get('view') === 'list' ? 'list' : 'grid'
      this.view.set(view)
      this.query.set({
        search: q.get('search') || '',
        district: districts.includes(q.get('district') as (typeof districts)[number])
          ? q.get('district')!
          : '',
        type: propertyTypes.includes(q.get('type') as (typeof propertyTypes)[number])
          ? q.get('type')!
          : '',
        status: ['available', 'reserved', 'sold', 'archived'].includes(q.get('status') || '')
          ? q.get('status')!
          : '',
        agent: q.get('agent') || '',
        price: ['under-750', '750-1250', 'over-1250'].includes(q.get('price') || '')
          ? q.get('price')!
          : '',
        sort: ['recent', 'oldest', 'price-asc', 'price-desc'].includes(q.get('sort') || '')
          ? q.get('sort')!
          : 'recent',
        featured: q.get('featured') === 'true',
        page: Math.max(1, Math.floor(Number(q.get('page'))) || 1),
        pageSize: view === 'list' ? 10 : 9,
      })
    })
    effect(cleanup => {
      const query = this.query(),
        workspace = this.store.workspace()
      this.retry()
      if (!workspace) return
      this.loading.set(true)
      this.error.set('')
      const sub = timer(160)
        .pipe(switchMap(() => this.store.listProperties(query)))
        .subscribe({
          next: r => {
            this.result.set(r)
            this.loading.set(false)
          },
          error: e => {
            this.error.set(this.store.message(e))
            this.loading.set(false)
          },
        })
      cleanup(() => sub.unsubscribe())
    })
  }
  update(patch: Record<string, unknown>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1, ...patch },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
  }
  clear() {
    void this.router.navigate(['/properties'], {
      queryParams: { view: this.view() },
      replaceUrl: true,
    })
  }
  reload() {
    this.retry.update(v => v + 1)
  }
  create() {
    this.dialog.open(PropertyForm, {
      data: {},
      panelClass: 'form-dialog',
      ariaLabelledBy: 'property-form-title',
    })
  }
  async exportCsv() {
    this.exporting.set(true)
    try {
      const query = { ...this.query(), page: 1, pageSize: 100 }
      const first = await firstValueFrom(this.store.listProperties(query))
      const items = [...first.items]
      for (let page = 2; page <= first.pages; page++)
        items.push(...(await firstValueFrom(this.store.listProperties({ ...query, page }))).items)
      const cell = (v: unknown) =>
        '"' +
        String(v)
          .replace(/^[=+@\-\t\r]/, "'$&")
          .replaceAll('"', '""') +
        '"'
      const rows = [
        [
          'Reference',
          'Address',
          'Neighborhood',
          'Type',
          'Asking price (USD)',
          'Bedrooms',
          'Bathrooms',
          'Area (sqft)',
          'Status',
          'Listing agent',
        ],
        ...items.map(p => [
          p.reference,
          p.address,
          p.district,
          p.type,
          (p.priceCents / 100).toFixed(2),
          p.bedrooms,
          p.bathrooms,
          p.area,
          p.status,
          this.store.agent(p.agentId).name,
        ]),
      ]
      const url = URL.createObjectURL(
        new Blob(['\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n')], {
          type: 'text/csv;charset=utf-8;',
        }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = 'haven-properties.csv'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      this.store.notify('All matching properties exported.')
    } catch (error) {
      this.store.notify(this.store.message(error), true)
    } finally {
      this.exporting.set(false)
    }
  }
}
