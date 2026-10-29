import { Component, inject, signal } from '@angular/core'
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { WorkspaceStore } from '../../core/workspace-store'
import {
  Buyer,
  buyerInputSchema,
  centsFrom,
  districts,
  precise,
  propertyTypes,
} from '../../core/domain'
import { Icon } from '../../shared/icon'
@Component({
  selector: 'app-buyer-form',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './buyer-form.html',
})
export class BuyerForm {
  readonly store = inject(WorkspaceStore)
  readonly ref = inject(DialogRef)
  readonly data = inject<{ buyer?: Buyer }>(DIALOG_DATA)
  private fb = inject(FormBuilder)
  readonly error = signal('')
  readonly districts = districts
  readonly types = propertyTypes
  readonly form = this.fb.nonNullable.group({
    name: [this.data.buyer?.name || ''],
    email: [this.data.buyer?.email || ''],
    phone: [this.data.buyer?.phone || ''],
    agentId: [this.data.buyer?.agentId || 'alex'],
    budgetMin: [(this.data.buyer?.budgetMinCents || 50000000) / 100],
    budgetMax: [(this.data.buyer?.budgetMaxCents || 125000000) / 100],
    bedrooms: [this.data.buyer?.bedrooms ?? 3],
    funding: [this.data.buyer?.funding || 'pre-approved'],
    stage: [this.data.buyer?.stage || 'new'],
    types: [this.data.buyer?.types || ['house']],
    districts: [this.data.buyer?.districts || []],
    notes: [this.data.buyer?.notes || ''],
  })
  toggleType(type: (typeof propertyTypes)[number]) {
    const c = this.form.controls.types
    c.setValue(c.value.includes(type) ? c.value.filter(t => t !== type) : [...c.value, type])
  }
  toggleDistrict(district: (typeof districts)[number]) {
    const c = this.form.controls.districts
    c.setValue(
      c.value.includes(district) ? c.value.filter(d => d !== district) : [...c.value, district],
    )
  }
  async save() {
    const raw = this.form.getRawValue()
    if (!precise(raw.budgetMin) || !precise(raw.budgetMax)) {
      this.error.set('Use budgets with no more than two decimal places.')
      return
    }
    const result = buyerInputSchema.safeParse({
      ...raw,
      budgetMinCents: centsFrom(raw.budgetMin),
      budgetMaxCents: centsFrom(raw.budgetMax),
    })
    if (!result.success) {
      this.error.set(result.error.issues[0].message)
      return
    }
    if (
      await this.store.mutate(
        this.data.buyer ? 'PATCH' : 'POST',
        this.data.buyer ? '/buyers/' + this.data.buyer.id : '/buyers',
        result.data,
        this.data.buyer
          ? 'Buyer preferences updated. Matches refreshed.'
          : 'A new relationship, ready to grow.',
      )
    )
      this.ref.close(true)
    else this.error.set(this.store.toast()?.text || 'Could not save this buyer.')
  }
}
