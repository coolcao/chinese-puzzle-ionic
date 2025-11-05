import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStorageService } from '../../services/game-storage.service';
import { GameManagementService } from '../../services/game-management.service';
import { LevelService } from '../../services/level.service';
import { LevelStateService } from '../../services/level-state.service';
import { levels } from '../../data/data-set';
import { Level, GameStep, Direction } from '../../chinese-puzzle.type';

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './debug-panel.component.html',
  styleUrls: ['./debug-panel.component.css']
})
export class DebugPanelComponent implements OnInit, OnDestroy {
  private gameStorage = inject(GameStorageService);
  private gameManagement = inject(GameManagementService);
  private levelService = inject(LevelService);
  private levelStateService = inject(LevelStateService);

  // 面板状态
  isVisible = signal(false);
  isSimulating = signal(false);
  
  // 关卡数据
  allLevels = levels;
  unlockedLevels = signal<string[]>([]);
  sortedLevels = signal<Level[]>([]);
  
  // 模拟状态
  currentSimulationIndex = signal(0);
  simulationLog = signal<string[]>([]);
  
  // 统计信息
  totalLevels = computed(() => this.allLevels.length);
  completedCount = computed(() => this.unlockedLevels().length);
  
  // 关卡状态缓存
  levelStatusMap = signal<{ [levelId: string]: string }>({});
  
  ngOnInit() {
    this.loadUnlockedLevels();
    this.initSortedLevels();
  }

  ngOnDestroy() {
    // 清理资源
  }

  // 初始化排序后的关卡列表（按解锁顺序）
  private initSortedLevels() {
    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
    
    const sorted = [...this.allLevels].sort((a, b) => {
      // 首先按难度排序
      const diffA = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 4;
      const diffB = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 4;
      
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      
      // 同一难度内按minSteps排序
      return (a.minSteps || 0) - (b.minSteps || 0);
    });
    
    this.sortedLevels.set(sorted);
  }

  // 加载已解锁的关卡
  async loadUnlockedLevels() {
    const unlocked = this.levelStateService.getUnlockedLevels();
    this.unlockedLevels.set(unlocked);
    
    // 同时加载关卡完成状态
    await this.loadLevelStatusMap();
    
    this.addLog(`📊 当前已解锁 ${unlocked.length}/${this.totalLevels()} 个关卡`);
  }

  // 加载关卡状态映射
  private async loadLevelStatusMap() {
    const statusMap: { [levelId: string]: string } = {};
    const unlocked = this.unlockedLevels();
    
    for (const level of this.allLevels) {
      if (!unlocked.includes(level.id)) {
        statusMap[level.id] = '🔒';
      } else {
        const progress = await this.gameStorage.getProgress(level.id);
        statusMap[level.id] = (progress && progress.isCompleted) ? '✅' : '🔓';
      }
    }
    
    this.levelStatusMap.set(statusMap);
  }

  // 切换面板显示
  togglePanel() {
    this.isVisible.set(!this.isVisible());
    if (this.isVisible()) {
      this.loadUnlockedLevels();
    }
  }

  // 添加日志
  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.simulationLog.update(logs => [...logs, `[${timestamp}] ${message}`]);
  }

  // 清空日志
  clearLog() {
    this.simulationLog.set([]);
  }

  // 模拟完成单个关卡
  async simulateCompleteLevel(level: Level) {
    if (this.isSimulating()) return;
    
    this.isSimulating.set(true);
    this.addLog(`🎮 开始模拟完成关卡: ${level.name} (${level.id})`);
    
    try {
      // 检查关卡是否已解锁
      const isUnlocked = this.levelStateService.isLevelUnlocked(level.id);
      if (!isUnlocked) {
        this.addLog(`🔒 关卡未解锁，无法完成: ${level.name}`);
        this.isSimulating.set(false);
        return;
      }

      // 生成真实的游戏数据（基于求解算法）
      this.addLog(`🧮 正在求解关卡并生成真实游戏步骤...`);
      const gameData = await this.generateRealGameSteps(level);
      
      if (!gameData) {
        this.addLog(`❌ 无法生成游戏数据，关卡可能无解`);
        return;
      }
      
      const { steps, gameSteps, time } = gameData;

      this.addLog(`📝 真实游戏数据生成完成:`);
      this.addLog(`   实际步数: ${steps} (最优解)`);
      this.addLog(`   配置步数: ${level.minSteps || '未设置'}`);
      this.addLog(`   游戏时间: ${time}秒`);
      this.addLog(`   移动步骤: ${gameSteps.length}个`);
      
      // 验证数据一致性
      if (level.minSteps && level.minSteps !== steps) {
        this.addLog(`⚠️ 警告: 关卡配置的minSteps(${level.minSteps})与实际最优解(${steps})不符`);
      }

      // 保存游戏历史记录（包含真实的详细步骤）
      await this.gameStorage.saveGameHistory(level.id, steps, time, gameSteps);
      
      // 保存游戏进度
      await this.gameStorage.saveProgress(level.id, steps, time);
      
      // 处理关卡解锁逻辑
      const nextLevelId = await this.levelStateService.completeLevel(level.id);
      
      this.addLog(`✅ 关卡完成模拟成功: ${level.name}`);
      
      if (nextLevelId) {
        this.addLog(`🎉 已自动解锁下一关: ${nextLevelId}`);
      } else {
        this.addLog(`🏆 这是最后一关！`);
      }
      
      // 重新加载解锁状态
      await this.loadUnlockedLevels();
      
    } catch (error) {
      this.addLog(`❌ 模拟失败: ${error}`);
      console.error('模拟关卡完成失败:', error);
    } finally {
      this.isSimulating.set(false);
    }
  }

  // 模拟完成下一关
  async simulateCompleteNext() {
    const unlocked = this.unlockedLevels();
    const sorted = this.sortedLevels();
    
    // 找到下一个未完成但已解锁的关卡
    let nextLevel = null;
    
    for (const level of sorted) {
      if (unlocked.includes(level.id)) {
        // 检查是否已经完成过
        const progress = await this.gameStorage.getProgress(level.id);
        if (!progress || !progress.isCompleted) {
          nextLevel = level;
          break;
        }
      } else {
        // 找到第一个未解锁的关卡，检查前一关是否已完成
        const currentIndex = sorted.indexOf(level);
        if (currentIndex === 0) {
          // 第一关应该已经解锁，这里不应该到达
          nextLevel = level;
          break;
        } else {
          const prevLevel = sorted[currentIndex - 1];
          const prevProgress = await this.gameStorage.getProgress(prevLevel.id);
          if (prevProgress && prevProgress.isCompleted) {
            // 前一关已完成，但这一关还未解锁，说明需要先解锁
            this.addLog(`🔓 自动解锁关卡: ${level.name}`);
            await this.levelStateService.unlockLevel(level.id);
            await this.loadUnlockedLevels(); // 刷新解锁状态
            nextLevel = level;
            break;
          } else {
            this.addLog(`🚫 无法解锁 ${level.name}，前置关卡 ${prevLevel.name} 尚未完成`);
            return;
          }
        }
      }
    }
    
    if (nextLevel) {
      this.addLog(`🎯 找到下一个可完成的关卡: ${nextLevel.name}`);
      await this.simulateCompleteLevel(nextLevel);
    } else {
      this.addLog(`🏆 恭喜！所有关卡都已完成！`);
    }
  }

  // 批量模拟完成关卡（按顺序逐关完成）
  async simulateCompleteAllInOrder() {
    if (this.isSimulating()) return;
    
    this.isSimulating.set(true);
    this.addLog(`🚀 开始批量模拟完成所有关卡...`);
    
    const sorted = this.sortedLevels();
    let completedCount = 0;
    
    try {
      for (let i = 0; i < sorted.length; i++) {
        const level = sorted[i];
        const isUnlocked = this.levelStateService.isLevelUnlocked(level.id);
        
        if (!isUnlocked) {
          this.addLog(`🔒 跳过未解锁关卡: ${level.name}`);
          break; // 遇到未解锁关卡就停止
        }
        
        // 检查是否已经完成过
        const progress = await this.gameStorage.getProgress(level.id);
        if (progress && progress.isCompleted) {
          this.addLog(`✅ 关卡已完成，跳过: ${level.name}`);
          completedCount++;
          continue;
        }
        
        // 模拟完成关卡
        this.currentSimulationIndex.set(i);
        await this.simulateCompleteLevel(level);
        completedCount++;
        
        // 添加延迟，避免操作过快
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      this.addLog(`🎉 批量模拟完成！共完成 ${completedCount} 个关卡`);
      
    } catch (error) {
      this.addLog(`❌ 批量模拟中断: ${error}`);
      console.error('批量模拟失败:', error);
    } finally {
      this.isSimulating.set(false);
      this.currentSimulationIndex.set(0);
      await this.loadUnlockedLevels();
    }
  }

  // 重置所有进度
  async resetAllProgress() {
    if (this.isSimulating()) return;
    
    const confirmed = confirm('确定要重置所有关卡进度吗？此操作不可恢复！');
    if (!confirmed) return;
    
    this.addLog(`🔄 开始重置所有进度...`);
    
    try {
      // 重置关卡解锁状态
      await this.levelStateService.resetLevelState();
      
      // 清除游戏历史记录
      await this.gameManagement.clearGameHistory();
      
      this.addLog(`✅ 所有进度已重置`);
      await this.loadUnlockedLevels();
      
    } catch (error) {
      this.addLog(`❌ 重置失败: ${error}`);
      console.error('重置进度失败:', error);
    }
  }


  // 生成真实的游戏步骤（基于求解算法）
  private async generateRealGameSteps(level: Level): Promise<{ steps: number; gameSteps: GameStep[]; time: number } | null> {
    try {
      // 使用LevelService验证关卡并获取解法路径
      const validationResult = await this.levelService.validateLevel(level);
      
      if (!validationResult.isValid || !validationResult.solutionPath) {
        this.addLog(`❌ 关卡无解或验证失败: ${validationResult.message}`);
        return null;
      }
      
      const solutionPath = validationResult.solutionPath;
      const totalSteps = solutionPath.length - 1;
      const gameSteps: GameStep[] = [];
      
      // 从解法路径中提取真实的移动步骤
      for (let i = 1; i < solutionPath.length; i++) {
        const prevState = solutionPath[i - 1];
        const currentState = solutionPath[i];
        
        // 找到发生移动的棋子
        const movedPiece = this.findMovedPiece(prevState, currentState);
        
        if (movedPiece) {
          const { piece, fromPos, toPos, direction, distance } = movedPiece;
          
          const step: GameStep = {
            stepNumber: i,
            timestamp: i * (1500 + Math.random() * 2000), // 1.5-3.5秒间隔
            pieceId: piece.id,
            pieceName: piece.name,
            fromPosition: fromPos,
            toPosition: toPos,
            direction,
            distance,
            duration: 150 + Math.random() * 300 // 150-450ms操作时间
          };
          
          gameSteps.push(step);
        }
      }
      
      // 计算总游戏时间（基于步骤间隔）
      const totalTime = gameSteps.length > 0 ? 
        Math.floor((gameSteps[gameSteps.length - 1].timestamp + gameSteps[gameSteps.length - 1].duration) / 1000) : 
        totalSteps * 2;
      
      return {
        steps: totalSteps,
        gameSteps,
        time: totalTime
      };
      
    } catch (error) {
      this.addLog(`❌ 生成游戏步骤失败: ${error}`);
      return null;
    }
  }
  
  // 找到两个状态之间发生移动的棋子
  private findMovedPiece(prevState: any[], currentState: any[]): {
    piece: any;
    fromPos: { x: number; y: number };
    toPos: { x: number; y: number };
    direction: Direction;
    distance: number;
  } | null {
    
    for (let i = 0; i < currentState.length; i++) {
      const currentPiece = currentState[i];
      const prevPiece = prevState.find(p => p.id === currentPiece.id);
      
      if (prevPiece && (prevPiece.x !== currentPiece.x || prevPiece.y !== currentPiece.y)) {
        const fromPos = { x: prevPiece.x, y: prevPiece.y };
        const toPos = { x: currentPiece.x, y: currentPiece.y };
        
        let direction: Direction;
        let distance: number;
        
        if (toPos.x > fromPos.x) {
          direction = Direction.Right;
          distance = toPos.x - fromPos.x;
        } else if (toPos.x < fromPos.x) {
          direction = Direction.Left;
          distance = fromPos.x - toPos.x;
        } else if (toPos.y > fromPos.y) {
          direction = Direction.Down;
          distance = toPos.y - fromPos.y;
        } else {
          direction = Direction.Up;
          distance = fromPos.y - toPos.y;
        }
        
        return {
          piece: currentPiece,
          fromPos,
          toPos,
          direction,
          distance
        };
      }
    }
    
    return null;
  }

  // 获取关卡状态显示（使用缓存）
  getLevelStatus(level: Level): string {
    return this.levelStatusMap()[level.id] || '🔒';
  }

  // 获取关卡详细信息
  async getLevelDetails(level: Level): Promise<void> {
    this.addLog(`🔍 查看关卡详情: ${level.name}`);
    
    const isUnlocked = this.levelStateService.isLevelUnlocked(level.id);
    const progress = await this.gameStorage.getProgress(level.id);
    const history = await this.gameStorage.getGameHistoryByLevel(level.id);
    
    this.addLog(`   ID: ${level.id}`);
    this.addLog(`   难度: ${level.difficulty}`);
    this.addLog(`   配置最优步数: ${level.minSteps || '未设置'}`);
    this.addLog(`   解锁状态: ${isUnlocked ? '已解锁' : '未解锁'}`);
    
    if (progress) {
      this.addLog(`   完成状态: ${progress.isCompleted ? '已完成' : '未完成'}`);
      this.addLog(`   最佳步数: ${progress.bestSteps}`);
      this.addLog(`   最佳时间: ${progress.bestTime}秒`);
      this.addLog(`   尝试次数: ${progress.attempts}`);
      this.addLog(`   星级评分: ${progress.stars}星`);
    } else {
      this.addLog(`   完成状态: 未开始`);
    }
    
    this.addLog(`   游戏历史: ${history.length}条记录`);
  }

  // 清除特定关卡的进度
  async clearLevelProgress(level: Level): Promise<void> {
    const confirmed = confirm(`确定要清除关卡"${level.name}"的进度吗？`);
    if (!confirmed) return;
    
    try {
      // 这里需要GameStorageService添加删除单个关卡进度的方法
      // 暂时通过清除存储键来实现
      await this.gameStorage.remove(`progress_${level.id}`);
      
      // 同时清除该关卡的历史记录
      const historyKeys = await this.gameStorage.keys();
      const levelHistoryKeys = historyKeys.filter(key => 
        key.startsWith('history_') && key.includes(level.id)
      );
      
      for (const key of levelHistoryKeys) {
        await this.gameStorage.remove(key);
      }
      
      this.addLog(`🗑️ 已清除关卡"${level.name}"的所有进度和历史记录`);
      await this.loadUnlockedLevels(); // 刷新状态
      
    } catch (error) {
      this.addLog(`❌ 清除失败: ${error}`);
    }
  }

  // 获取关卡在排序列表中的位置
  getLevelOrder(level: Level): number {
    return this.sortedLevels().indexOf(level) + 1;
  }
}