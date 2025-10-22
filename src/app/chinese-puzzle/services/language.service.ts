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

    try {
      // 从存储服务获取语言设置
      const savedLanguage = await this.gameStorage.get<string>('user_language') as SupportedLanguage;

      if (savedLanguage && (savedLanguage === 'zh' || savedLanguage === 'en')) {
        // 有有效的存储语言设置，立即应用它
        this.translate.use(savedLanguage);
        this.currentLanguageSubject.next(savedLanguage);
        return;
      }

      // 没有存储的语言设置，使用默认逻辑
      let defaultLanguage: SupportedLanguage;

      if (Capacitor.isNativePlatform()) {
        // 移动端默认英文
        defaultLanguage = 'en';
      } else {
        // web端根据浏览器语言设置
        defaultLanguage = this.getBrowserLanguage();
      }

      // 应用默认语言并保存到存储
      this.translate.use(defaultLanguage);
      this.currentLanguageSubject.next(defaultLanguage);
      await this.gameStorage.set('user_language', defaultLanguage);
    } catch (error) {
      console.error('Failed to initialize language:', error);
      // 发生错误时使用英文作为默认语言
      this.translate.use('en');
      this.currentLanguageSubject.next('en');
    }
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
