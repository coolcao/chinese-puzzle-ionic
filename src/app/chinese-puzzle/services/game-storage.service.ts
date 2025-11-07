import { Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { GameHistoryRecord, GameProgress, GameStats, UserSettings, GameStep } from '../chinese-puzzle.type';
import { levels } from '../data/data-set';


@Injectable({
  providedIn: 'root'
})
export class GameStorageService {
  private _storage: Storage | null = null;
  private initialized = false;

  constructor(private storage: Storage) {
    // 不在构造函数中自动初始化，使用APP_INITIALIZER
  }

  async init() {
    try {
      // 创建存储实例，自动选择最佳存储引擎
      const storage = await this.storage.create();
      this._storage = storage;
      this.initialized = true;
      console.log('Storage initialized successfully');
    } catch (error) {
      console.error('Storage initialization failed:', error);
      // 注意：即使初始化失败，我们仍然标记为已初始化以防止无限重试
      this.initialized = true;
    }
  }

  private async ensureStorage() {
    // 等待初始化完成
    while (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (!this._storage) {
      console.error('Storage is not available');
      throw new Error('Storage is not available');
    }
    return this._storage;
  }

  // ========== 基础存储操作 ==========

  async set(key: string, value: any): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.set(key, value);
  }

  async get<T>(key: string): Promise<T | null> {
    const storage = await this.ensureStorage();
    return await storage.get(key);
  }

  async remove(key: string): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.remove(key);
  }

  async clear(): Promise<void> {
    const storage = await this.ensureStorage();
    await storage.clear();
  }

  async keys(): Promise<string[]> {
    const storage = await this.ensureStorage();
    return await storage.keys();
  }

  // ========== 游戏进度管理 ==========

  async saveProgress(levelId: string, steps: number, time: number): Promise<void> {
    const existing = await this.getProgress(levelId);
    const progress: GameProgress = {
      levelId,
      isCompleted: true,
      bestSteps: existing ? Math.min(existing.bestSteps, steps) : steps,
      bestTime: existing ? Math.min(existing.bestTime, time) : time,
      completedAt: new Date().toISOString(),
      attempts: existing ? existing.attempts + 1 : 1,
      stars: this.calculateStars(levelId, steps)
    };

    await this.set(`progress_${levelId}`, progress);
  }

  async getProgress(levelId: string): Promise<GameProgress | null> {
    return await this.get<GameProgress>(`progress_${levelId}`);
  }

  async getAllProgress(): Promise<GameProgress[]> {
    const keys = await this.keys();
    const progressKeys = keys.filter(key => key.startsWith('progress_'));
    const progresses: GameProgress[] = [];

    for (const key of progressKeys) {
      const progress = await this.get<GameProgress>(key);
      if (progress) progresses.push(progress);
    }

    return progresses.sort((a, b) => a.levelId.localeCompare(b.levelId));
  }

  // ========== 用户设置管理 ==========

  async saveSettings(settings: UserSettings): Promise<void> {
    await this.set('user_settings', settings);
  }

  async getSettings(): Promise<UserSettings> {
    const settings = await this.get<UserSettings>('user_settings');
    return settings || this.getDefaultSettings();
  }

  async updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;
    await this.saveSettings(settings);
  }

  // ========== 游戏历史记录管理 ==========

  async saveGameHistory(levelId: string, steps: number, time: number, gameSteps: GameStep[]): Promise<void> {
    const timestamp = Date.now();
    const id = `${levelId}_${timestamp}`; // 使用关卡ID+时间戳生成唯一ID
    
    // 获取关卡数据以获取正确的难度和名称
    const level = levels.find(l => l.id === levelId);
    
    const historyRecord: GameHistoryRecord = {
      id,
      levelId,
      levelName: level?.name || level?.nameEn || levelId, // 使用关卡的实际名称
      difficulty: level?.difficulty || 'medium', // 使用关卡的实际难度
      steps,
      time,
      completedAt: new Date().toISOString(),
      rating: this.calculateRating(steps, levelId), // 基于关卡数据计算评分
      gameSteps, // 详细操作步骤
    };

    // 保存历史记录
    const historyKey = `history_${id}`;
    await this.set(historyKey, historyRecord);

    // 同时更新游戏进度
    await this.saveProgress(levelId, steps, time);
  }

  async getGameHistory(): Promise<GameHistoryRecord[]> {
    const keys = await this.keys();
    const historyKeys = keys.filter(key => key.startsWith('history_'));
    const historyRecords: GameHistoryRecord[] = [];

    for (const key of historyKeys) {
      const record = await this.get<GameHistoryRecord>(key);
      if (record) historyRecords.push(record);
    }

    return historyRecords.sort((a, b) => b.completedAt.localeCompare(a.completedAt)); // 按完成时间倒序
  }

  async getGameHistoryByLevel(levelId: string): Promise<GameHistoryRecord[]> {
    const allHistory = await this.getGameHistory();
    return allHistory.filter(record => record.levelId === levelId);
  }

  async clearGameHistory(): Promise<void> {
    const keys = await this.keys();
    const historyKeys = keys.filter(key => key.startsWith('history_'));

    for (const key of historyKeys) {
      await this.remove(key);
    }
  }

  // ========== 游戏统计管理 ==========

  async getStats(): Promise<GameStats> {
    // 从历史记录计算统计数据
    return await this.calculateStatsFromHistory();
  }

  private async calculateStatsFromHistory(): Promise<GameStats> {
    const historyRecords = await this.getGameHistory();

    if (historyRecords.length === 0) {
      return this.getDefaultStats();
    }

    // 计算统计数据
    const totalPlayTime = historyRecords.reduce((sum, record) => sum + record.time, 0);
    const totalSteps = historyRecords.reduce((sum, record) => sum + record.steps, 0);
    const totalGames = historyRecords.length;
    const levelsCompleted = new Set(historyRecords.map(record => record.levelId)).size;
    const perfectCompletions = historyRecords.filter(record =>
      record.rating.includes('完美') || record.rating.includes('Perfect')
    ).length;

    // 计算连续完成天数
    const streakInfo = this.calculateStreakInfo(historyRecords);

    const sortedRecords = historyRecords.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    const firstPlayDate = sortedRecords[0].completedAt;
    const lastPlayDate = sortedRecords[sortedRecords.length - 1].completedAt;

    return {
      calculatedAt: new Date().toISOString(),
      totalPlayTime,
      totalSteps,
      totalGames,
      levelsCompleted,
      perfectCompletions,
      firstPlayDate,
      lastPlayDate,
      currentStreak: streakInfo.currentStreak,
      maxStreak: streakInfo.maxStreak
    };
  }

  private calculateStreakInfo(historyRecords: GameHistoryRecord[]): { currentStreak: number; maxStreak: number } {
    if (historyRecords.length === 0) {
      return { currentStreak: 0, maxStreak: 0 };
    }

    // 提取完成日期（仅日期部分，不包含时间）
    const completionDates = historyRecords
      .map(record => new Date(record.completedAt).toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index) // 去重
      .sort();

    let currentStreak = 0;
    let maxStreak = 0;

    if (completionDates.length > 0) {
      // 计算当前连续天数
      const today = new Date();
      const todayStr = today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      let currentDate = new Date();
      let daysBack = 0;

      // 从今天开始往前检查连续天数
      while (daysBack <= 30) { // 限制计算范围
        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() - daysBack);
        const checkDateStr = checkDate.toDateString();

        if (completionDates.includes(checkDateStr)) {
          currentStreak++;
          daysBack++;
        } else if (daysBack === 0) {
          // 如果今天没有游戏，则检查昨天
          if (completionDates.includes(yesterdayStr)) {
            currentStreak = 1;
            daysBack = 1;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // 计算最大连续天数
      maxStreak = currentStreak;
      let tempStreak = 0;
      let prevDate: Date | null = null;

      for (const dateStr of completionDates) {
        const currentDate = new Date(dateStr);

        if (prevDate) {
          const diffTime = currentDate.getTime() - prevDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            tempStreak++;
          } else if (diffDays > 1) {
            maxStreak = Math.max(maxStreak, tempStreak);
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }

        prevDate = currentDate;
      }

      maxStreak = Math.max(maxStreak, tempStreak);
    }

    return { currentStreak, maxStreak };
  }

  // ========== 工具方法 ==========

  private calculateRating(steps: number, levelId?: string): string {
    // 基于星级评分系统的评价，星级数量与progress中的stars保持一致
    if (levelId) {
      const stars = this.calculateStars(levelId, steps);
      const starsDisplay = '⭐'.repeat(stars);
      
      if (stars === 3) {
        return `完美通关！${starsDisplay}|Perfect! ${starsDisplay}`;
      } else if (stars === 2) {
        return `表现优秀！${starsDisplay}|Excellent! ${starsDisplay}`;
      } else {
        return `继续努力！${starsDisplay}|Keep Trying! ${starsDisplay}`;
      }
    }
    return '继续努力！⭐|Keep Trying! ⭐';
  }

  private calculateStars(levelId: string, steps: number): number {
    // 获取关卡数据
    const level = levels.find(l => l.id === levelId);
    const optimalSteps = level?.minSteps || 50; // 如果找不到关卡数据，使用默认值
    
    // 计算步数与最优步数的比率
    const efficiency = steps / optimalSteps;
    
    // 基于效率比率确定星级（1-3星系统，用于关卡选择页面）
    if (efficiency <= 1.1) {
      return 3; // 110%以内 - 3星
    } else if (efficiency <= 1.5) {
      return 2; // 150%以内 - 2星
    } else {
      return 1; // 超过150% - 1星
    }
  }

  private getDefaultSettings(): UserSettings {
    return {
      isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      smoothDragMode: true,
      soundEffectsEnabled: true,
      backgroundMusicEnabled: true, // 默认开启背景音乐
      vibrationEnabled: true,
      tutorialCompleted: false
    };
  }

  // ========== 教程状态管理 ==========

  async markTutorialCompleted(): Promise<void> {
    await this.updateSetting('tutorialCompleted', true);
  }

  async isTutorialCompleted(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.tutorialCompleted;
  }

  async resetTutorial(): Promise<void> {
    await this.updateSetting('tutorialCompleted', false);
  }


  private getDefaultStats(): GameStats {
    const now = new Date().toISOString();
    return {
      calculatedAt: now,
      totalPlayTime: 0,
      totalSteps: 0,
      totalGames: 0,
      levelsCompleted: 0,
      perfectCompletions: 0,
      firstPlayDate: now,
      lastPlayDate: now,
      currentStreak: 0,
      maxStreak: 0
    };
  }

  // ========== 数据管理 ==========

  async exportData(): Promise<string> {
    const allKeys = await this.keys();
    const data: { [key: string]: any } = {};

    for (const key of allKeys) {
      data[key] = await this.get(key);
    }

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);

      for (const [key, value] of Object.entries(data)) {
        await this.set(key, value);
      }
    } catch (error) {
      throw new Error('导入数据格式错误');
    }
  }

  async resetAllData(): Promise<void> {
    await this.clear();
  }

  // 原子性解锁方法
  
  /**
   * 原子性解锁单个关卡
   * 只添加新关卡，不覆盖已有数据
   */
  async unlockLevelSafely(levelId: string): Promise<void> {
    const storage = await this.ensureStorage();
    
    // 原子性操作：先读取，再验证，最后写入
    const existingUnlocked = (await storage.get('unlocked_levels') as string[]) || [];
    
    // 检查关卡ID是否已存在
    if (!existingUnlocked.includes(levelId)) {
      const newUnlocked = [...existingUnlocked, levelId];
      await storage.set('unlocked_levels', newUnlocked);
      console.log(`🔓 原子性解锁关卡: ${levelId}, 总解锁数: ${newUnlocked.length}`);
    } else {
      console.log(`ℹ️ 关卡 ${levelId} 已经解锁，跳过`);
    }
  }

  /**
   * 批量解锁关卡，安全去重
   * 只添加新关卡，不覆盖已有数据
   */
  async unlockLevelsSafely(levelIds: string[]): Promise<void> {
    const storage = await this.ensureStorage();
    
    // 原子性操作：先读取现有数据
    const existingUnlocked = (await storage.get('unlocked_levels') as string[]) || [];
    
    // 过滤出真正需要添加的新关卡
    const newLevelsToUnlock = levelIds.filter(id => !existingUnlocked.includes(id));
    
    if (newLevelsToUnlock.length > 0) {
      // 合并并去重
      const updatedUnlocked = [...existingUnlocked, ...newLevelsToUnlock];
      await storage.set('unlocked_levels', updatedUnlocked);
      console.log(`🔓 批量解锁关卡: [${newLevelsToUnlock.join(', ')}], 总解锁数: ${updatedUnlocked.length}`);
    } else {
      console.log(`ℹ️ 所有关卡都已解锁，跳过批量解锁操作`);
    }
  }
}