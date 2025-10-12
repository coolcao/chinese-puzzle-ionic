import { Injectable, effect, inject } from '@angular/core';
import { ChinesePuzzleStore } from '../chinese-puzzle.store';
import { GameStorageService } from './game-storage.service';
import { UserSettings } from '../chinese-puzzle.type';

@Injectable({
  providedIn: 'root'
})
export class GameManagementService {
  private store = inject(ChinesePuzzleStore);
  private storage = inject(GameStorageService);

  constructor() {
    // 监听游戏状态变化，自动保存
    this.setupAutoSave();
    // 初始化加载数据
    this.initializeGame();
  }

  // ========== 初始化和自动保存 ==========

  private async initializeGame() {
    try {
      await this.loadUserSettings();
    } catch (error) {
      console.error('初始化游戏失败:', error);
    }
  }

  private setupAutoSave() {
    // 监听设置变化
    effect(() => {
      const settings = this.store.settings();
      if (settings) {
        this.saveUserSettings();
      }
    });

    // 监听关卡变化
    effect(() => {
      if (this.store.dataSetName()) {
        this.saveUserSettings();
      }
    });
  }

  // ========== 用户设置管理 ==========

  private async loadUserSettings() {
    try {
      const settings = await this.storage.getSettings();

      // 更新Store状态
      this.store.updateSettings(settings);

      // 如果有游戏历史，尝试恢复到最近玩过的关卡
      const gameHistory = await this.storage.getGameHistory();
      if (gameHistory.length > 0) {
        // 获取最近一次游戏的关卡
        const latestGame = gameHistory[0]; // 按时间倒序排列
        if (latestGame) {
          this.store.changeDataSet(latestGame.levelId);
        }
      } else {
        // 如果没有游戏历史，使用默认关卡
        this.store.changeDataSet('横刀立马');
      }
    } catch (error) {
      console.error('加载用户设置失败:', error);
    }
  }

  private async saveUserSettings() {
    try {
      const settings = this.store.settings();
      await this.storage.saveSettings(settings);
    } catch (error) {
      console.error('保存用户设置失败:', error);
    }
  }

  async getSettings(): Promise<UserSettings> {
    try {
      return await this.storage.getSettings();
    } catch (error) {
      console.error('获取用户设置失败:', error);
      // 返回默认设置
      return {
        isDarkMode: false,
        smoothDragMode: true,
        soundEffectsEnabled: true,
        backgroundMusicEnabled: false,
        vibrationEnabled: true
      };
    }
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await this.storage.saveSettings(settings);
      // 同时更新Store状态（如果需要的话）
      if (settings.isDarkMode !== undefined) {
        this.store.setDarkMode(settings.isDarkMode);
      }
    } catch (error) {
      console.error('保存用户设置失败:', error);
    }
  }

  // ========== 游戏进度管理 ==========

  async saveGameProgress(steps: number, time: number) {
    try {
      const levelId = this.store.dataSetName();
      // 保存游戏历史记录（替代直接更新统计）
      await this.storage.saveGameHistory(levelId, steps, time);
      console.log(`关卡 ${levelId} 历史记录已保存: ${steps}步, ${time}秒`);
      return true;
    } catch (error) {
      console.error('保存游戏进度失败:', error);
      return false;
    }
  }

  async getGameProgress(levelId?: string) {
    try {
      const targetLevel = levelId || this.store.dataSetName();
      return await this.storage.getProgress(targetLevel);
    } catch (error) {
      console.error('获取游戏进度失败:', error);
      return null;
    }
  }

  async getAllProgress() {
    try {
      return await this.storage.getAllProgress();
    } catch (error) {
      console.error('获取所有进度失败:', error);
      return [];
    }
  }

  // ========== 游戏历史记录管理 ==========

  async getGameHistory() {
    try {
      return await this.storage.getGameHistory();
    } catch (error) {
      console.error('获取游戏历史记录失败:', error);
      return [];
    }
  }

  async getGameHistoryByLevel(levelId: string) {
    try {
      return await this.storage.getGameHistoryByLevel(levelId);
    } catch (error) {
      console.error('获取关卡历史记录失败:', error);
      return [];
    }
  }

  async clearGameHistory() {
    try {
      return await this.storage.clearGameHistory();
    } catch (error) {
      console.error('清除游戏历史记录失败:', error);
      return false;
    }
  }

  // ========== 游戏统计管理 ==========

  async getGameStats() {
    try {
      return await this.storage.getStats();
    } catch (error) {
      console.error('获取游戏统计失败:', error);
      return null;
    }
  }

  // ========== 游戏操作方法 ==========

  // 切换暗色模式
  toggleDarkMode() {
    this.store.updateSetting('isDarkMode', !this.store.settings().isDarkMode);
    // 自动保存由effect处理
  }

  // 切换关卡
  changeLevel(levelId: string) {
    this.store.changeDataSet(levelId);
    // 自动保存由effect处理
  }

  // 重置游戏
  resetGame() {
    this.store.changeDataSet(this.store.dataSetName());
  }

  // ========== 数据管理方法 ==========

  async exportGameData(): Promise<string> {
    try {
      return await this.storage.exportData();
    } catch (error) {
      console.error('导出数据失败:', error);
      throw error;
    }
  }

  async importGameData(jsonData: string): Promise<boolean> {
    try {
      await this.storage.importData(jsonData);
      // 重新加载设置
      await this.loadUserSettings();
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }

  async resetAllData(): Promise<boolean> {
    try {
      await this.storage.resetAllData();
      // 重置Store到默认状态
      this.store.setDarkMode(false);
      this.store.changeDataSet(this.store.dataSetNames()[0]);
      return true;
    } catch (error) {
      console.error('重置数据失败:', error);
      return false;
    }
  }
}