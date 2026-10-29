import { Component, inject } from '@angular/core'
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog'
import { Icon } from './icon'
@Component({
  selector: 'app-confirm-dialog',
  imports: [Icon],
  template: `<div class="modal-top">
      <span class="eyebrow">A WORKSPACE ACTION</span
      ><button class="icon-button" aria-label="Close confirmation" (click)="ref.close(false)">
        <app-icon name="close" />
      </button>
    </div>
    <h2 id="confirm-title">{{ data.title }}</h2>
    <p class="modal-description">{{ data.message }}</p>
    <div class="modal-footer">
      <button class="button" (click)="ref.close(false)">Cancel</button
      ><button class="button primary" (click)="ref.close(true)">{{ data.action }}</button>
    </div>`,
})
export class ConfirmDialog {
  readonly ref = inject(DialogRef<boolean>)
  readonly data = inject<{ title: string; message: string; action: string }>(DIALOG_DATA)
}
