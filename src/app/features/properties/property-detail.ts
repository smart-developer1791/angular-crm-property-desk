import { Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { DecimalPipe } from '@angular/common'
import { Dialog } from '@angular/cdk/dialog'
import { WorkspaceStore } from '../../core/workspace-store'
import {
  compactMoney,
  dateLabel,
  daysOnMarket,
  initials,
  matches,
  money,
  timeLabel,
} from '../../core/domain'
import { Icon } from '../../shared/icon'
import { ActivityFeed } from '../../shared/activity-feed'
import { NoteForm } from '../../shared/note-form'
import { ConfirmDialog } from '../../shared/confirm-dialog'
import { PropertyForm } from './property-form'
import { ViewingForm } from '../viewings/viewing-form'
import { ViewingDetail } from '../viewings/viewing-detail'
import { OfferForm } from '../offers/offer-form'
import { OfferDetail } from '../offers/offer-detail'
@Component({
  selector: 'app-property-detail',
  imports: [RouterLink, DecimalPipe, Icon, ActivityFeed, NoteForm],
  templateUrl: './property-detail.html',
})
export class PropertyDetail {
  readonly store = inject(WorkspaceStore)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private dialog = inject(Dialog)
  readonly id = signal('')
  readonly tab = signal('overview')
  readonly property = computed(() => this.store.properties().find(p => p.id === this.id()))
  readonly viewings = computed(() =>
    this.store
      .viewings()
      .filter(v => v.propertyId === this.id())
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  )
  readonly offers = computed(() =>
    this.store
      .offers()
      .filter(o => o.propertyId === this.id())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )
  readonly history = computed(() =>
    this.store
      .activity()
      .filter(e => e.propertyId === this.id())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
  readonly matchingBuyers = computed(() =>
    this.property()
      ? this.store.buyers().filter(b => b.stage !== 'closed' && matches(this.property()!, b))
      : [],
  )
  readonly rounded = Math.round
  readonly money = money
  readonly compactMoney = compactMoney
  readonly dateLabel = dateLabel
  readonly timeLabel = timeLabel
  readonly initials = initials
  readonly daysOnMarket = daysOnMarket
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(p => this.id.set(p.get('id') || ''))
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(p =>
        this.tab.set(
          ['overview', 'viewings', 'offers', 'activity'].includes(p.get('tab') || '')
            ? p.get('tab')!
            : 'overview',
        ),
      )
  }
  setTab(tab: string) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      replaceUrl: true,
    })
  }
  edit() {
    this.dialog.open(PropertyForm, {
      data: { property: this.property() },
      panelClass: 'form-dialog',
      ariaLabelledBy: 'property-form-title',
    })
  }
  schedule() {
    this.dialog.open(ViewingForm, {
      data: { propertyId: this.id() },
      panelClass: 'form-dialog',
      ariaLabelledBy: 'viewing-form-title',
    })
  }
  offer() {
    this.dialog.open(OfferForm, {
      data: { propertyId: this.id() },
      panelClass: 'form-dialog',
      ariaLabelledBy: 'offer-form-title',
    })
  }
  openViewing(id: string) {
    this.dialog.open(ViewingDetail, {
      data: id,
      panelClass: 'form-dialog',
      ariaLabelledBy: 'viewing-detail-title',
    })
  }
  openOffer(id: string) {
    this.dialog.open(OfferDetail, {
      data: id,
      panelClass: 'form-dialog',
      ariaLabelledBy: 'offer-detail-title',
    })
  }
  favorite() {
    void this.store.mutate(
      'PATCH',
      '/properties/' + this.id(),
      { featured: !this.property()!.featured },
      this.property()!.featured ? 'Removed from saved listings.' : 'Added to saved listings.',
    )
  }
  archive() {
    const archived = this.property()!.status === 'archived'
    this.dialog
      .open<boolean>(ConfirmDialog, {
        data: {
          title: archived ? 'Bring this place back?' : 'Archive this listing?',
          message: archived
            ? 'The listing will become available for matching, viewings, and offers.'
            : 'The listing stays in your history. Resolve open offers and scheduled viewings before archiving.',
          action: archived ? 'Relist property' : 'Archive listing',
        },
        panelClass: ['form-dialog', 'compact-dialog'],
        ariaLabelledBy: 'confirm-title',
      })
      .closed.subscribe(confirmed => {
        if (confirmed)
          void this.store.mutate(
            'PATCH',
            '/properties/' + this.id(),
            { status: archived ? 'available' : 'archived' },
            archived ? 'Property relisted and ready for a new chapter.' : 'Listing archived.',
          )
      })
  }
}
