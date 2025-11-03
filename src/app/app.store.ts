import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class AppStore {
  private _platform = signal<'web' | 'android' | 'ios'>('web');
  private _language = signal<'zh' | 'en'>('zh');

  readonly platform = this._platform.asReadonly();
  readonly language = this._language.asReadonly();

  setLanguage(language: 'zh' | 'en') {
    this._language.set(language);
  }

  setPlatform(platform: 'web' | 'android' | 'ios') {
    this._platform.set(platform);
  }
}
