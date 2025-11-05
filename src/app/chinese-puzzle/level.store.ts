import { computed, inject, Injectable, signal } from "@angular/core";
import { levels } from "src/app/chinese-puzzle/data/data-set";
import { ToolsService } from "src/app/chinese-puzzle/services/tools.service";
import { GameProgress } from "./chinese-puzzle.type";

@Injectable({
  providedIn: 'root'
})
export class LevelStore {
  private tools = inject(ToolsService);

  private _allLevels = signal(levels);
  // 已解锁关卡状态
  private _unlockedLevels = signal<string[]>([]);
  // 关卡进度信息 (levelId -> GameProgress)
  private _levelProgress = signal<Map<string, GameProgress>>(new Map());

  readonly allLevels = this._allLevels.asReadonly();
  readonly easyLevels = computed(() => {
    return this._allLevels().filter(level => level.difficulty === 'easy').sort((a, b) => a.minSteps - b.minSteps);
  });
  readonly mediumLevels = computed(() => {
    return this._allLevels().filter(level => level.difficulty === 'medium').sort((a, b) => a.minSteps - b.minSteps);
  });
  readonly hardLevels = computed(() => {
    return this._allLevels().filter(level => level.difficulty === 'hard').sort((a, b) => a.minSteps - b.minSteps);
  });

  readonly unlockedLevels = this._unlockedLevels.asReadonly();
  readonly levelProgress = this._levelProgress.asReadonly();

  // 计算属性：已完成关卡列表
  readonly completedLevels = computed(() => {
    const progress = this._levelProgress();
    return Array.from(progress.entries())
      .filter(([_, prog]) => prog.isCompleted)
      .map(([levelId, _]) => levelId);
  });

  // 计算属性：带进度信息的关卡列表
  readonly levelsWithProgress = computed(() => {
    const progress = this._levelProgress();
    const unlocked = this._unlockedLevels();

    return this._allLevels().map(level => ({
      ...level,
      isUnlocked: unlocked.includes(level.id),
      progress: progress.get(level.id) || null,
      isCompleted: progress.get(level.id)?.isCompleted || false,
      stars: progress.get(level.id)?.stars || 0
    })).sort((a, b) => a.minSteps - b.minSteps);
  });

  // 计算属性：分组的带进度信息关卡
  readonly groupedLevelsWithProgress = computed(() => {
    const levelsWithProg = this.levelsWithProgress();
    return {
      easy: levelsWithProg.filter(level => level.difficulty === 'easy'),
      medium: levelsWithProg.filter(level => level.difficulty === 'medium'),
      hard: levelsWithProg.filter(level => level.difficulty === 'hard')
    };
  });

  // 计算属性：统计信息
  readonly statistics = computed(() => {
    const allLevels = this._allLevels();
    const unlocked = this._unlockedLevels();
    const completed = this.completedLevels();
    const progress = this._levelProgress();

    let totalStars = 0;
    let maxStars = 0;

    for (const level of allLevels) {
      const prog = progress.get(level.id);
      if (prog?.isCompleted) {
        totalStars += prog.stars;
      }
      maxStars += 3; // 每关最多3星
    }

    return {
      total: allLevels.length,
      unlocked: unlocked.length,
      completed: completed.length,
      locked: allLevels.length - unlocked.length,
      totalStars,
      maxStars,
      completionRate: Math.round((completed.length / allLevels.length) * 100)
    };
  });

  // 解锁关卡状态管理方法

  /**
   * 设置已解锁关卡列表
   */
  setUnlockedLevels(unlockedLevels: string[]) {
    this._unlockedLevels.set(this.tools.deepClone(unlockedLevels));
  }

  /**
   * 检查关卡是否已解锁
   */
  isLevelUnlocked(levelId: string): boolean {
    return this._unlockedLevels().includes(levelId);
  }

  /**
   * 解锁关卡
   */
  unlockLevel(levelId: string) {
    const currentUnlocked = this._unlockedLevels();
    if (!currentUnlocked.includes(levelId)) {
      this._unlockedLevels.set([...currentUnlocked, levelId]);
    }
  }

  /**
   * 获取已解锁关卡数量
   */
  getUnlockedCount(): number {
    return this._unlockedLevels().length;
  }

  // 关卡进度管理方法

  /**
   * 设置关卡进度
   */
  setLevelProgress(levelId: string, progress: GameProgress) {
    const currentProgress = new Map(this._levelProgress());
    currentProgress.set(levelId, this.tools.deepClone(progress));
    this._levelProgress.set(currentProgress);
  }

  /**
   * 批量设置关卡进度
   */
  setLevelProgressBatch(progressMap: Map<string, GameProgress>) {
    this._levelProgress.set(new Map(progressMap));
  }

  /**
   * 获取关卡进度
   */
  getLevelProgress(levelId: string): GameProgress | null {
    return this._levelProgress().get(levelId) || null;
  }

  /**
   * 检查关卡是否已完成
   */
  isLevelCompleted(levelId: string): boolean {
    return this.getLevelProgress(levelId)?.isCompleted || false;
  }

  /**
   * 获取关卡星级
   */
  getLevelStars(levelId: string): number {
    return this.getLevelProgress(levelId)?.stars || 0;
  }

  /**
   * 删除关卡进度
   */
  removeLevelProgress(levelId: string) {
    const currentProgress = new Map(this._levelProgress());
    currentProgress.delete(levelId);
    this._levelProgress.set(currentProgress);
  }

  /**
   * 清空所有关卡进度
   */
  clearAllProgress() {
    this._levelProgress.set(new Map());
  }

  /**
   * 获取关卡状态显示字符串
   */
  getLevelStatus(levelId: string): string {
    if (!this.isLevelUnlocked(levelId)) {
      return '🔒';
    }
    return this.isLevelCompleted(levelId) ? '✅' : '🔓';
  }

  /**
   * 获取星级显示字符串
   */
  getStarsDisplay(levelId: string): string {
    const stars = this.getLevelStars(levelId);
    return '⭐'.repeat(stars);
  }

}
