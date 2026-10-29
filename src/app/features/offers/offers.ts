import { Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { Dialog } from '@angular/cdk/dialog'
import { WorkspaceStore } from '../../core/workspace-store'
import { compactMoney, dateLabel, initials, money, offerProgress } from '../../core/domain'
import { Icon } from '../../shared/icon'
import { OfferForm } from './offer-form'
import { OfferDetail } from './offer-detail'
@Component({
  selector: 'app-offers',
  imports: [FormsModule, Icon],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">LET’S MOVE THINGS FORWARD</span>
        <h1>Closer to the next chapter.</h1>
        <p>From the first offer to the final handshake. Keep every detail connected.</p>
      </div>
      <button class="button primary" (click)="create()"><app-icon name="plus" />New offer</button>
    </div>
    <div class="offer-summary">
      <button [class.selected]="status() === 'submitted'" (click)="select('submitted')">
        <span class="summary-icon"><app-icon name="note" /></span
        ><span
          ><small>Awaiting response</small
          ><strong>{{ count('submitted') }} <i>offers</i></strong></span
        ><app-icon name="arrowUp" /></button
      ><button [class.selected]="status() === 'accepted'" (click)="select('accepted')">
        <span class="summary-icon"><app-icon name="home" /></span
        ><span
          ><small>Under agreement</small
          ><strong>{{ compactMoney(store.metrics().reserved) }}</strong></span
        ><app-icon name="arrowUp" /></button
      ><button [class.selected]="status() === 'closed'" (click)="select('closed')">
        <span class="summary-icon"><app-icon name="handshake" /></span
        ><span
          ><small>Completed sales</small
          ><strong>{{ compactMoney(store.metrics().sold) }}</strong></span
        ><app-icon name="arrowUp" />
      </button>
    </div>
    <section class="surface">
      <div class="surface-header">
        <h2>
          Your offer desk<span class="count">{{ filtered().length }}</span>
        </h2>
        <label class="search-field"
          ><app-icon name="search" /><input
            aria-label="Search offers"
            placeholder="Search property or buyer…"
            [ngModel]="search()"
            (ngModelChange)="search.set($event); page.set(1)"
        /></label>
      </div>
      <div class="tabs">
        @for (tab of statuses; track tab) {
          <button [class.active]="status() === tab" (click)="select(tab)">
            {{ tab === 'all' ? 'All offers' : tab }}
          </button>
        }
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Property / buyer</th>
              <th>Offer amount</th>
              <th>Asking price</th>
              <th>Planned close</th>
              <th>Status</th>
              <th>Conditions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (offer of filtered().slice((page() - 1) * 10, page() * 10); track offer.id) {
              <tr>
                <td>
                  <button class="listing-cell" (click)="open(offer.id)">
                    <img
                      [src]="'/images/' + store.property(offer.propertyId).image + '.webp'"
                      alt="Illustrative property exterior"
                      width="100"
                      height="70"
                      loading="lazy"
                    /><span
                      ><strong>{{ store.property(offer.propertyId).address }}</strong
                      ><small
                        >{{ store.buyer(offer.buyerId).name }} ·
                        {{ store.agent(offer.agentId).name }}</small
                      ></span
                    >
                  </button>
                </td>
                <td class="number offer-table-value">{{ money(offer.amountCents) }}</td>
                <td class="number">{{ money(store.property(offer.propertyId).priceCents) }}</td>
                <td>{{ dateLabel(offer.closingDate) }}</td>
                <td>
                  <span [class]="'badge ' + offer.status">{{ offer.status }}</span>
                </td>
                <td>
                  @if (offer.status === 'accepted' || offer.status === 'closed') {
                    <span class="condition-progress"
                      ><span><i [style.width.%]="(offerProgress(offer) / 3) * 100"></i></span
                      >{{ offerProgress(offer) }} / 3</span
                    >
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
                <td>
                  <button
                    class="icon-button"
                    [attr.aria-label]="
                      'Open offer for ' +
                      store.property(offer.propertyId).address +
                      ' from ' +
                      store.buyer(offer.buyerId).name
                    "
                    (click)="open(offer.id)"
                  >
                    <app-icon name="arrowUp" />
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="empty-state">
                    <app-icon name="handshake" />
                    <h3>A new conversation is waiting.</h3>
                    <p>No offers match this view.</p>
                    <button class="button" (click)="search.set(''); select('all')">
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span>{{ filtered().length }} offers · All amounts in USD</span>
        <div>
          <button
            class="icon-button"
            aria-label="Previous page"
            [disabled]="page() === 1"
            (click)="page.set(page() - 1)"
          >
            <app-icon name="left" /></button
          ><span>{{ page() }} / {{ pages() }}</span
          ><button
            class="icon-button"
            aria-label="Next page"
            [disabled]="page() >= pages()"
            (click)="page.set(page() + 1)"
          >
            <app-icon name="right" />
          </button>
        </div>
      </div>
    </section>
    <p class="page-footnote">
      <app-icon name="note" />Offer and sale actions record your team’s decisions. They do not send
      offers, sign agreements, or move money.
    </p>
  `,
})
export class Offers {
  readonly store = inject(WorkspaceStore)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private dialog = inject(Dialog)
  readonly status = signal('all')
  readonly search = signal('')
  readonly page = signal(1)
  readonly statuses = ['all', 'draft', 'submitted', 'accepted', 'closed', 'declined', 'withdrawn']
  readonly money = money
  readonly compactMoney = compactMoney
  readonly dateLabel = dateLabel
  readonly initials = initials
  readonly offerProgress = offerProgress
  readonly filtered = computed(() =>
    this.store
      .offers()
      .filter(
        o =>
          (this.status() === 'all' || o.status === this.status()) &&
          [this.store.property(o.propertyId).address, this.store.buyer(o.buyerId).name, o.note]
            .join(' ')
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 10)))
  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(q =>
        this.status.set(this.statuses.includes(q.get('status') || '') ? q.get('status')! : 'all'),
      )
  }
  count(status: string) {
    return this.store.offers().filter(o => o.status === status).length
  }
  select(status: string) {
    this.page.set(1)
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status },
      replaceUrl: true,
    })
  }
  create() {
    this.dialog.open(OfferForm, {
      data: {},
      panelClass: 'form-dialog',
      ariaLabelledBy: 'offer-form-title',
    })
  }
  open(id: string) {
    this.dialog
      .open(OfferDetail, {
        data: id,
        panelClass: 'form-dialog',
        ariaLabelledBy: 'offer-detail-title',
      })
      .closed.subscribe(() => this.page.set(Math.min(this.page(), this.pages())))
  }
}
