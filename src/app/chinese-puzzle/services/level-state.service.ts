import { Injectable, inject } from '@angular/core';
import { GameStorageService } from './game-storage.service';
import { LevelService } from './level.service';
import { LevelStore } from '../level.store';
import { levels } from '../data/data-set';

/**
 * 关卡状态协调服务
 * 负责在Storage和Store之间同步关卡解锁状态
 */
@Injectable({
  providedIn: 'root'
})
export class LevelStateService {
  private gameStorage = inject(GameStorageService);
  private levelService = inject(LevelService);
  private levelStore = inject(LevelStore);

  /**
   * 初始化关卡状态（应用启动时调用）
   */
  async initializeLevelState(): Promise<void> {
    try {
      // 从Storage加载已解锁的关卡
      const unlockedLevels = await this.gameStorage.get<string[]>('unlocked_levels');
      
      if (unlockedLevels && unlockedLevels.length > 0) {
        // 有存储数据，同步到Store
        this.levelService.setUnlockedLevels(unlockedLevels);
        console.log('🔓 已从存储加载关卡解锁状态:', unlockedLevels);
      } else {
        // 没有存储数据，初始化默认状态
        const initialUnlocked = this.levelService.initializeUnlockStatus();
        await this.gameStorage.unlockLevelsSafely(initialUnlocked);
        console.log('🆕 安全初始化关卡解锁状态:', initialUnlocked);
      }
      
      // 加载所有关卡进度到Store
      await this.loadAllLevelProgress();
      
    } catch (error) {
      console.error('❌ 初始化关卡状态失败:', error);
      // 出错时使用默认状态
      const initialUnlocked = this.levelService.initializeUnlockStatus();
      await this.gameStorage.unlockLevelsSafely(initialUnlocked);
    }
  }

  /**
   * 解锁关卡（同步到Storage和Store）
   */
  async unlockLevel(levelId: string): Promise<void> {
    try {
      // 使用原子性解锁到Storage
      await this.gameStorage.unlockLevelSafely(levelId);
      
      // 更新Store
      this.levelService.unlockLevel(levelId);
      
      console.log('🔓 安全解锁关卡:', levelId);
    } catch (error) {
      console.error('❌ 解锁关卡失败:', error);
      throw error;
    }
  }

  /**
   * 完成关卡后解锁下一关
   */
  async completeLevel(levelId: string): Promise<string | null> {
    try {
      // 同步关卡进度到Store
      await this.syncLevelProgressToStore(levelId);
      
      const nextLevelId = this.levelService.tryUnlockNextLevel(levelId);
      
      if (nextLevelId) {
        // 使用原子性解锁到Storage
        await this.gameStorage.unlockLevelSafely(nextLevelId);
        
        console.log(`🎉 完成关卡 "${levelId}"，已解锁下一关: "${nextLevelId}"`);
        return nextLevelId;
      } else {
        console.log(`🏆 恭喜！你已完成关卡 "${levelId}"，这是最后一关！`);
        return null;
      }
    } catch (error) {
      console.error('❌ 完成关卡处理失败:', error);
      throw error;
    }
  }

  /**
   * 重置所有关卡解锁状态
   */
  async resetLevelState(): Promise<void> {
    try {
      // 重置Store
      const initialUnlocked = this.levelService.resetUnlockStatus();
      
      // 清空Storage，然后重新初始化
      await this.gameStorage.remove('unlocked_levels');
      await this.gameStorage.unlockLevelsSafely(initialUnlocked);
      
      console.log('🔒 关卡解锁状态已安全重置，仅保留第一关:', initialUnlocked);
    } catch (error) {
      console.error('❌ 重置关卡状态失败:', error);
      throw error;
    }
  }

  /**
   * 检查关卡是否已解锁
   */
  isLevelUnlocked(levelId: string): boolean {
    return this.levelService.isLevelUnlocked(levelId);
  }

  /**
   * 获取已解锁的关卡列表
   */
  getUnlockedLevels(): string[] {
    return this.levelService.getUnlockedLevels();
  }

  /**
   * 获取关卡统计信息
   */
  getLevelStats() {
    return this.levelService.getLevelStats();
  }

  /**
   * 手动同步Storage到Store（修复数据不一致时使用）
   */
  async syncStorageToStore(): Promise<void> {
    try {
      const unlockedLevels = await this.gameStorage.get<string[]>('unlocked_levels') || [];
      this.levelService.setUnlockedLevels(unlockedLevels);
      console.log('🔄 已同步Storage到Store:', unlockedLevels);
    } catch (error) {
      console.error('❌ 同步Storage到Store失败:', error);
      throw error;
    }
  }

  /**
   * 手动同步Store到Storage（修复数据不一致时使用）
   */
  async syncStoreToStorage(): Promise<void> {
    try {
      const unlockedLevels = this.levelService.getUnlockedLevels();
      await this.gameStorage.unlockLevelsSafely(unlockedLevels);
      console.log('🔄 已安全同步Store到Storage:', unlockedLevels);
    } catch (error) {
      console.error('❌ 同步Store到Storage失败:', error);
      throw error;
    }
  }

  // 私有方法：同步相关

  /**
   * 加载所有关卡进度到Store
   */
  private async loadAllLevelProgress(): Promise<void> {
    try {
      const progressMap = new Map();
      const allLevels = levels;
      
      for (const level of allLevels) {
        const progress = await this.gameStorage.getProgress(level.id);
        if (progress) {
          progressMap.set(level.id, progress);
        }
      }
      
      this.levelStore.setLevelProgressBatch(progressMap);
      console.log(`📊 已加载 ${progressMap.size} 个关卡进度到Store`);
    } catch (error) {
      console.error('❌ 加载关卡进度失败:', error);
    }
  }

  /**
   * 同步单个关卡进度到Store
   */
  private async syncLevelProgressToStore(levelId: string): Promise<void> {
    try {
      const progress = await this.gameStorage.getProgress(levelId);
      if (progress) {
        this.levelStore.setLevelProgress(levelId, progress);
        console.log(`🔄 已同步关卡 "${levelId}" 进度到Store`);
      }
    } catch (error) {
      console.error(`❌ 同步关卡 "${levelId}" 进度失败:`, error);
    }
  }
}