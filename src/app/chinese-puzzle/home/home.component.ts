import { Component, OnInit, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChinesePuzzleStore } from '../chinese-puzzle.store';
import { GameManagementService } from '../services/game-management.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  // 模态框显示状态
  showInstructions = false;
  showSettings = false;
  showProfile = false;

  private store = inject(ChinesePuzzleStore);
  private gameManagement = inject(GameManagementService);

  isDarkMode = this.store.isDarkMode;
  settings = this.store.settings;

  constructor(private router: Router) {
    effect(() => {
      if (this.isDarkMode()) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }

  async ngOnInit() {
    // 加载设置
    const settings = await this.gameManagement.getSettings();
    this.store.updateSettings(settings);
  }

  // 检查是否为开发模式
  isDevMode(): boolean {
    return !environment.production;
  }

  startGame() {
    // 默认开始第一个关卡
    this.router.navigate(['level-select']);
  }

  // 模态框控制方法
  openGameInstructions() {
    this.showInstructions = true;
  }

  closeInstructions() {
    this.showInstructions = false;
  }

  openSettings() {
    this.showSettings = true;
  }

  closeSettings() {
    this.showSettings = false;
  }

  openMyProfile() {
    this.showProfile = true;
  }

  closeProfile() {
    this.showProfile = false;
  }

  // 跳转到关卡生成器
  goToGenerator() {
    this.router.navigate(['/generator']);
  }

  // 设置功能方法
  async toggleDarkMode() {
    this.store.updateSetting('isDarkMode', !this.settings().isDarkMode);
    await this.saveSettings();
  }

  async toggleSoundEffects() {
    this.store.updateSetting('soundEffectsEnabled', !this.settings().soundEffectsEnabled);
    await this.saveSettings();
  }

  async toggleBackgroundMusic() {
    this.store.updateSetting('backgroundMusicEnabled', !this.settings().backgroundMusicEnabled);
    await this.saveSettings();
  }

  async toggleVibration() {
    this.store.updateSetting('vibrationEnabled', !this.settings().vibrationEnabled);
    await this.saveSettings();
  }

  async toggleSmoothDrag() {
    this.store.updateSetting('smoothDragMode', !this.settings().smoothDragMode);
    await this.saveSettings();
  }

  private async saveSettings() {
    const currentSettings = this.settings();
    await this.gameManagement.saveSettings(currentSettings);
  }
}