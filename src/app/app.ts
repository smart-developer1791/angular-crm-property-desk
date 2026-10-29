import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { Dialog } from '@angular/cdk/dialog'
import { filter } from 'rxjs'
import { WorkspaceStore } from './core/workspace-store'
import { MockOptions } from './mocks/mock-options'
import { Icon } from './shared/icon'
import { GuideDialog } from './shared/guide-dialog'
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, Icon],
  templateUrl: './app.html',
})
export class App {
  readonly store = inject(WorkspaceStore)
  readonly options = inject(MockOptions)
  private router = inject(Router)
  private dialog = inject(Dialog)
  readonly route = signal('/overview')
  readonly menuOpen = signal(false)
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('workspaceSearch')
  readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton')
  search = ''
  readonly navigation = [
    { path: 'overview', label: 'Overview', icon: 'grid' },
    { path: 'properties', label: 'Properties', icon: 'home' },
    { path: 'buyers', label: 'Buyers', icon: 'people' },
    { path: 'viewings', label: 'Viewings', icon: 'calendar' },
    { path: 'offers', label: 'Offers & deals', icon: 'handshake' },
    { path: 'activity', label: 'Activity', icon: 'clock' },
  ]
  readonly section = computed(
    () => this.navigation.find(n => this.route().startsWith('/' + n.path))?.label || 'Settings',
  )
  constructor() {
    void this.store.load()
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(e => {
        const changed = this.route().split('?')[0] !== e.urlAfterRedirects.split('?')[0]
        this.route.set(e.urlAfterRedirects)
        this.menuOpen.set(false)
        if (changed) {
          this.search = ''
          requestAnimationFrame(() =>
            document.getElementById('main-content')?.focus({ preventScroll: true }),
          )
        }
      })
  }
  searchProperties() {
    if (this.search.trim())
      void this.router.navigate(['/properties'], { queryParams: { search: this.search.trim() } })
  }
  guide() {
    this.dialog.open(GuideDialog, { panelClass: 'form-dialog', ariaLabelledBy: 'guide-title' })
  }
  closeMenu() {
    this.menuOpen.set(false)
    this.menuButton()?.nativeElement.focus()
  }
  @HostListener('document:keydown', ['$event']) keyboard(event: KeyboardEvent) {
    const el = event.target as HTMLElement
    if (event.key === 'Escape' && this.menuOpen()) {
      this.closeMenu()
      return
    }
    if (
      event.key === '/' &&
      !['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) &&
      !el.isContentEditable &&
      !this.dialog.openDialogs.length
    ) {
      event.preventDefault()
      this.searchInput()?.nativeElement.focus()
    }
  }
}
