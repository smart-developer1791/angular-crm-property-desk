import { Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { Dialog } from '@angular/cdk/dialog'
import { WorkspaceStore } from '../../core/workspace-store'
import { compactMoney, initials } from '../../core/domain'
import { Icon } from '../../shared/icon'
import { BuyerForm } from './buyer-form'
@Component({
  selector: 'app-buyers',
  imports: [FormsModule, RouterLink, Icon],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">PEOPLE FIRST. ALWAYS.</span>
        <h1>Every buyer has a story.</h1>
        <p>Understand what matters. Find a place that feels like their own.</p>
      </div>
      <button class="button primary" (click)="create()"><app-icon name="plus" />Add buyer</button>
    </div>
    <div class="buyer-metrics">
      <div>
        <span class="metric-icon blue"><app-icon name="people" /></span
        ><span
          >Open relationships<strong>{{ store.metrics().buyers }}</strong></span
        >
      </div>
      <div>
        <span class="metric-icon green"><app-icon name="sparkle" /></span
        ><span
          >Buyers with matches<strong>{{ withMatches() }}</strong></span
        >
      </div>
      <div>
        <span class="metric-icon amber"><app-icon name="heart" /></span
        ><span
          >Shortlisted properties<strong>{{ shortlisted() }}</strong></span
        >
      </div>
    </div>
    <section class="surface">
      <div class="surface-header">
        <h2>
          Your buyer desk<span class="count">{{ filtered().length }}</span>
        </h2>
        <label class="search-field"
          ><app-icon name="search" /><input
            aria-label="Search buyers"
            placeholder="Find a name, email, or preference…"
            [ngModel]="search()"
            (ngModelChange)="search.set($event); page.set(1)"
        /></label>
      </div>
      <div class="buyer-toolbar">
        <div class="tabs">
          @for (stage of stages; track stage) {
            <button [class.active]="status() === stage" (click)="status.set(stage); page.set(1)">
              {{ stage === 'all' ? 'All buyers' : stage === 'new' ? 'New inquiries' : stage }}
            </button>
          }
        </div>
        <select
          aria-label="Filter buyer agent"
          [ngModel]="agent()"
          (ngModelChange)="agent.set($event); page.set(1)"
        >
          <option value="">All agents</option>
          @for (agent of store.agents(); track agent.id) {
            <option [value]="agent.id">{{ agent.name }}</option>
          }
        </select>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Buyer</th>
              <th>Preferences</th>
              <th>Budget range</th>
              <th>Matches</th>
              <th>Stage</th>
              <th>Agent</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (buyer of filtered().slice((page() - 1) * 10, page() * 10); track buyer.id) {
              <tr>
                <td>
                  <a class="person-cell" [routerLink]="['/buyers', buyer.id]"
                    ><span class="avatar" [style.background]="store.agent(buyer.agentId).color">{{
                      initials(buyer.name)
                    }}</span
                    ><span
                      ><strong>{{ buyer.name }}</strong
                      ><small>{{ buyer.email }}</small></span
                    ></a
                  >
                </td>
                <td>
                  <span class="capitalize">{{ buyer.types.join(' / ') }}</span
                  ><small class="cell-secondary"
                    >{{ buyer.bedrooms }}+ beds ·
                    {{
                      buyer.districts.length
                        ? buyer.districts.length + ' neighborhoods'
                        : 'All neighborhoods'
                    }}</small
                  >
                </td>
                <td class="number">
                  {{ compactMoney(buyer.budgetMinCents) }} –
                  {{ compactMoney(buyer.budgetMaxCents) }}
                </td>
                <td>
                  <a class="match-chip" [routerLink]="['/buyers', buyer.id]"
                    ><app-icon name="sparkle" />{{ store.matches(buyer.id).length }} matches</a
                  >
                </td>
                <td>
                  <span [class]="'badge ' + buyer.stage">{{ buyer.stage }}</span>
                </td>
                <td>
                  <span class="agent-cell"
                    ><span
                      class="avatar tiny"
                      [style.background]="store.agent(buyer.agentId).color"
                      >{{ store.agent(buyer.agentId).initials }}</span
                    >{{ store.agent(buyer.agentId).name }}</span
                  >
                </td>
                <td>
                  <a
                    class="icon-button"
                    [routerLink]="['/buyers', buyer.id]"
                    [attr.aria-label]="'Open ' + buyer.name"
                    ><app-icon name="arrowUp"
                  /></a>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="empty-state">
                    <app-icon name="people" />
                    <h3>No buyers in this view.</h3>
                    <p>Try another search, stage, or agent.</p>
                    <button
                      class="button"
                      (click)="search.set(''); status.set('all'); agent.set('')"
                    >
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
        <span>{{ filtered().length }} relationships, thoughtfully connected</span>
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
export class Buyers {
  readonly store = inject(WorkspaceStore)
  private dialog = inject(Dialog)
  readonly search = signal('')
  readonly status = signal('all')
  readonly agent = signal('')
  readonly page = signal(1)
  readonly stages = ['all', 'new', 'qualifying', 'active', 'closed']
  readonly initials = initials
  readonly compactMoney = compactMoney
  readonly filtered = computed(() =>
    this.store
      .buyers()
      .filter(
        b =>
          (this.status() === 'all' || b.stage === this.status()) &&
          (!this.agent() || b.agentId === this.agent()) &&
          [b.name, b.email, b.notes, ...b.districts, ...b.types]
            .join(' ')
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      ),
  )
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 10)))
  readonly withMatches = computed(
    () =>
      this.store.buyers().filter(b => b.stage !== 'closed' && this.store.matches(b.id).length)
        .length,
  )
  readonly shortlisted = computed(() =>
    this.store.buyers().reduce((s, b) => s + b.shortlistIds.length, 0),
  )
  create() {
    this.dialog.open(BuyerForm, {
      data: {},
      panelClass: 'form-dialog',
      ariaLabelledBy: 'buyer-form-title',
    })
  }
}
