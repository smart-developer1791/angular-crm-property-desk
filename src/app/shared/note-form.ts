import { Component, inject, input, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { WorkspaceStore } from '../core/workspace-store'
import { Icon } from './icon'
@Component({
  selector: 'app-note-form',
  imports: [FormsModule, Icon],
  template: `<form class="note-composer" (ngSubmit)="save()">
    <label for="context-note">A little context goes a long way.</label
    ><textarea
      id="context-note"
      name="note"
      [(ngModel)]="note"
      rows="3"
      maxlength="3000"
      placeholder="A conversation, a preference, or the next step…"
      [disabled]="store.busy()"
    ></textarea>
    <div>
      <span>Visible to your agency</span
      ><button class="button primary small" [disabled]="store.busy()">
        <app-icon name="plus" />Add note
      </button>
    </div>
    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
  </form>`,
})
export class NoteForm {
  readonly propertyId = input<string | null>(null)
  readonly buyerId = input<string | null>(null)
  readonly store = inject(WorkspaceStore)
  readonly error = signal('')
  note = ''
  async save() {
    this.error.set('')
    if (this.note.trim().length < 3) {
      this.error.set('Add at least 3 characters to your note.')
      return
    }
    if (
      await this.store.mutate(
        'POST',
        '/notes',
        { propertyId: this.propertyId(), buyerId: this.buyerId(), text: this.note },
        'Note saved with the relationship.',
      )
    )
      this.note = ''
    else this.error.set(this.store.toast()?.text || 'Could not save the note.')
  }
}
