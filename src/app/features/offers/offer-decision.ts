import { Component, inject, signal } from '@angular/core'
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog'
import { FormsModule } from '@angular/forms'
import { WorkspaceStore } from '../../core/workspace-store'
import { Offer } from '../../core/domain'
import { Icon } from '../../shared/icon'
@Component({
  selector: 'app-offer-decision',
  imports: [FormsModule, Icon],
  template: `<div class="modal-top">
      <span class="eyebrow">KEEP THE WHOLE STORY</span
      ><button
        class="icon-button"
        aria-label="Close offer decision"
        [disabled]="store.busy()"
        (click)="ref.close()"
      >
        <app-icon name="close" />
      </button>
    </div>
    <h2 id="offer-decision-title">
      {{ data.status === 'withdrawn' ? 'Close this chapter.' : 'Record the seller’s decision.' }}
    </h2>
    <p class="modal-description">
      {{ data.status === 'withdrawn' ? 'Withdraw' : 'Decline' }} the offer from
      {{ store.buyer(data.offer.buyerId).name }} for
      {{ store.property(data.offer.propertyId).address }}.
    </p>
    <form (ngSubmit)="save()">
      <label class="field-label"
        >Decision reason<textarea
          name="reason"
          [(ngModel)]="reason"
          rows="4"
          maxlength="3000"
          [disabled]="store.busy()"
          placeholder="What changed? Keep the context for your team."
        ></textarea>
      </label>
      @if (data.offer.status === 'accepted') {
        <p class="small-note">
          Withdrawing the accepted offer releases the property back to available. Cancelled viewings
          stay cancelled.
        </p>
      }
      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }
      <div class="modal-footer">
        <button class="button" type="button" [disabled]="store.busy()" (click)="ref.close()">
          Keep offer</button
        ><button class="button primary" [disabled]="store.busy()">
          {{
            store.busy()
              ? 'Saving…'
              : data.status === 'withdrawn'
                ? 'Withdraw offer'
                : 'Record decline'
          }}
        </button>
      </div>
    </form>`,
})
export class OfferDecision {
  readonly store = inject(WorkspaceStore)
  readonly ref = inject(DialogRef)
  readonly data = inject<{ offer: Offer; status: 'withdrawn' | 'declined' }>(DIALOG_DATA)
  readonly error = signal('')
  reason = ''
  async save() {
    if (this.reason.trim().length < 5) {
      this.error.set('Add a reason of at least 5 characters.')
      return
    }
    if (
      await this.store.mutate(
        'PATCH',
        '/offers/' + this.data.offer.id,
        { status: this.data.status, decisionNote: this.reason },
        this.data.status === 'withdrawn'
          ? 'Offer withdrawn. Property availability updated.'
          : 'Seller decision recorded.',
      )
    )
      this.ref.close(true)
    else this.error.set(this.store.toast()?.text || 'Could not record this decision.')
  }
}
