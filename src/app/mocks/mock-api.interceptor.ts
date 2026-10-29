import { inject } from '@angular/core'
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http'
import { defer, from, map, switchMap, throwError, timer } from 'rxjs'
import { MockDatabase } from './mock-database'
import { MockOptions } from './mock-options'
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req)
  const db = inject(MockDatabase),
    options = inject(MockOptions)
  return defer(() => {
    const fail = options.failNext()
    if (fail) options.failNext.set(false)
    return timer(options.latency()).pipe(
      switchMap(() =>
        fail
          ? throwError(
              () =>
                new HttpErrorResponse({
                  status: 503,
                  error: {
                    message:
                      'The demo connection was interrupted. Nothing was changed. Please try again.',
                  },
                }),
            )
          : from(db.request(req)),
      ),
      map(body => new HttpResponse({ status: req.method === 'POST' ? 201 : 200, body })),
    )
  })
}
