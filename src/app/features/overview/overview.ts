import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { Dialog } from '@angular/cdk/dialog'
import { WorkspaceStore } from '../../core/workspace-store'
import { compactMoney, dateLabel, initials, now, timeLabel, today } from '../../core/domain'
import { Icon } from '../../shared/icon'
import { PropertyCard } from '../../shared/property-card'
import { PropertyForm } from '../properties/property-form'
import { ViewingDetail } from '../viewings/viewing-detail'
@Component({
  selector: 'app-overview',
  imports: [RouterLink, Icon, PropertyCard],
  templateUrl: './overview.html',
})
export class Overview {
  readonly store = inject(WorkspaceStore)
  private dialog = inject(Dialog)
  readonly compactMoney = compactMoney
  readonly dateLabel = dateLabel
  readonly timeLabel = timeLabel
  readonly initials = initials
  readonly today = today
  readonly localDay = (value: string) => new Date(value).toLocaleDateString('en-CA')
  readonly greeting =
    new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 18
        ? 'Good afternoon'
        : 'Good evening'
  readonly date = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  readonly featured = computed(() =>
    this.store
      .properties()
      .filter(p => p.status === 'available')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3),
  )
  readonly upcoming = computed(() =>
    this.store
      .viewings()
      .filter(v => v.status === 'scheduled' && v.startsAt >= now())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 3),
  )
  readonly recentBuyers = computed(() =>
    [...this.store.buyers()]
      .filter(b => b.stage !== 'closed')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4),
  )
  readonly newBuyers = computed(() => this.store.buyers().filter(b => b.stage === 'new').length)
  readonly latest = computed(() =>
    [...this.store.activity()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
  )
  readonly offerBars = computed(() =>
    ['draft', 'submitted', 'accepted', 'closed'].map((status, index) => ({
      status,
      count: this.store.offers().filter(o => o.status === status).length,
      color: ['#dbe4ef', '#91add7', '#5f83b5', '#2f4c75'][index],
    })),
  )
  readonly listingTrend = computed(() => {
    const properties = this.store.properties()
    const values = Array.from({ length: 8 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (7 - i) * 7)
      return properties.filter(p => p.listedOn <= date.toISOString().slice(0, 10)).length
    })
    const max = Math.max(1, ...values)
    return values
      .map((value, i) => (i ? 'L' : 'M') + (1 + i * 14) + ' ' + (29 - (value / max) * 26))
      .join(' ')
  })
  readonly maxOffers = computed(() => Math.max(1, ...this.offerBars().map(b => b.count)))
  create() {
    this.dialog.open(PropertyForm, {
      data: {},
      panelClass: 'form-dialog',
      ariaLabelledBy: 'property-form-title',
    })
  }
  view(id: string) {
    this.dialog.open(ViewingDetail, {
      data: id,
      panelClass: 'form-dialog',
      ariaLabelledBy: 'viewing-detail-title',
    })
  }
}
