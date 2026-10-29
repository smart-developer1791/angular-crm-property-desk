import { Component, computed, inject, signal } from '@angular/core'
import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { WorkspaceStore } from '../../core/workspace-store'
import { dateLabel, now, timeLabel } from '../../core/domain'
import { Icon } from '../../shared/icon'
import { ViewingForm } from './viewing-form'
@Component({
  selector: 'app-viewing-detail',
  imports: [FormsModule, Icon],
  template: `
    <div class="modal-top">
      <span class="eyebrow">A CLOSER LOOK</span
      ><button
        class="icon-button"
        aria-label="Close viewing details"
        [disabled]="store.busy()"
        (click)="ref.close()"
      >
        <app-icon name="close" />
      </button>
    </div>
    @if (viewing(); as v) {
      <h2 id="viewing-detail-title">A place to picture their future.</h2>
      <div class="viewing-detail-image">
        <img
          [src]="'/images/' + store.property(v.propertyId).image + '.webp'"
          alt="Illustrative property exterior"
          width="1536"
          height="1024"
        /><span [class]="'badge ' + v.status">{{ v.status }}</span>
      </div>
      <button class="detail-property-link" (click)="openProperty(v.propertyId)">
        <h3>{{ store.property(v.propertyId).address }}</h3>
        <app-icon name="arrowUp" />
      </button>
      <p class="modal-location">{{ store.property(v.propertyId).district }}, Austin</p>
      <div class="viewing-facts">
        <span
          ><app-icon name="calendar" /><span
            ><small>DATE & TIME</small>{{ dateLabel(v.startsAt) }} ·
            {{ timeLabel(v.startsAt) }}</span
          ></span
        ><span
          ><app-icon name="clock" /><span
            ><small>DURATION</small>{{ v.duration }} minutes</span
          ></span
        ><span
          ><app-icon name="people" /><span
            ><small>BUYER</small>{{ store.buyer(v.buyerId).name }}</span
          ></span
        ><span
          ><span class="avatar small" [style.background]="store.agent(v.agentId).color">{{
            store.agent(v.agentId).initials
          }}</span
          ><span><small>SHOWING AGENT</small>{{ store.agent(v.agentId).name }}</span></span
        >
      </div>
      @if (v.note) {
        <div class="context-note">{{ v.note }}</div>
      }
      @if (v.status === 'scheduled') {
        <div class="decision-tabs">
          <button
            [class.active]="action() === 'completed'"
            [disabled]="v.startsAt > now()"
            (click)="action.set('completed')"
          >
            Record feedback</button
          ><button [class.active]="action() === 'cancelled'" (click)="action.set('cancelled')">
            Cancel viewing
          </button>
        </div>
        @if (action()) {
          <label class="field-label"
            >{{ action() === 'completed' ? 'Viewing feedback' : 'Cancellation reason'
            }}<textarea
              [(ngModel)]="outcome"
              rows="3"
              maxlength="3000"
              [disabled]="store.busy()"
              placeholder="Keep the context with the relationship…"
            ></textarea>
          </label>
          <p class="small-note">
            At least 5 characters. This outcome will be kept in the shared history.
          </p>
        } @else {
          <p class="small-note">
            Feedback can be recorded after the scheduled start. You can reschedule or cancel before
            then.
          </p>
        }
      } @else {
        <div class="outcome-note">
          <span class="eyebrow">{{
            v.status === 'completed' ? 'VIEWING FEEDBACK' : 'CANCELLATION REASON'
          }}</span>
          <p>{{ v.outcome }}</p>
        </div>
      }
      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }
      <div class="modal-footer">
        @if (v.status === 'scheduled') {
          <button class="button" [disabled]="store.busy()" (click)="reschedule()">
            <app-icon name="calendar" />Reschedule
          </button>
          @if (action()) {
            <button class="button primary" [disabled]="store.busy()" (click)="save()">
              {{
                store.busy()
                  ? 'Saving…'
                  : action() === 'completed'
                    ? 'Save feedback'
                    : 'Confirm cancellation'
              }}
            </button>
          }
        } @else {
          <button class="button" (click)="ref.close()">Done</button>
        }
      </div>
    }
  `,
})
export class ViewingDetail {
  readonly store = inject(WorkspaceStore)
  readonly ref = inject(DialogRef)
  private id = inject<string>(DIALOG_DATA)
  private dialog = inject(Dialog)
  private router = inject(Router)
  readonly viewing = computed(() => this.store.viewings().find(v => v.id === this.id))
  readonly dateLabel = dateLabel
  readonly timeLabel = timeLabel
  readonly now = now
  readonly action = signal<'completed' | 'cancelled' | ''>('')
  readonly error = signal('')
  outcome = ''
  constructor() {
    if (this.viewing()?.status === 'scheduled' && this.viewing()!.startsAt <= now())
      this.action.set('completed')
  }
  reschedule() {
    this.dialog
      .open(ViewingForm, {
        data: { viewing: this.viewing() },
        panelClass: 'form-dialog',
        ariaLabelledBy: 'viewing-form-title',
      })
      .closed.subscribe(saved => {
        if (saved) this.action.set(this.viewing()!.startsAt <= now() ? 'completed' : '')
      })
  }
  async save() {
    if (this.outcome.trim().length < 5) {
      this.error.set('Add at least 5 characters of feedback.')
      return
    }
    if (
      await this.store.mutate(
        'PATCH',
        '/viewings/' + this.id,
        { status: this.action(), outcome: this.outcome },
        this.action() === 'completed'
          ? 'Viewing feedback saved.'
          : 'Viewing cancelled. Your calendar is up to date.',
      )
    )
      this.ref.close(true)
    else this.error.set(this.store.toast()?.text || 'Could not record the outcome.')
  }
  openProperty(id: string) {
    this.ref.close()
    void this.router.navigate(['/properties', id])
  }
}
