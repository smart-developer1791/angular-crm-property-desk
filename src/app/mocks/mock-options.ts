import { Injectable, signal } from '@angular/core'
@Injectable({ providedIn: 'root' })
export class MockOptions {
  readonly latency = signal(300)
  readonly failNext = signal(false)
  readonly storageAvailable = signal(true)
  readonly storageNotice = signal('')
}
