import { Component, inject, signal } from '@angular/core'
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog'
import { FormsModule } from '@angular/forms'
import { WorkspaceStore } from '../../core/workspace-store'
import { Offer, centsFrom, money, offerInputSchema, precise, today } from '../../core/domain'
import { Icon } from '../../shared/icon'
@Component({
  selector: 'app-offer-form',
  imports: [FormsModule, Icon],
  template: `
    <div class="modal-top">
      <span class="eyebrow">FROM POSSIBILITY TO AGREEMENT</span
      ><button
        class="icon-button"
        aria-label="Close offer form"
        [disabled]="store.busy()"
        (click)="ref.close()"
      >
        <app-icon name="close" />
      </button>
    </div>
    <h2 id="offer-form-title">
      {{ data.offer ? 'Fine-tune the proposal.' : 'Put a good offer on the table.' }}
    </h2>
    <p class="modal-description">Keep the property, people, and terms connected from the start.</p>
    <form (ngSubmit)="save()">
      <fieldset class="form-fields" [disabled]="store.busy()">
        <label
          >Property<select
            name="property"
            aria-label="Offer property"
            [(ngModel)]="propertyId"
            (ngModelChange)="updatePrice()"
            [disabled]="!!data.offer"
          >
            <option value="">Choose an available property</option>
            @for (property of available(); track property.id) {
              <option [value]="property.id">{{ property.address }}</option>
            }
          </select></label
        >
        @if (propertyId) {
          <div class="offer-price-context">
            <span
              >Asking price<strong>{{ money(store.property(propertyId).priceCents) }}</strong></span
            ><span
              >Listing reference<strong>{{ store.property(propertyId).reference }}</strong></span
            >
          </div>
        }
        <label
          >Buyer<select
            name="buyer"
            aria-label="Offer buyer"
            [(ngModel)]="buyerId"
            [disabled]="!!data.offer"
          >
            <option value="">Choose a buyer</option>
            @for (buyer of openBuyers(); track buyer.id) {
              <option [value]="buyer.id">{{ buyer.name }}</option>
            }
          </select></label
        ><label
          >Offer agent<select
            name="agent"
            aria-label="Offer agent"
            [(ngModel)]="agentId"
            [disabled]="!!data.offer"
          >
            @for (agent of store.agents(); track agent.id) {
              <option [value]="agent.id">{{ agent.name }}</option>
            }
          </select></label
        >
        <div class="form-grid">
          <label
            >Offer amount (USD)<input
              type="number"
              name="amount"
              [(ngModel)]="amount"
              min="0.01"
              max="10000000"
              step="0.01" /></label
          ><label
            >Planned closing date<input
              type="date"
              name="date"
              [(ngModel)]="closingDate"
              [min]="today()"
          /></label>
        </div>
        <label
          >Offer notes<textarea
            name="note"
            [(ngModel)]="note"
            rows="4"
            maxlength="3000"
            placeholder="Terms, timing, and anything the team should know…"
          ></textarea>
        </label>
      </fieldset>
      <p class="small-note">This saves an internal draft. No offer is sent to a seller.</p>
      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }
      <div class="modal-footer">
        <button type="button" class="button" [disabled]="store.busy()" (click)="ref.close()">
          Cancel</button
        ><button class="button primary" [disabled]="store.busy()">
          {{ store.busy() ? 'Saving…' : 'Save draft' }}<app-icon name="arrow" />
        </button>
      </div>
    </form>
  `,
})
export class OfferForm {
  readonly store = inject(WorkspaceStore)
  readonly ref = inject(DialogRef)
  readonly data = inject<{ offer?: Offer; propertyId?: string; buyerId?: string }>(DIALOG_DATA)
  readonly error = signal('')
  readonly money = money
  readonly today = today
  propertyId = this.data.offer?.propertyId || this.data.propertyId || ''
  buyerId = this.data.offer?.buyerId || this.data.buyerId || ''
  agentId =
    this.data.offer?.agentId || (this.buyerId ? this.store.buyer(this.buyerId).agentId : 'alex')
  amount = this.data.offer
    ? this.data.offer.amountCents / 100
    : this.propertyId
      ? this.store.property(this.propertyId).priceCents / 100
      : 850000
  closingDate =
    this.data.offer?.closingDate || new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-CA')
  note = this.data.offer?.note || ''
  updatePrice() {
    if (this.propertyId) this.amount = this.store.property(this.propertyId).priceCents / 100
  }
  available() {
    return this.store
      .properties()
      .filter(p => p.status === 'available' || p.id === this.data.offer?.propertyId)
  }
  openBuyers() {
    return this.store
      .buyers()
      .filter(b => b.stage !== 'closed' || b.id === this.data.offer?.buyerId)
  }
  async save() {
    if (!precise(this.amount)) {
      this.error.set('Use an offer with no more than two decimal places.')
      return
    }
    const parsed = offerInputSchema.safeParse({
      propertyId: this.propertyId,
      buyerId: this.buyerId,
      agentId: this.agentId,
      amountCents: centsFrom(this.amount),
      closingDate: this.closingDate,
      note: this.note,
    })
    if (!parsed.success) {
      this.error.set(parsed.error.issues[0].message)
      return
    }
    if (
      await this.store.mutate(
        this.data.offer ? 'PATCH' : 'POST',
        this.data.offer ? '/offers/' + this.data.offer.id : '/offers',
        parsed.data,
        this.data.offer ? 'Draft offer updated.' : 'Offer draft ready for the next conversation.',
      )
    )
      this.ref.close(true)
    else this.error.set(this.store.toast()?.text || 'Could not save the offer.')
  }
}
