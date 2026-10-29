import { Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Dialog } from '@angular/cdk/dialog'
import { WorkspaceStore } from '../../core/workspace-store'
import { MockOptions } from '../../mocks/mock-options'
import { Icon } from '../../shared/icon'
import { ConfirmDialog } from '../../shared/confirm-dialog'
@Component({
  selector: 'app-settings',
  imports: [FormsModule, Icon],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">A WORKSPACE THAT FEELS LIKE HOME</span>
        <h1>The details behind the desk.</h1>
        <p>Your agency, your people, and a little room to explore.</p>
      </div>
    </div>
    <div class="settings-layout">
      <div>
        <section class="surface settings-section">
          <div class="surface-header">
            <h2>Your agency</h2>
            <span class="badge draft">Demo workspace</span>
          </div>
          <div class="workspace-identity">
            <span class="brand-icon"><app-icon name="home" /></span>
            <div>
              <h3>Haven Realty</h3>
              <p>Great places. Better connections.</p>
            </div>
          </div>
          <dl class="settings-details">
            <div>
              <dt>Location</dt>
              <dd>Austin, Texas</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>US dollar · USD</dd>
            </div>
            <div>
              <dt>Time display</dt>
              <dd>{{ timezone }}</dd>
            </div>
            <div>
              <dt>Current member</dt>
              <dd>Alex Morgan · Managing broker</dd>
            </div>
            <div>
              <dt>Saved workspace</dt>
              <dd>
                {{ options.storageAvailable() ? 'This browser · IndexedDB' : 'This session only' }}
              </dd>
            </div>
          </dl>
        </section>
        <section class="surface settings-section">
          <div class="surface-header">
            <h2>The people making it happen</h2>
            <span class="count">{{ store.agents().length }}</span>
          </div>
          <div class="team-list">
            @for (agent of store.agents(); track agent.id) {
              <div>
                <span class="avatar" [style.background]="agent.color">{{ agent.initials }}</span
                ><span
                  ><strong>{{ agent.name }}</strong
                  ><small>{{ agent.role }}</small></span
                >
                @if (agent.id === 'alex') {
                  <span class="badge draft">You</span>
                }
              </div>
            }
          </div>
          <p class="settings-note">
            A fictional agency team for exploring ownership and scheduling. Invitations and sign-in
            are not connected.
          </p>
        </section>
      </div>
      <div>
        <section class="surface settings-section">
          <div class="surface-header">
            <h2>Explore the demo</h2>
            <app-icon name="settings" />
          </div>
          <div class="settings-controls">
            <label
              >API response time<select
                aria-label="API response time"
                [ngModel]="options.latency()"
                (ngModelChange)="options.latency.set(+$event)"
              >
                <option [ngValue]="0">Instant · 0 ms</option>
                <option [ngValue]="300">Everyday · 300 ms</option>
                <option [ngValue]="1200">Slow connection · 1,200 ms</option>
              </select></label
            >
            <div class="toggle-row">
              <div>
                <strong>Fail the next request</strong>
                <p>Explore an interruption and a successful retry.</p>
              </div>
              <button
                class="toggle"
                role="switch"
                aria-label="Fail the next request"
                [attr.aria-checked]="options.failNext()"
                (click)="options.failNext.set(!options.failNext())"
              >
                <span></span>
              </button>
            </div>
            @if (options.failNext()) {
              <div class="inline-notice">
                Armed. The next API request will fail once. Retry to continue.
              </div>
            }
            <p class="small-note">
              Connection controls reset on reload. Your changes stay saved in this browser.
            </p>
          </div>
        </section>
        <section class="reset-card">
          <app-icon name="refresh" />
          <h2>A fresh set of possibilities.</h2>
          <p>
            Restore the sample properties, buyers, viewings, offers, and history. Your changes in
            this demo will be removed.
          </p>
          <button class="button" [disabled]="store.busy()" (click)="reset()">
            Reset demo workspace<app-icon name="arrow" />
          </button>
        </section>
        <p class="settings-footnote">
          Listing images are original AI-generated architectural concepts, reused across fictional
          records. No real listings, messages, contracts, or payments are connected.
        </p>
      </div>
    </div>
  `,
})
export class Settings {
  readonly store = inject(WorkspaceStore)
  readonly options = inject(MockOptions)
  private dialog = inject(Dialog)
  readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  reset() {
    this.dialog
      .open<boolean>(ConfirmDialog, {
        data: {
          title: 'Start with a fresh workspace?',
          message:
            'This replaces saved Haven data with the original sample agency. Created listings, buyer preferences, viewings, offers, and notes will be removed from this browser.',
          action: 'Reset workspace',
        },
        panelClass: ['form-dialog', 'compact-dialog'],
        ariaLabelledBy: 'confirm-title',
      })
      .closed.subscribe(confirmed => {
        if (confirmed)
          void this.store.mutate(
            'POST',
            '/reset',
            {},
            'Workspace reset. Ready for the next possibility.',
          )
      })
  }
}
