import { Component, inject, signal } from '@angular/core'
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { WorkspaceStore } from '../../core/workspace-store'
import {
  Property,
  assets,
  centsFrom,
  districts,
  precise,
  propertyInputSchema,
  propertyTypes,
} from '../../core/domain'
import { Icon } from '../../shared/icon'
@Component({
  selector: 'app-property-form',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './property-form.html',
})
export class PropertyForm {
  readonly store = inject(WorkspaceStore)
  readonly ref = inject(DialogRef)
  readonly data = inject<{ property?: Property }>(DIALOG_DATA)
  private fb = inject(FormBuilder)
  readonly error = signal('')
  readonly maxYear = new Date().getFullYear() + 2
  readonly districts = districts
  readonly types = propertyTypes
  readonly assets = assets
  readonly form = this.fb.nonNullable.group({
    address: [this.data.property?.address || '', Validators.required],
    district: [this.data.property?.district || 'Bouldin Creek'],
    type: [this.data.property?.type || 'house'],
    price: [(this.data.property?.priceCents || 85000000) / 100],
    bedrooms: [this.data.property?.bedrooms ?? 3],
    bathrooms: [this.data.property?.bathrooms || 2],
    area: [this.data.property?.area || 2000],
    year: [this.data.property?.year || 2024],
    agentId: [this.data.property?.agentId || 'alex'],
    description: [this.data.property?.description || '', Validators.required],
    image: [this.data.property?.image || 'limestone'],
    features: [
      this.data.property?.features.join(', ') ||
        'Natural light, Open-plan living, Private outdoor space',
    ],
  })
  async save() {
    this.form.markAllAsTouched()
    const raw = this.form.getRawValue()
    if (!precise(raw.price)) {
      this.error.set('Use a price with no more than two decimal places.')
      return
    }
    const result = propertyInputSchema.safeParse({
      ...raw,
      priceCents: centsFrom(raw.price),
      features: raw.features
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    })
    if (!result.success) {
      this.error.set(result.error.issues[0].message)
      return
    }
    if (
      await this.store.mutate(
        this.data.property ? 'PATCH' : 'POST',
        this.data.property ? '/properties/' + this.data.property.id : '/properties',
        result.data,
        this.data.property ? 'Listing details updated.' : 'A new home, ready for its next chapter.',
      )
    )
      this.ref.close(true)
    else this.error.set(this.store.toast()?.text || 'Could not save the listing.')
  }
}
