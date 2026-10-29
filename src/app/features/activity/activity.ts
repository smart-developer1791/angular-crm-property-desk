import { Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { WorkspaceStore } from '../../core/workspace-store'
import { Icon } from '../../shared/icon'
import { ActivityFeed } from '../../shared/activity-feed'
@Component({
  selector: 'app-activity',
  imports: [FormsModule, Icon, ActivityFeed],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">THE WHOLE STORY, TOGETHER</span>
        <h1>Every step means something.</h1>
        <p>New relationships, open doors, and moving milestones. Your agency’s shared memory.</p>
      </div>
    </div>
    <section class="surface activity-surface">
      <div class="surface-header">
        <h2>
          Around the agency<span class="count">{{ filtered().length }}</span>
        </h2>
        <label class="search-field"
          ><app-icon name="search" /><input
            aria-label="Search activity"
            placeholder="Find a moment…"
            [ngModel]="search()"
            (ngModelChange)="search.set($event); page.set(1)"
        /></label>
      </div>
      <div class="activity-filters">
        <select
          aria-label="Activity type"
          [ngModel]="kind()"
          (ngModelChange)="kind.set($event); page.set(1)"
        >
          <option value="">All updates</option>
          @for (kind of kinds; track kind) {
            <option [value]="kind">{{ kind }}</option>
          }</select
        ><select
          aria-label="Activity property"
          [ngModel]="property()"
          (ngModelChange)="property.set($event); page.set(1)"
        >
          <option value="">All properties</option>
          @for (property of store.properties(); track property.id) {
            <option [value]="property.id">{{ property.address }}</option>
          }
        </select>
      </div>
      <div class="agency-timeline">
        <app-activity-feed
          [items]="filtered().slice((page() - 1) * 15, page() * 15)"
          [links]="true"
        />
      </div>
      <div class="pagination">
        <span>{{ filtered().length }} moments in your agency’s story</span>
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
  `,
})
export class ActivityPage {
  readonly store = inject(WorkspaceStore)
  readonly search = signal('')
  readonly kind = signal('')
  readonly property = signal('')
  readonly page = signal(1)
  readonly kinds = ['listing', 'buyer', 'viewing', 'offer', 'note']
  readonly filtered = computed(() =>
    this.store
      .activity()
      .filter(
        e =>
          (!this.kind() || e.kind === this.kind()) &&
          (!this.property() || e.propertyId === this.property()) &&
          [e.text, e.actor, e.buyerId ? this.store.buyer(e.buyerId).name : '']
            .join(' ')
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 15)))
}
