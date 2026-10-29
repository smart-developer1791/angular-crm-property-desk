import { Component, inject, input } from '@angular/core'
import { DatePipe } from '@angular/common'
import { RouterLink } from '@angular/router'
import { Activity } from '../core/domain'
import { WorkspaceStore } from '../core/workspace-store'
import { Icon } from './icon'
@Component({
  selector: 'app-activity-feed',
  imports: [DatePipe, RouterLink, Icon],
  template: `<div class="timeline">
    @for (event of items(); track event.id) {
      <article>
        <span [class]="'event-icon event-' + event.kind"
          ><app-icon [name]="icons[event.kind]"
        /></span>
        <div>
          <div class="event-meta">
            <strong>{{ event.actor }}</strong
            ><time>{{ event.createdAt | date: 'MMM d, h:mm a' }}</time>
          </div>
          <p>{{ event.text }}</p>
          @if (links()) {
            @if (event.propertyId) {
              <a class="event-link" [routerLink]="['/properties', event.propertyId]"
                >{{ store.property(event.propertyId).reference }}<app-icon name="arrowUp"
              /></a>
            } @else if (event.buyerId) {
              <a class="event-link" [routerLink]="['/buyers', event.buyerId]"
                >{{ store.buyer(event.buyerId).name }}<app-icon name="arrowUp"
              /></a>
            }
          }
        </div>
      </article>
    } @empty {
      <p class="empty-line">A new story starts here. Updates will appear as work moves forward.</p>
    }
  </div>`,
})
export class ActivityFeed {
  readonly items = input.required<Activity[]>()
  readonly links = input(false)
  readonly store = inject(WorkspaceStore)
  readonly icons: Record<string, string> = {
    listing: 'home',
    buyer: 'people',
    viewing: 'calendar',
    offer: 'handshake',
    note: 'note',
  }
}
