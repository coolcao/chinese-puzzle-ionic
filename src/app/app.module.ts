import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { Drivers } from '@ionic/storage';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { GameStorageService } from './chinese-puzzle/services/game-storage.service';

export function initializeStorage(storageService: GameStorageService) {
  return () => storageService.init();
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot({
      name: 'chinese_puzzle_db',
      driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage]
    }),
    AppRoutingModule,
    CommonModule,
    BrowserAnimationsModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeStorage,
      deps: [GameStorageService],
      multi: true
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
