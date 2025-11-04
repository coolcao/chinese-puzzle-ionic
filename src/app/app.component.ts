import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { App, BackButtonListenerEvent } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ChinesePuzzleStore } from 'src/app/chinese-puzzle/chinese-puzzle.store';
import { GameManagementService } from 'src/app/chinese-puzzle/services/game-management.service';
import { AudioService } from 'src/app/chinese-puzzle/services/audio.service';
import { AppStore } from './app.store';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.css'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private readonly appStore = inject(AppStore);
  private readonly gameManagement = inject(GameManagementService);
  private readonly store = inject(ChinesePuzzleStore);
  private readonly audioService = inject(AudioService);
  private readonly location = inject(Location);

  showExit = signal(false);

  constructor() {
    this.setupEffects();
  }

  async ngOnInit(): Promise<void> {
    const platform = this.getPlatform();
    this.appStore.setPlatform(platform);

    await this.gameManagement.loadSettings();

    // 初始化背景音乐
    this.audioService.updateBackgroundMusicStatus();

    if (platform !== 'web') {
      this.lockPortrait();
      this.initializeApp();
      this.setupBackEvent();
    }
  }
  exitGame() {
    if (Capacitor.getPlatform() === 'android') {
      (App as any).exitApp(); // 强制退出（Android）
    } else {
      App.minimizeApp(); // iOS 最小化
    }
    this.showExit.set(false);
  }


  private initializeApp() {
    StatusBar.setOverlaysWebView({ overlay: false }); // 关键设置
    this.updateStatusBarColor(this.store.settings().isDarkMode)
  }
  // 锁定为竖屏
  async lockPortrait() {
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) {
      console.error('Failed to lock orientation:', e);
    }
  }

  updateStatusBarColor(darkMode: boolean) {
    if (this.appStore.platform() == 'web') {
      return;
    }
    const backgroundColor = darkMode ? '#483D2D' : '#E1D0AF';
    const style = darkMode ? Style.Dark : Style.Light;
    StatusBar.setBackgroundColor({ color: backgroundColor });
    StatusBar.setStyle({ style });
  }
  private setupBackEvent() {
    App.addListener('backButton', async (event: BackButtonListenerEvent) => {
      if (event.canGoBack) {
        this.goBack();
      } else {
        this.showExit.set(true);
      }

    })
  }

  goBack() {
    this.location.back();
  }

  private getPlatform() {
    // 使用 Capacitor 的 Platforms 来判断当前运行平台
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        return 'android';
      } else if (Capacitor.getPlatform() === 'ios') {
        return 'ios';
      }
    }
    return 'web';
  }
  private setupEffects() {
    // 监听settings变化
    effect(() => {
      const settings = this.store.settings();
      // 根据settings.isDarkMode设置dark类
      if (settings.isDarkMode) {
        this.updateStatusBarColor(true);
        document.documentElement.classList.add('dark');
      } else {
        this.updateStatusBarColor(false);
        document.documentElement.classList.remove('dark');
      }
      
      // 监听背景音乐设置变化
      this.audioService.updateBackgroundMusicStatus();
    });
  }
}
