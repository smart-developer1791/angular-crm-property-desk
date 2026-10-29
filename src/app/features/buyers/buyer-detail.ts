import { Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Dialog } from '@angular/cdk/dialog'
import { WorkspaceStore } from '../../core/workspace-store'
import { compactMoney, dateLabel, initials, money, timeLabel } from '../../core/domain'
import { Icon } from '../../shared/icon'
import { PropertyCard } from '../../shared/property-card'
import { NoteForm } from '../../shared/note-form'
import { ActivityFeed } from '../../shared/activity-feed'
import { BuyerForm } from './buyer-form'
import { ViewingForm } from '../viewings/viewing-form'
import { ViewingDetail } from '../viewings/viewing-detail'
import { OfferForm } from '../offers/offer-form'
import { OfferDetail } from '../offers/offer-detail'
@Component({
  selector: 'app-buyer-detail',
  imports: [RouterLink, Icon, PropertyCard, NoteForm, ActivityFeed],
  templateUrl: './buyer-detail.html',
})
export class BuyerDetail {
  readonly store = inject(WorkspaceStore)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private dialog = inject(Dialog)
  readonly id = signal('')
  readonly tab = signal('matches')
  readonly buyer = computed(() => this.store.buyers().find(b => b.id === this.id()))
  readonly matches = computed(() => this.store.matches(this.id()))
  readonly shortlist = computed(() =>
    this.store.properties().filter(p => this.buyer()?.shortlistIds.includes(p.id)),
  )
  readonly viewings = computed(() =>
    this.store
      .viewings()
      .filter(v => v.buyerId === this.id())
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  )
  readonly offers = computed(() =>
    this.store
      .offers()
      .filter(o => o.buyerId === this.id())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )
  readonly history = computed(() =>
    this.store
      .activity()
      .filter(e => e.buyerId === this.id())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
  readonly money = money
  readonly compactMoney = compactMoney
  readonly dateLabel = dateLabel
  readonly timeLabel = timeLabel
  readonly initials = initials
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(p => this.id.set(p.get('id') || ''))
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(p =>
        this.tab.set(
          ['matches', 'shortlist', 'activity'].includes(p.get('tab') || '')
            ? p.get('tab')!
            : 'matches',
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
    this.dialog.open(BuyerForm, {
      data: { buyer: this.buyer() },
      panelClass: 'form-dialog',
      ariaLabelledBy: 'buyer-form-title',
    })
  }
  saveProperty(id: string) {
    void this.store.mutate(
      'POST',
      '/buyers/' + this.id() + '/shortlist',
      { propertyId: id },
      this.buyer()!.shortlistIds.includes(id)
        ? 'Property removed from the buyer’s shortlist.'
        : 'Property added to the buyer’s shortlist.',
    )
  }
  schedule() {
    this.dialog.open(ViewingForm, {
      data: { buyerId: this.id() },
      panelClass: 'form-dialog',
      ariaLabelledBy: 'viewing-form-title',
    })
  }
  offer() {
    this.dialog.open(OfferForm, {
      data: { buyerId: this.id() },
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
}
