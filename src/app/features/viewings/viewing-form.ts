import { Component, inject, signal } from '@angular/core'
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog'
import { FormsModule } from '@angular/forms'
import { WorkspaceStore } from '../../core/workspace-store'
import { Viewing, localDateTime, viewingInputSchema } from '../../core/domain'
import { Icon } from '../../shared/icon'
@Component({
  selector: 'app-viewing-form',
  imports: [FormsModule, Icon],
  template: `
    <div class="modal-top">
      <span class="eyebrow">TURN A POSSIBILITY INTO A VISIT</span
      ><button
        class="icon-button"
        aria-label="Close viewing form"
        [disabled]="store.busy()"
        (click)="ref.close()"
      >
        <app-icon name="close" />
      </button>
    </div>
    <h2 id="viewing-form-title">
      {{ data.viewing ? 'Find a better time.' : 'Open the door to a new chapter.' }}
    </h2>
    <p class="modal-description">Bring the right people together, with every detail in place.</p>
    <form (ngSubmit)="save()">
      <fieldset class="form-fields" [disabled]="store.busy()">
        <label
          >Property<select name="property" aria-label="Viewing property" [(ngModel)]="propertyId">
            <option value="">Choose an available property</option>
            @for (property of available(); track property.id) {
              <option [value]="property.id">
                {{ property.address }} · {{ property.district }}
              </option>
            }
          </select></label
        >
        @if (propertyId && store.property(propertyId); as property) {
          <div class="selected-property">
            <img
              [src]="'/images/' + property.image + '.webp'"
              alt="Illustrative exterior of selected property"
              width="120"
              height="80"
            /><span
              ><strong>{{ property.address }}</strong
              ><small>{{ property.district }}, Austin · {{ property.reference }}</small></span
            >
          </div>
        }
        <label
          >Buyer<select name="buyer" aria-label="Viewing buyer" [(ngModel)]="buyerId">
            <option value="">Choose a buyer</option>
            @for (buyer of openBuyers(); track buyer.id) {
              <option [value]="buyer.id">{{ buyer.name }}</option>
            }
          </select></label
        ><label
          >Showing agent<select name="agent" aria-label="Showing agent" [(ngModel)]="agentId">
            @for (agent of store.agents(); track agent.id) {
              <option [value]="agent.id">{{ agent.name }}</option>
            }
          </select></label
        >
        <div class="form-grid">
          <label
            >Date & time<input
              type="datetime-local"
              name="starts"
              [(ngModel)]="starts"
              [min]="minimum()" /></label
          ><label
            >Duration<select name="duration" aria-label="Viewing duration" [(ngModel)]="duration">
              @for (value of [30, 45, 60, 90]; track value) {
                <option [ngValue]="value">{{ value }} minutes</option>
              }
            </select></label
          >
        </div>
        <label
          >Showing notes<textarea
            name="note"
            [(ngModel)]="note"
            rows="3"
            maxlength="3000"
            placeholder="Where to meet, what to look for, anything worth knowing…"
          ></textarea>
        </label>
      </fieldset>
      <p class="small-note">
        Times use your device’s local timezone. Your agent, buyer, and property must all be
        available.
      </p>
      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }
      <div class="modal-footer">
        <button type="button" class="button" [disabled]="store.busy()" (click)="ref.close()">
          Cancel</button
        ><button class="button primary" [disabled]="store.busy()">
          {{ store.busy() ? 'Saving…' : data.viewing ? 'Reschedule viewing' : 'Schedule viewing'
          }}<app-icon name="arrow" />
        </button>
      </div>
    </form>
  `,
})
export class ViewingForm {
  readonly store = inject(WorkspaceStore)
  readonly ref = inject(DialogRef)
  readonly data = inject<{ viewing?: Viewing; propertyId?: string; buyerId?: string }>(DIALOG_DATA)
  readonly error = signal('')
  propertyId = this.data.viewing?.propertyId || this.data.propertyId || ''
  buyerId = this.data.viewing?.buyerId || this.data.buyerId || ''
  agentId =
    this.data.viewing?.agentId || (this.buyerId ? this.store.buyer(this.buyerId).agentId : 'alex')
  starts = this.data.viewing ? localDateTime(this.data.viewing.startsAt) : this.tomorrow()
  duration = this.data.viewing?.duration || 45
  note = this.data.viewing?.note || ''
  tomorrow() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
    return localDateTime(d.toISOString())
  }
  minimum() {
    return localDateTime(new Date().toISOString())
  }
  available() {
    return this.store
      .properties()
      .filter(p => p.status === 'available' || p.id === this.data.viewing?.propertyId)
  }
  openBuyers() {
    return this.store
      .buyers()
      .filter(b => b.stage !== 'closed' || b.id === this.data.viewing?.buyerId)
  }
  async save() {
    if (!this.starts || !Number.isFinite(Date.parse(this.starts))) {
      this.error.set('Choose a valid date and time.')
      return
    }
    const parsed = viewingInputSchema.safeParse({
      propertyId: this.propertyId,
      buyerId: this.buyerId,
      agentId: this.agentId,
      startsAt: new Date(this.starts).toISOString(),
      duration: this.duration,
      note: this.note,
    })
    if (!parsed.success) {
      this.error.set(parsed.error.issues[0].message)
      return
    }
    if (
      await this.store.mutate(
        this.data.viewing ? 'PATCH' : 'POST',
        this.data.viewing ? '/viewings/' + this.data.viewing.id : '/viewings',
        parsed.data,
        this.data.viewing
          ? 'Viewing rescheduled. Everyone has room in their day.'
          : 'Viewing scheduled. A new possibility awaits.',
      )
    )
      this.ref.close(true)
    else this.error.set(this.store.toast()?.text || 'Could not schedule the viewing.')
  }
}
