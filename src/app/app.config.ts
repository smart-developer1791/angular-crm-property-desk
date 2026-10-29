import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { provideRouter, withInMemoryScrolling } from '@angular/router'
import { routes } from './app.routes'
import { mockApiInterceptor } from './mocks/mock-api.interceptor'
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([mockApiInterceptor])),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
  ],
}
