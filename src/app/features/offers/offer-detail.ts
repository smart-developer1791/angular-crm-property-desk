import { Component, computed, inject, signal } from '@angular/core'
import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog'
import { Router } from '@angular/router'
import { WorkspaceStore } from '../../core/workspace-store'
import { ConditionKey, conditionLabels, dateLabel, money, offerProgress } from '../../core/domain'
import { Icon } from '../../shared/icon'
import { ConfirmDialog } from '../../shared/confirm-dialog'
import { OfferForm } from './offer-form'
import { OfferDecision } from './offer-decision'
@Component({
  selector: 'app-offer-detail',
  imports: [Icon],
  template: `
    <div class="modal-top">
      <span class="eyebrow">EVERY DETAIL, ON THE SAME PAGE</span
      ><button
        class="icon-button"
        aria-label="Close offer details"
        [disabled]="store.busy()"
        (click)="ref.close()"
      >
        <app-icon name="close" />
      </button>
    </div>
    @if (offer(); as o) {
      <h2 id="offer-detail-title">A step closer to home.</h2>
      <div class="offer-property">
        <img
          [src]="'/images/' + store.property(o.propertyId).image + '.webp'"
          alt="Illustrative exterior of offered property"
          width="1536"
          height="1024"
        />
        <div>
          <span [class]="'badge ' + o.status">{{ o.status }}</span
          ><button (click)="navigate('properties', o.propertyId)">
            <strong>{{ store.property(o.propertyId).address }}</strong
            ><app-icon name="arrowUp" /></button
          ><small>{{ store.property(o.propertyId).district }}, Austin</small>
        </div>
      </div>
      <div class="offer-amount">
        <span
          >Offer amount<strong>{{ money(o.amountCents) }}</strong></span
        ><span
          >Asking price<strong>{{ money(store.property(o.propertyId).priceCents) }}</strong></span
        >
      </div>
      <div class="offer-people">
        <button (click)="navigate('buyers', o.buyerId)">
          <span class="avatar" [style.background]="store.agent(o.agentId).color">{{
            store.buyer(o.buyerId).name.slice(0, 1)
          }}</span
          ><span
            ><small>BUYER</small><strong>{{ store.buyer(o.buyerId).name }}</strong></span
          ><app-icon name="arrowUp" /></button
        ><span
          ><small>PLANNED CLOSE</small><strong>{{ dateLabel(o.closingDate) }}</strong></span
        >
      </div>
      @if (o.note) {
        <div class="context-note">{{ o.note }}</div>
      }
      @if (o.status === 'accepted' || o.status === 'closed') {
        <div class="closing-heading">
          <h3>The path to closing</h3>
          <span>{{ offerProgress(o) }} / 3 complete</span>
        </div>
        <div class="closing-checklist">
          @for (key of keys; track key) {
            <label [class.complete]="o.conditions[key]"
              ><input
                type="checkbox"
                [checked]="o.conditions[key]"
                [disabled]="store.busy() || o.status === 'closed'"
                (change)="condition(key, $event)" /><span>{{ labels[key] }}</span
              ><app-icon [name]="o.conditions[key] ? 'check' : 'clock'"
            /></label>
          }
        </div>
        @if (o.status === 'accepted') {
          <p class="small-note">
            This property is reserved for {{ store.buyer(o.buyerId).name }}. Verify every condition
            before recording the sale.
          </p>
        } @else {
          <div class="success-note">
            <app-icon name="check" />Sale recorded on {{ dateLabel(o.closedAt!) }}. The property is
            marked as sold.
          </div>
        }
      }
      @if (o.decisionNote) {
        <div class="outcome-note">
          <span class="eyebrow">DECISION CONTEXT</span>
          <p>{{ o.decisionNote }}</p>
        </div>
      }
      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }
      <div class="modal-footer offer-actions">
        @if (o.status === 'draft') {
          <button class="button" [disabled]="store.busy()" (click)="edit()">
            <app-icon name="edit" />Edit draft</button
          ><button class="button primary" [disabled]="store.busy()" (click)="status('submitted')">
            Mark as submitted<app-icon name="arrow" />
          </button>
        } @else if (o.status === 'submitted') {
          <button class="button" [disabled]="store.busy()" (click)="decision('declined')">
            Record decline</button
          ><button class="button primary" [disabled]="store.busy()" (click)="status('accepted')">
            Accept & reserve<app-icon name="check" />
          </button>
        } @else if (o.status === 'accepted') {
          <button class="button" [disabled]="store.busy()" (click)="decision('withdrawn')">
            Withdraw offer</button
          ><button class="button primary" [disabled]="store.busy()" (click)="closeSale()">
            Record sale<app-icon name="handshake" />
          </button>
        } @else {
          <button class="button" (click)="ref.close()">Done</button>
        }
      </div>
      @if (o.status === 'draft' || o.status === 'submitted') {
        <button class="quiet-action" [disabled]="store.busy()" (click)="decision('withdrawn')">
          Withdraw this offer
        </button>
      }
    }
  `,
})
export class OfferDetail {
  readonly store = inject(WorkspaceStore)
  readonly ref = inject(DialogRef)
  private id = inject<string>(DIALOG_DATA)
  private dialog = inject(Dialog)
  private router = inject(Router)
  readonly offer = computed(() => this.store.offers().find(o => o.id === this.id))
  readonly error = signal('')
  readonly money = money
  readonly dateLabel = dateLabel
  readonly offerProgress = offerProgress
  readonly labels = conditionLabels
  readonly keys: ConditionKey[] = ['funds', 'inspection', 'agreement']
  edit() {
    this.dialog.open(OfferForm, {
      data: { offer: this.offer() },
      panelClass: 'form-dialog',
      ariaLabelledBy: 'offer-form-title',
    })
  }
  decision(status: 'withdrawn' | 'declined') {
    this.dialog.open(OfferDecision, {
      data: { offer: this.offer(), status },
      panelClass: ['form-dialog', 'compact-dialog'],
      ariaLabelledBy: 'offer-decision-title',
    })
  }
  async status(status: string) {
    this.error.set('')
    if (
      !(await this.store.mutate(
        'PATCH',
        '/offers/' + this.id,
        { status },
        status === 'accepted'
          ? 'Offer accepted. The property is now reserved.'
          : status === 'closed'
            ? 'Sale recorded. Here’s to a new beginning.'
            : 'Offer marked as submitted.',
      ))
    )
      this.error.set(this.store.toast()?.text || 'Could not update the offer.')
  }
  async condition(key: ConditionKey, event: Event) {
    const checkbox = event.target as HTMLInputElement
    this.error.set('')
    if (
      !(await this.store.mutate(
        'PATCH',
        '/offers/' + this.id,
        { conditions: { ...this.offer()!.conditions, [key]: !this.offer()!.conditions[key] } },
        'Closing checklist updated.',
      ))
    )
      this.error.set(this.store.toast()?.text || 'Could not update the checklist.')
    checkbox.checked = this.offer()!.conditions[key]
  }
  closeSale() {
    if (offerProgress(this.offer()!) < 3) {
      this.error.set('Complete all three closing conditions before recording the sale.')
      return
    }
    this.dialog
      .open<boolean>(ConfirmDialog, {
        data: {
          title: 'Record this completed sale?',
          message:
            this.store.property(this.offer()!.propertyId).address +
            ' will be marked as sold for ' +
            money(this.offer()!.amountCents) +
            '. Remaining viewings and competing open offers will be cancelled. This is an internal record; no money moves.',
          action: 'Confirm sale',
        },
        panelClass: ['form-dialog', 'compact-dialog'],
        ariaLabelledBy: 'confirm-title',
      })
      .closed.subscribe(confirmed => {
        if (confirmed) void this.status('closed')
      })
  }
  navigate(section: string, id: string) {
    this.ref.close()
    void this.router.navigate(['/' + section, id])
  }
}
