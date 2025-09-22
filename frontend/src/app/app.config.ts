import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { routes } from './app.routes';  // Importa las rutas desde app.routes.ts

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),      
    provideZonelessChangeDetection(),          
    provideRouter(routes),                     // Usa las rutas unificadas
    importProvidersFrom(HttpClientModule)      
  ]
};
