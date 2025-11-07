import { Component, OnInit, computed, inject, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ChinesePuzzleStore } from '../../chinese-puzzle.store';
import { AudioService } from '../../services/audio.service';
import { GameStorageService } from '../../services/game-storage.service';
import { GameHistoryRecord, GameStats } from '../../chinese-puzzle.type';
import { levels } from '../../data/data-set';
import { LanguageService } from '../../services/language.service';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  private store = inject(ChinesePuzzleStore);
  private audioService = inject(AudioService);
  private gameStorage = inject(GameStorageService);
  private languageService = inject(LanguageService);

  @ViewChild(ConfirmModalComponent) confirmModal!: ConfirmModalComponent;

  // 信号状态管理
  isLoading = signal(true);
  gameStats = signal<GameStats | null>(null);
  gameHistory = signal<GameHistoryRecord[]>([]);
  showHistoryDetail = signal(false);
  selectedRecord = signal<GameHistoryRecord | null>(null);
  selectedRecordDate = computed(() => {
    const record = this.selectedRecord();
    return record ? new Date(record.completedAt || '') : null;
  });

  // 计算属性用于更安全的访问
  hasGameSteps = computed(() => {
    const record = this.selectedRecord();
    return record && record.gameSteps && record.gameSteps.length > 0;
  });

  gameStepsDisplay = computed(() => {
    const record = this.selectedRecord();
    return record?.gameSteps?.join(' → ') || '';
  });

  // 计算属性
  settings = this.store.settings;
  isDarkMode = computed(() => this.settings().isDarkMode);

  constructor(
    private router: Router,
    private translate: TranslateService,
  ) {}

  async ngOnInit() {
    await this.loadUserData();
  }

  // 返回首页
  goBack() {
    this.audioService.playClickSound();
    this.router.navigate(['']);
  }

  // 加载用户数据
  private async loadUserData() {
    try {
      this.isLoading.set(true);

      // 并行加载统计数据和历史记录
      const [stats, history] = await Promise.all([
        this.gameStorage.getStats(),
        this.gameStorage.getGameHistory(),
      ]);

      this.gameStats.set(stats);
      this.gameHistory.set(history);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // 刷新数据
  async refreshData() {
    this.audioService.playClickSound();
    await this.loadUserData();
  }

  // 显示历史记录详情
  showHistoryRecord(record: GameHistoryRecord) {
    this.audioService.playClickSound();
    this.selectedRecord.set(record);
    this.showHistoryDetail.set(true);
  }

  // 关闭历史记录详情
  closeHistoryDetail() {
    this.audioService.playClickSound();
    this.showHistoryDetail.set(false);
    this.selectedRecord.set(null);
  }

  // 回放历史记录
  replay(recordId: string) {
    this.audioService.playClickSound();
    this.router.navigate(['/replay', recordId], { replaceUrl: true });
  }

  // 显示清除历史记录确认框
  showClearHistoryConfirm() {
    this.audioService.playClickSound();
    this.confirmModal.show({
      title: this.translate.instant('myProfile.confirmClearHistoryTitle'),
      message: this.translate.instant('myProfile.confirmClearHistory'),
      warning: this.translate.instant('myProfile.clearHistoryWarning'),
      confirmText: this.translate.instant('myProfile.clearHistory'),
      cancelText: this.translate.instant('common.cancel'),
      type: 'danger'
    });
  }

  // 清除历史记录
  async clearHistory() {
    this.audioService.playClickSound();
    try {
      await this.gameStorage.clearGameHistory();
      await this.loadUserData(); // 重新加载数据
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  // 格式化时间
  formatTime(seconds: number): string {
    if (seconds < 60) {
      return `00:${seconds.toString().padStart(2, '0')}`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  // 格式化日期
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return this.translate.instant('myProfile.today');
    } else if (diffDays === 1) {
      return this.translate.instant('myProfile.yesterday');
    } else if (diffDays < 7) {
      return `${diffDays}${this.translate.instant('myProfile.daysAgo')}`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // 获取难度显示文本
  getDifficultyText(difficulty: string): string {
    const difficultyMap: { [key: string]: string } = {
      beginner: this.translate.instant('myProfile.difficultyBeginner'),
      easy: this.translate.instant('myProfile.difficultyEasy'),
      medium: this.translate.instant('myProfile.difficultyMedium'),
      hard: this.translate.instant('myProfile.difficultyHard'),
    };
    return difficultyMap[difficulty] || difficulty;
  }

  // 获取评级颜色
  getRatingColor(rating: string): string {
    if (rating.includes('完美') || rating.includes('Perfect')) {
      // 完美通关：金黄色，增强对比度
      return 'text-yellow-600 dark:text-yellow-400 font-semibold';
    } else if (rating.includes('优秀') || rating.includes('Excellent')) {
      // 优秀：深蓝色，增强对比度
      return 'text-blue-600 dark:text-blue-400 font-medium';
    } else if (rating.includes('不错') || rating.includes('Good')) {
      // 不错：绿色，增强对比度
      return 'text-green-600 dark:text-green-400';
    } else {
      // 继续努力：灰色，增强对比度
      return 'text-gray-600 dark:text-gray-400';
    }
  }

  // 获取连续天数显示文本
  getStreakText(streak: number): string {
    if (streak === 0) {
      return this.translate.instant('myProfile.noStreak');
    } else if (streak === 1) {
      return this.translate.instant('myProfile.oneDayStreak');
    } else {
      return `${streak}${this.translate.instant('myProfile.daysStreak')}`;
    }
  }

  // 获取本地化的关卡名称
  getLevelName(record: GameHistoryRecord): string {
    const currentLang = this.translate.currentLang || 'zh';
    const level = levels.find((l) => l.id === record.levelId);

    if (currentLang === 'en' && level?.nameEn) {
      return level.nameEn;
    }
    return record.levelName || record.levelId;
  }

  // 获取本地化的评价文本
  getLocalizedRating(rating: string): string {
    const currentLang = this.translate.currentLang || 'zh';

    // 如果评价包含中英文分隔符
    if (rating.includes('|')) {
      const [zhText, enText] = rating.split('|');
      return currentLang === 'en' ? enText.trim() : zhText.trim();
    }

    // 如果是旧格式，直接返回
    return rating;
  }

  // 切换语言
  async toggleLanguage() {
    this.audioService.playClickSound();
    await this.languageService.toggleLanguage();
  }

  // 获取当前语言
  getCurrentLanguage() {
    return this.languageService.getCurrentLanguage();
  }
}
