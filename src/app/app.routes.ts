import { Routes } from '@angular/router'
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    title: 'Agency Overview · Haven',
    loadComponent: () => import('./features/overview/overview').then(m => m.Overview),
  },
  {
    path: 'properties',
    title: 'Property Collection · Haven',
    loadComponent: () => import('./features/properties/properties').then(m => m.Properties),
  },
  {
    path: 'properties/:id',
    title: 'Property Workspace · Haven',
    loadComponent: () =>
      import('./features/properties/property-detail').then(m => m.PropertyDetail),
  },
  {
    path: 'buyers',
    title: 'Buyer Desk · Haven',
    loadComponent: () => import('./features/buyers/buyers').then(m => m.Buyers),
  },
  {
    path: 'buyers/:id',
    title: 'Buyer Workspace · Haven',
    loadComponent: () => import('./features/buyers/buyer-detail').then(m => m.BuyerDetail),
  },
  {
    path: 'viewings',
    title: 'Viewing Calendar · Haven',
    loadComponent: () => import('./features/viewings/viewings').then(m => m.Viewings),
  },
  {
    path: 'offers',
    title: 'Offers & Deals · Haven',
    loadComponent: () => import('./features/offers/offers').then(m => m.Offers),
  },
  {
    path: 'activity',
    title: 'Agency Activity · Haven',
    loadComponent: () => import('./features/activity/activity').then(m => m.ActivityPage),
  },
  {
    path: 'settings',
    title: 'Workspace Settings · Haven',
    loadComponent: () => import('./features/settings/settings').then(m => m.Settings),
  },
  { path: '**', redirectTo: 'overview' },
]
