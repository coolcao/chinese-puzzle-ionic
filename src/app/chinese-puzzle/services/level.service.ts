import { Injectable, inject } from "@angular/core";
import { Piece, Level } from "../chinese-puzzle.type";
import { LevelStore } from "../level.store";

// 扩展 Piece 类型以包含 templateId 和其他编辑器状态
export interface EditorPiece extends Piece {
  templateId: number;
  isDragging?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  messageType: 'info' | 'success' | 'error';
  solutionPath?: EditorPiece[][];
  validationTime?: number;
  minSteps?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LevelService {
  private levelStore = inject(LevelStore);

  // 棋盘尺寸
  private readonly boardWidth = 4;
  private readonly boardHeight = 5;

  // 棋子模板映射，用于获取templateId
  private readonly pieceTemplateMap: { [key: string]: number } = {
    '曹操': 1,
    '关羽': 2,
    '张飞': 3,
    '赵云': 4,
    '马超': 5,
    '黄忠': 6,
    '卒': 7
  };

  /**
   * 验证Level关卡数据的完整性和可解性
   * @param level 关卡数据
   * @returns 验证结果
   */
  async validateLevel(level: Level): Promise<ValidationResult> {
    const editorPieces = this.convertPiecesToEditorPieces(level.pieces);
    return this.validateLevelData(editorPieces);
  }

  /**
   * 验证关卡数据的完整性和可解性
   * @param pieces 棋子数组
   * @returns 验证结果
   */
  async validateLevelData(pieces: EditorPiece[]): Promise<ValidationResult> {
    // 基本数据验证
    if (pieces.length === 0) {
      return {
        isValid: false,
        message: '请至少添加一个棋子',
        messageType: 'error'
      };
    }

    const caocao = pieces.find(p => p.name === '曹操');
    if (!caocao) {
      return {
        isValid: false,
        message: '必须包含曹操棋子',
        messageType: 'error'
      };
    }

    // 开始计时
    const startTime = performance.now();
    const solutionPath = await this.isSolvable(pieces);
    const endTime = performance.now();

    // 计算验证耗时
    const validationTime = Math.round(endTime - startTime);

    if (solutionPath) {
      const steps = solutionPath.length - 1;
      return {
        isValid: true,
        message: `数据合法, 关卡有解! 最佳步数: ${steps}, 验证耗时: ${validationTime}ms`,
        messageType: 'success',
        solutionPath,
        validationTime,
        minSteps: steps
      };
    } else {
      return {
        isValid: false,
        message: `数据合法, 但当前关卡无解! 验证耗时: ${validationTime}ms`,
        messageType: 'error',
        validationTime
      };
    }
  }

  /**
   * 检查关卡是否有解
   * @param pieces 棋子数组
   * @returns 解法路径或null
   */
  private async isSolvable(pieces: EditorPiece[]): Promise<EditorPiece[][] | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        const initialState = pieces;
        const goalPieceName = '曹操';
        const goalX = 1;
        const goalY = 3;

        const queue: EditorPiece[][] = [initialState];
        const predecessors = new Map<string, EditorPiece[][]>();
        predecessors.set(this.getBoardStateHash(initialState), [initialState]);

        let path: EditorPiece[][] | null = null;

        while (queue.length > 0) {
          const currentState = queue.shift()!;
          const currentPath = predecessors.get(this.getBoardStateHash(currentState))!;

          const caocao = currentState.find(p => p.name === goalPieceName);
          if (caocao && caocao.x === goalX && caocao.y === goalY) {
            path = currentPath;
            break;
          }

          const successors = this.getSuccessors(currentState);
          for (const successor of successors) {
            const hash = this.getBoardStateHash(successor);
            if (!predecessors.has(hash)) {
              const newPath = [...currentPath, successor];
              predecessors.set(hash, newPath);
              queue.push(successor);
            }
          }
        }
        resolve(path);
      }, 0);
    });
  }

  /**
   * 生成棋盘状态的哈希值
   * @param pieces 棋子数组
   * @returns 哈希字符串
   */
  private getBoardStateHash(pieces: EditorPiece[]): string {
    const grid = Array(this.boardHeight).fill(null).map(() => Array(this.boardWidth).fill(0));
    pieces.forEach(p => {
      for (let y = p.y; y < p.y + p.height; y++) {
        for (let x = p.x; x < p.x + p.width; x++) {
          grid[y][x] = p.templateId;
        }
      }
    });
    return grid.flat().join(',');
  }

  /**
   * 获取当前状态的所有可能后续状态
   * @param pieces 当前棋子状态
   * @returns 所有可能的后续状态数组
   */
  private getSuccessors(pieces: EditorPiece[]): EditorPiece[][] {
    const successors: EditorPiece[][] = [];
    const moves = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      for (const move of moves) {
        const newX = piece.x + move.dx;
        const newY = piece.y + move.dy;

        const newPiece = { ...piece, x: newX, y: newY };

        if (newX < 0 || newY < 0 || newX + piece.width > this.boardWidth || newY + piece.height > this.boardHeight) {
          continue;
        }

        let isBlocked = false;
        const otherPieces = pieces.filter(p => p.id !== piece.id);
        for (const other of otherPieces) {
          if (newPiece.x < other.x + other.width &&
            newPiece.x + newPiece.width > other.x &&
            newPiece.y < other.y + other.height &&
            newPiece.y + newPiece.height > other.y) {
            isBlocked = true;
            break;
          }
        }

        if (!isBlocked) {
          const newState = pieces.map(p => p.id === piece.id ? newPiece : p);
          successors.push(newState);
        }
      }
    }
    return successors;
  }

  /**
   * 检查棋子位置是否有效
   * @param piece 要检查的棋子
   * @param allPieces 所有棋子数组
   * @returns 是否有效
   */
  isValidPosition(piece: EditorPiece, allPieces: EditorPiece[]): boolean {
    if (piece.x < 0 || piece.y < 0 ||
      piece.x + piece.width > this.boardWidth ||
      piece.y + piece.height > this.boardHeight) {
      return false;
    }
    for (const other of allPieces) {
      if (piece.id === other.id) continue;
      if (piece.x < other.x + other.width &&
        piece.x + piece.width > other.x &&
        piece.y < other.y + other.height &&
        piece.y + piece.height > other.y) {
        return false;
      }
    }
    return true;
  }

  /**
   * 将Piece数组转换为EditorPiece数组
   * @param pieces 标准棋子数组
   * @returns EditorPiece数组
   */
  convertPiecesToEditorPieces(pieces: Piece[]): EditorPiece[] {
    return pieces.map(piece => ({
      ...piece,
      templateId: this.getTemplateId(piece.name),
      isDragging: false
    }));
  }

  /**
   * 将EditorPiece数组转换为Piece数组
   * @param editorPieces EditorPiece数组
   * @returns 标准棋子数组
   */
  convertEditorPiecesToPieces(editorPieces: EditorPiece[]): Piece[] {
    return editorPieces.map(piece => ({
      id: piece.id,
      name: piece.name,
      width: piece.width,
      height: piece.height,
      x: piece.x,
      y: piece.y,
      img: piece.img
    }));
  }

  /**
   * 根据棋子名称获取templateId
   * @param pieceName 棋子名称
   * @returns templateId
   */
  private getTemplateId(pieceName: string): number {
    // 处理带数字后缀的卒（如'卒1', '卒2'等）
    if (pieceName.startsWith('卒')) {
      return this.pieceTemplateMap['卒'];
    }
    return this.pieceTemplateMap[pieceName] || 0;
  }

  /**
   * 验证Level数据中的棋子配置是否合理
   * @param level 关卡数据
   * @returns 基础验证结果
   */
  validateLevelBasicData(level: Level): { isValid: boolean, message: string } {
    if (!level.pieces || level.pieces.length === 0) {
      return { isValid: false, message: '关卡必须包含至少一个棋子' };
    }

    const caocao = level.pieces.find(p => p.name === '曹操');
    if (!caocao) {
      return { isValid: false, message: '关卡必须包含曹操棋子' };
    }

    // 检查棋子是否重叠或超出边界
    const editorPieces = this.convertPiecesToEditorPieces(level.pieces);
    for (const piece of editorPieces) {
      if (!this.isValidPosition(piece, editorPieces)) {
        return { isValid: false, message: `棋子 ${piece.name} 位置无效或与其他棋子重叠` };
      }
    }

    return { isValid: true, message: '基础数据验证通过' };
  }

  // ========== 关卡管理相关方法 ==========

  /**
   * 按解锁顺序排序的关卡列表
   */
  getSortedLevels(): Level[] {
    const levels = this.levelStore.allLevels();
    const difficultyOrder = { 'beginner': 1, 'easy': 2, 'medium': 3, 'hard': 4 };

    return [...levels].sort((a, b) => {
      // 首先按难度排序
      const diffA = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 5;
      const diffB = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 5;

      if (diffA !== diffB) {
        return diffA - diffB;
      }

      // 同一难度内按minSteps排序
      return (a.minSteps || 0) - (b.minSteps || 0);
    });
  }

  /**
   * 获取第一个入门关卡（按解锁顺序）
   */
  getFirstBeginnerLevel(): Level | null {
    const sortedLevels = this.getSortedLevels();
    return sortedLevels.find(level => level.difficulty === 'beginner') || null;
  }

  /**
   * 获取第一个简单关卡（按解锁顺序）
   */
  getFirstEasyLevel(): Level | null {
    const sortedLevels = this.getSortedLevels();
    return sortedLevels.find(level => level.difficulty === 'easy') || null;
  }

  /**
   * 根据ID获取关卡
   */
  getLevelById(levelId: string): Level | null {
    return this.levelStore.allLevels().find(level => level.id === levelId) || null;
  }

  /**
   * 获取下一个关卡（线性解锁顺序）
   */
  getNextLevel(currentLevelId: string): Level | null {
    const sortedLevels = this.getSortedLevels();
    const currentIndex = sortedLevels.findIndex(level => level.id === currentLevelId);

    if (currentIndex >= 0 && currentIndex < sortedLevels.length - 1) {
      return sortedLevels[currentIndex + 1];
    }

    return null;
  }

  /**
   * 获取前一个关卡
   */
  getPreviousLevel(currentLevelId: string): Level | null {
    const sortedLevels = this.getSortedLevels();
    const currentIndex = sortedLevels.findIndex(level => level.id === currentLevelId);

    if (currentIndex > 0) {
      return sortedLevels[currentIndex - 1];
    }

    return null;
  }

  /**
   * 检查关卡是否已解锁（从Store获取）
   */
  isLevelUnlocked(levelId: string): boolean {
    return this.levelStore.isLevelUnlocked(levelId);
  }

  /**
   * 获取已解锁的关卡列表（从Store获取）
   */
  getUnlockedLevels(): string[] {
    return this.levelStore.unlockedLevels();
  }

  /**
   * 解锁关卡（仅更新Store）
   * 注意：这是内部方法，外部应该使用LevelStateService.unlockLevel()
   */
  private unlockLevelInStore(levelId: string): void {
    this.levelStore.unlockLevel(levelId);
  }

  /**
   * 解锁关卡（公共方法，供LevelStateService使用）
   * @deprecated 请使用LevelStateService.unlockLevel()以确保Storage同步
   */
  unlockLevel(levelId: string): void {
    this.unlockLevelInStore(levelId);
  }

  /**
   * 设置已解锁关卡列表（同步到Store）
   */
  setUnlockedLevels(unlockedLevels: string[]): void {
    this.levelStore.setUnlockedLevels(unlockedLevels);
  }

  /**
   * 初始化关卡解锁状态（首次启动时）
   */
  initializeUnlockStatus(): string[] {
    const firstLevel = this.getFirstBeginnerLevel();
    if (firstLevel) {
      const initialUnlocked = [firstLevel.id];
      this.setUnlockedLevels(initialUnlocked);
      return initialUnlocked;
    }
    return [];
  }

  /**
   * 尝试解锁下一关（完成关卡后调用）
   * 注意：这个方法只更新Store，调用者需要负责Storage同步
   */
  tryUnlockNextLevel(currentLevelId: string): string | null {
    // 首先确保当前完成的关卡本身已解锁（修复遗漏的关卡）
    if (!this.isLevelUnlocked(currentLevelId)) {
      this.unlockLevelInStore(currentLevelId);
      console.log(`🔓 补充解锁当前完成的关卡: ${currentLevelId}`);
    }
    
    // 然后尝试解锁下一关
    const nextLevel = this.getNextLevel(currentLevelId);
    if (nextLevel && !this.isLevelUnlocked(nextLevel.id)) {
      this.unlockLevelInStore(nextLevel.id);
      return nextLevel.id;
    }
    return null;
  }

  /**
   * 重置关卡解锁状态
   */
  resetUnlockStatus(): string[] {
    const initialUnlocked = this.initializeUnlockStatus();
    return initialUnlocked;
  }

  /**
   * 获取关卡统计信息
   */
  getLevelStats() {
    const allLevels = this.levelStore.allLevels();
    const unlockedLevels = this.getUnlockedLevels();

    return {
      total: allLevels.length,
      unlocked: unlockedLevels.length,
      locked: allLevels.length - unlockedLevels.length,
      beginner: allLevels.filter(l => l.difficulty === 'beginner').length,
      easy: allLevels.filter(l => l.difficulty === 'easy').length,
      medium: allLevels.filter(l => l.difficulty === 'medium').length,
      hard: allLevels.filter(l => l.difficulty === 'hard').length
    };
  }
}
