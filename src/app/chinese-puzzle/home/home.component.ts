import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChinesePuzzleStore } from '../chinese-puzzle.store';
import { GameManagementService } from '../services/game-management.service';
import { AudioService } from '../services/audio.service';
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
  private audioService = inject(AudioService);

  settings = this.store.settings;
  isDarkMode = computed(() => this.settings().isDarkMode);

  constructor(private router: Router) {
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
    // 播放点击音效
    this.audioService.playClickSound();
    // 默认开始第一个关卡
    this.router.navigate(['levels']);
  }

  // 模态框控制方法
  openGameInstructions() {
    this.audioService.playClickSound();
    this.showInstructions = true;
  }

  closeInstructions() {
    this.audioService.playClickSound();
    this.showInstructions = false;
  }

  openSettings() {
    this.audioService.playClickSound();
    this.showSettings = true;
  }

  closeSettings() {
    this.audioService.playClickSound();
    this.showSettings = false;
  }

  openMyProfile() {
    this.audioService.playClickSound();
    this.showProfile = true;
  }

  closeProfile() {
    this.audioService.playClickSound();
    this.showProfile = false;
  }

  // 跳转到关卡生成器
  goToGenerator() {
    this.audioService.playClickSound();
    this.router.navigate(['/generator']);
  }

  // 设置功能方法
  async toggleDarkMode() {
    this.audioService.playClickSound();
    this.store.updateSetting('isDarkMode', !this.settings().isDarkMode);
    await this.saveSettings();
  }

  async toggleSoundEffects() {
    // 注意：先播放音效再切换设置，避免立即关闭音效
    this.audioService.playClickSound();
    this.store.updateSetting('soundEffectsEnabled', !this.settings().soundEffectsEnabled);
    await this.saveSettings();
  }

  async toggleBackgroundMusic() {
    this.audioService.playClickSound();
    this.store.updateSetting('backgroundMusicEnabled', !this.settings().backgroundMusicEnabled);
    await this.saveSettings();
  }

  async toggleVibration() {
    this.audioService.playClickSound();
    this.store.updateSetting('vibrationEnabled', !this.settings().vibrationEnabled);
    await this.saveSettings();
  }

  async toggleSmoothDrag() {
    this.audioService.playClickSound();
    this.store.updateSetting('smoothDragMode', !this.settings().smoothDragMode);
    await this.saveSettings();
  }

  private async saveSettings() {
    const currentSettings = this.settings();
    await this.gameManagement.saveSettings(currentSettings);
  }
}
