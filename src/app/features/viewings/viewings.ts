import { Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Dialog } from '@angular/cdk/dialog'
import { WorkspaceStore } from '../../core/workspace-store'
import { dateLabel, initials, localDateTime, timeLabel, today } from '../../core/domain'
import { Icon } from '../../shared/icon'
import { ViewingForm } from './viewing-form'
import { ViewingDetail } from './viewing-detail'
@Component({
  selector: 'app-viewings',
  imports: [FormsModule, Icon],
  templateUrl: './viewings.html',
})
export class Viewings {
  readonly store = inject(WorkspaceStore)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private dialog = inject(Dialog)
  readonly selected = signal(today())
  readonly scope = signal('day')
  readonly agent = signal('')
  readonly status = signal('scheduled')
  readonly search = signal('')
  readonly dateLabel = dateLabel
  readonly timeLabel = timeLabel
  readonly initials = initials
  readonly today = today
  readonly localDateTime = localDateTime
  readonly days = computed(() => {
    const d = new Date(this.selected() + 'T12:00:00')
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(d)
      day.setDate(d.getDate() + i)
      return {
        date: day.toLocaleDateString('en-CA'),
        weekday: day.toLocaleDateString('en-US', { weekday: 'short' }),
        day: day.getDate(),
      }
    })
  })
  readonly heading = computed(() =>
    new Date(this.selected() + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
  )
  readonly filtered = computed(() =>
    this.store
      .viewings()
      .filter(
        v =>
          (this.scope() === 'all' || localDateTime(v.startsAt).slice(0, 10) === this.selected()) &&
          (!this.agent() || v.agentId === this.agent()) &&
          (this.status() === 'all' || v.status === this.status()) &&
          [
            this.store.property(v.propertyId).address,
            this.store.buyer(v.buyerId).name,
            v.note,
            v.outcome,
          ]
            .join(' ')
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  )
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(q => {
      const date = q.get('date')
      this.selected.set(
        date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date))
          ? date
          : today(),
      )
      this.scope.set(q.get('scope') === 'all' ? 'all' : 'day')
    })
  }
  count(date: string) {
    return this.store
      .viewings()
      .filter(v => v.status === 'scheduled' && localDateTime(v.startsAt).slice(0, 10) === date)
      .length
  }
  update(date: string, scope = 'day') {
    if (date)
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { date, scope },
        replaceUrl: true,
      })
  }
  move(offset: number) {
    const d = new Date(this.selected() + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    this.update(d.toLocaleDateString('en-CA'))
  }
  create() {
    this.dialog.open(ViewingForm, {
      data: {},
      panelClass: 'form-dialog',
      ariaLabelledBy: 'viewing-form-title',
    })
  }
  open(id: string) {
    this.dialog.open(ViewingDetail, {
      data: id,
      panelClass: 'form-dialog',
      ariaLabelledBy: 'viewing-detail-title',
    })
  }
}
