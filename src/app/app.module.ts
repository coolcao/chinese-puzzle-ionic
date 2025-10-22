import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { Drivers } from '@ionic/storage';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';

import { TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { GameStorageService } from './chinese-puzzle/services/game-storage.service';
import { LanguageService } from './chinese-puzzle/services/language.service';

export function initializeStorage(storageService: GameStorageService) {
  return () => storageService.init();
}

export function initializeLanguage(languageService: LanguageService, storageService: GameStorageService) {
  return async () => {
    // 确保存储已初始化，然后初始化语言设置
    await storageService.init();
    // 语言服务会在构造函数中自动初始化，这里只是确保执行顺序
    return Promise.resolve();
  };
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
    TranslateModule.forRoot({
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json'
      }),
    }),
    AppRoutingModule,
    CommonModule,
    BrowserAnimationsModule
  ],
  providers: [
    provideHttpClient(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeStorage,
      deps: [GameStorageService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeLanguage,
      deps: [LanguageService, GameStorageService],
      multi: true
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
