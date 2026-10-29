import { Component, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { DecimalPipe } from '@angular/common'
import { WorkspaceStore } from '../core/workspace-store'
import { Property, money, daysOnMarket } from '../core/domain'
import { Icon } from './icon'
@Component({
  selector: 'app-property-card',
  imports: [RouterLink, DecimalPipe, Icon],
  template: `
    <article class="property-card">
      <div class="property-image">
        <a
          [routerLink]="['/properties', property().id]"
          [attr.aria-label]="'View ' + property().address"
          ><img
            [src]="'/images/' + property().image + '.webp'"
            [alt]="'Illustrative exterior for ' + property().address"
            loading="lazy"
            width="1536"
            height="1024" /></a
        ><span [class]="'image-status ' + property().status"
          ><i></i>{{ property().status === 'available' ? 'For sale' : property().status }}</span
        ><button
          class="favorite-button"
          [class.is-saved]="property().featured"
          [attr.aria-pressed]="property().featured"
          [attr.aria-label]="(property().featured ? 'Unsave ' : 'Save ') + property().address"
          [disabled]="store.busy()"
          (click)="favorite()"
        >
          <app-icon name="heart" /></button
        ><span class="image-type">{{ property().type }}</span>
      </div>
      <div class="property-card-body">
        <div class="property-price">
          <strong>{{ money(property().priceCents) }}</strong
          ><span>{{ daysOnMarket(property()) }} days listed</span>
        </div>
        <a class="property-address" [routerLink]="['/properties', property().id]"
          ><h3>{{ property().address }}</h3></a
        >
        <p class="property-location"><app-icon name="pin" />{{ property().district }}, Austin</p>
        <div class="property-specs">
          <span><app-icon name="bed" />{{ property().bedrooms }} beds</span
          ><span><app-icon name="bath" />{{ property().bathrooms }} baths</span
          ><span><app-icon name="area" />{{ property().area | number }} sqft</span>
        </div>
        <div class="property-card-footer">
          <span
            ><span class="avatar tiny" [style.background]="store.agent(property().agentId).color">{{
              store.agent(property().agentId).initials
            }}</span
            >{{ store.agent(property().agentId).name }}</span
          ><a [routerLink]="['/properties', property().id]" class="text-button"
            >View details<app-icon name="arrow"
          /></a>
        </div>
      </div>
    </article>
  `,
})
export class PropertyCard {
  readonly property = input.required<Property>()
  readonly store = inject(WorkspaceStore)
  readonly money = money
  readonly daysOnMarket = daysOnMarket
  favorite() {
    void this.store.mutate(
      'PATCH',
      '/properties/' + this.property().id,
      { featured: !this.property().featured },
      this.property().featured
        ? 'Property removed from saved listings.'
        : 'Property added to saved listings.',
    )
  }
}
