import { Component, inject } from '@angular/core'
import { DialogRef } from '@angular/cdk/dialog'
import { Icon } from './icon'
@Component({
  selector: 'app-guide',
  imports: [Icon],
  template: `<div class="modal-top">
      <span class="eyebrow">MAKE YOURSELF AT HOME</span
      ><button class="icon-button" aria-label="Close workspace guide" (click)="ref.close()">
        <app-icon name="close" />
      </button>
    </div>
    <h2 id="guide-title">A little clarity goes a long way.</h2>
    <p class="modal-description">Haven keeps properties and people connected.</p>
    <ol class="guide-steps">
      <li>
        <strong>Know the property.</strong>
        <p>
          Add a listing with a neighborhood, price, owner, and the details that make it special.
          Save agency favorites for a quick return.
        </p>
      </li>
      <li>
        <strong>Understand the buyer.</strong>
        <p>
          Record their budget, preferred neighborhoods, property types, and bedroom needs. Haven
          finds available matches and keeps a personal shortlist.
        </p>
      </li>
      <li>
        <strong>Open the door.</strong>
        <p>
          Book a viewing with an available buyer, agent, and property. Reschedule when plans change
          and record feedback after the visit.
        </p>
      </li>
      <li>
        <strong>Bring it home.</strong>
        <p>
          Draft an offer, record submission and acceptance, and reserve the property. Verify funds,
          inspection, and the signed agreement before recording the sale.
        </p>
      </li>
    </ol>
    <p class="small-note">
      This is a local demo. It never sends offers, signs documents, or moves money. Your records are
      saved in this browser.
    </p>
    <div class="modal-footer">
      <button class="button primary" (click)="ref.close()">
        Explore the possibilities<app-icon name="arrow" />
      </button>
    </div>`,
})
export class GuideDialog {
  readonly ref = inject(DialogRef)
}
