import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { GameStorageService } from './game-storage.service';

export type SupportedLanguage = 'zh' | 'en';


@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguageSubject = new BehaviorSubject<string>('en');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor(
    private translate: TranslateService,
    private gameStorage: GameStorageService
  ) {
    this.initializeLanguage();
  }

  private getBrowserLanguage(): SupportedLanguage {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) {
      return 'zh';
    }
    return 'en';
  }

  private async initializeLanguage() {
    this.translate.addLangs(['zh', 'en']);

    // 从存储服务获取语言设置，默认为中文
    const savedLanguage = await this.gameStorage.get<string>('user_language') as SupportedLanguage;

    if (savedLanguage) {
      this.setLanguage(savedLanguage);
      return;
    }

    // 移动端默认英文
    if (Capacitor.isNativePlatform()) {
      this.setLanguage('en');
      return;
    }
    // web端根据浏览器语言设置
    const browserLanguage = this.getBrowserLanguage();
    this.setLanguage(browserLanguage);
  }

  async setLanguage(language: SupportedLanguage) {
    this.translate.use(language);
    this.currentLanguageSubject.next(language);
    await this.gameStorage.set('user_language', language);
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguageSubject.value as SupportedLanguage;
  }

  async toggleLanguage() {
    const currentLang = this.getCurrentLanguage();
    const newLang = currentLang === 'en' ? 'zh' : 'en';
    await this.setLanguage(newLang);
  }

  getAvailableLanguages() {
    return [
      { code: 'zh', name: '中文' },
      { code: 'en', name: 'English' }
    ];
  }
}
