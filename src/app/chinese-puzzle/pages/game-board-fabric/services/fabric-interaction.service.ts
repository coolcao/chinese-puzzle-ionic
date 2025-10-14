import { computed, inject, Injectable } from '@angular/core';
import { Group } from 'fabric';
import { Piece, Direction } from '../../../chinese-puzzle.type';
import { FabricGameService } from './fabric-game.service';
import { ChinesePuzzleStore } from '../../../chinese-puzzle.store';


@Injectable({
  providedIn: 'root'
})
export class FabricInteractionService {

  private readonly fabricGameService = inject(FabricGameService);
  private readonly store = inject(ChinesePuzzleStore);

  private moveCallback?: (piece: Piece, direction: Direction, steps: number) => void;
  private boardStateCallback?: () => string[][];

  // 教程模式相关
  private tutorialMode = false;
  private tutorialTargetPieceId?: number;
  private tutorialRequiredDirection?: string;
  private tutorialTargetPosition?: { x: number, y: number };

  // 路径执行状态
  private executingPath = false;
  private pathMoves: { direction: Direction, steps: number }[] = [];
  private currentPiece?: Piece;

  // 拖拽体验模式设置
  // true: 丝滑拖拽模式 - 棋子平滑跟随鼠标，通过透明度提示移动有效性
  // false: 精准拖拽模式 - 棋子只能移动到有效位置，提供即时约束反馈
  smoothDragMode = computed(() => {
    return Boolean(this.store.settings().smoothDragMode);
  });

  constructor() { }

  // 设置移动回调
  setMoveCallback(callback: (piece: Piece, direction: Direction, steps: number) => void): void {
    this.moveCallback = callback;
  }

  // 设置棋盘状态回调
  setBoardStateCallback(callback: () => string[][]): void {
    this.boardStateCallback = callback;
  }

  // 通知路径中的一步已完成，继续执行下一步
  notifyMoveCompleted(updatedPiece: Piece): void {
    if (!this.executingPath || !this.moveCallback) return;

    // 更新当前棋子状态
    this.currentPiece = updatedPiece;

    // 执行下一步移动
    if (this.pathMoves.length > 0) {
      const nextMove = this.pathMoves.shift()!;
      this.moveCallback(updatedPiece, nextMove.direction, nextMove.steps);
    } else {
      // 路径执行完成
      this.executingPath = false;
      this.pathMoves = [];
      this.currentPiece = undefined;
    }
  }

  // 初始化交互事件
  initInteractions(): void {
    const canvas = this.fabricGameService.canvas;
    if (!canvas) return;

    // 对象移动事件
    canvas.on('object:moving', (e: any) => {
      const obj = e.target as Group;
      if (!obj) return;

      if (this.smoothDragMode()) {
        // 丝滑拖拽模式：只约束边界，保持拖拽连续性
        this.constrainToBounds(obj);
        this.updateDragVisualFeedback(obj);
      } else {
        // 精准拖拽模式：即时约束到有效位置
        this.constrainToGrid(obj);
        this.snapToGrid(obj);

        // 检查碰撞，如果有碰撞则阻止移动
        if (!this.isValidPosition(obj)) {
          this.revertToLastValidPosition(obj);
        } else {
          this.updateLastValidPosition(obj);
        }
      }
    });

    // 对象拖拽结束事件
    canvas.on('object:modified', (e: any) => {
      const obj = e.target as Group;
      if (!obj || !(obj instanceof Group)) return;

      this.handlePieceRelease(obj);
    });

    // 对象鼠标悬停事件
    canvas.on('mouse:over', (e: any) => {
      const obj = e.target as Group;
      if (!obj || !(obj instanceof Group)) return;

      // 鼠标悬停时不做任何效果
      // 保持原始大小
    });

    // 对象鼠标离开事件
    canvas.on('mouse:out', (e: any) => {
      const obj = e.target as Group;
      if (!obj || !(obj instanceof Group)) return;

      // 鼠标离开时不做任何效果
      // 保持原始大小
    });

    // 移动端触摸事件支持（暂时注释掉，因为Fabric 6.x可能不支持此事件）
    // canvas.on('touch:gesture', (e: any) => {
    //   e.e?.preventDefault();
    // });

    canvas.on('selection:created', (e: any) => {
      e.selected?.forEach((obj: any) => {
        if (obj instanceof Group) {
          obj.set({
            borderColor: '#007bff',
            cornerColor: '#007bff',
            cornerSize: 8
          });
        }
      });
    });
  }

  // 只约束边界，不进行网格对齐（用于平滑拖拽）
  private constrainToBounds(obj: Group): void {
    const cellSize = this.fabricGameService.cellSize;
    const boardWidth = this.fabricGameService.boardWidth;
    const boardHeight = this.fabricGameService.boardHeight;

    // 获取棋子信息
    const pieceInfo = this.getPieceInfo(obj);
    if (!pieceInfo) return;

    const { piece } = pieceInfo;
    const gap = 1; // 与createPieceGroup中保持一致

    // 约束移动范围
    const minX = gap;
    const maxX = (boardWidth - piece.width) * cellSize + gap;
    const minY = gap;
    const maxY = (boardHeight - piece.height) * cellSize + gap;

    if (obj.left! < minX) obj.set({ left: minX });
    if (obj.left! > maxX) obj.set({ left: maxX });
    if (obj.top! < minY) obj.set({ top: minY });
    if (obj.top! > maxY) obj.set({ top: maxY });
  }

  // 智能约束：只允许拖拽到有效路径上
  private intelligentConstraint(obj: Group): void {
    const pieceInfo = this.getPieceInfo(obj);
    if (!pieceInfo) return;

    const { piece, originalX, originalY } = pieceInfo;
    const cellSize = this.fabricGameService.cellSize;
    const gap = 1;

    // 计算当前试图移动到的网格位置
    const targetX = Math.round((obj.left! - gap + 1) / cellSize);
    const targetY = Math.round((obj.top! - gap + 1) / cellSize);

    // 检查是否有从原始位置到目标位置的有效路径
    const hasValidPath = this.hasValidMovePath(piece, originalX, originalY, targetX, targetY);

    if (!hasValidPath) {
      // 如果没有有效路径，约束到最近的有效位置
      const nearestValidPos = this.findNearestValidPosition(piece, originalX, originalY, targetX, targetY);
      if (nearestValidPos) {
        const constrainedLeft = nearestValidPos.x * cellSize + gap;
        const constrainedTop = nearestValidPos.y * cellSize + gap;
        obj.set({
          left: constrainedLeft,
          top: constrainedTop
        });
      } else {
        // 如果找不到有效位置，保持在原位置
        const originalLeft = originalX * cellSize + gap;
        const originalTop = originalY * cellSize + gap;
        obj.set({
          left: originalLeft,
          top: originalTop
        });
      }
    } else {
      // 如果有有效路径，仍然约束到边界
      this.constrainToBounds(obj);
    }
  }

  // 更新拖拽视觉反馈（只改变视觉，不影响位置）
  private updateDragVisualFeedback(obj: Group): void {
    const pieceInfo = this.getPieceInfo(obj);
    if (!pieceInfo) return;

    const { piece, originalX, originalY } = pieceInfo;
    const cellSize = this.fabricGameService.cellSize;
    const gap = 1;

    // 计算当前鼠标位置对应的网格位置
    const currentX = Math.round((obj.left! - gap + 1) / cellSize);
    const currentY = Math.round((obj.top! - gap + 1) / cellSize);

    // 检查当前位置是否有效（可以移动到）
    const isValidPosition = this.hasValidMovePath(piece, originalX, originalY, currentX, currentY);

    // 只更新视觉反馈，不改变位置
    if (isValidPosition) {
      // 有效位置：正常透明度
      obj.set({ opacity: 1.0 });
    } else {
      // 无效位置：半透明提示，但保持拖拽能力
      obj.set({ opacity: 0.5 });
    }

    // 重新渲染
    this.fabricGameService.canvas?.renderAll();
  }

  // 约束到网格（在释放时使用）
  private constrainToGrid(obj: Group): void {
    const cellSize = this.fabricGameService.cellSize;
    const boardWidth = this.fabricGameService.boardWidth;
    const boardHeight = this.fabricGameService.boardHeight;

    // 获取棋子信息
    const pieceInfo = this.getPieceInfo(obj);
    if (!pieceInfo) return;

    const { piece } = pieceInfo;

    // 约束移动范围
    const minX = 0;
    const maxX = (boardWidth - piece.width) * cellSize;
    const minY = 0;
    const maxY = (boardHeight - piece.height) * cellSize;

    if (obj.left! < minX) obj.set({ left: minX });
    if (obj.left! > maxX) obj.set({ left: maxX });
    if (obj.top! < minY) obj.set({ top: minY });
    if (obj.top! > maxY) obj.set({ top: maxY });
  }

  // 吸附到网格
  private snapToGrid(obj: Group): void {
    const cellSize = this.fabricGameService.cellSize;
    const gap = 1; // 与createPieceGroup中保持一致

    // 吸附到最近的网格位置
    const snappedLeft = Math.round((obj.left! - gap + 1) / cellSize) * cellSize + gap - 1;
    const snappedTop = Math.round((obj.top! - gap + 1) / cellSize) * cellSize + gap - 1;

    obj.set({
      left: snappedLeft,
      top: snappedTop
    });
  }

  // 处理棋子释放
  private handlePieceRelease(obj: Group): void {
    const pieceInfo = this.getPieceInfo(obj);
    if (!pieceInfo) {
      obj.set({
        selectable: true,
        evented: true
      });
      return;
    }

    const { piece, originalX, originalY } = pieceInfo;

    // 公共变量声明
    const cellSize = this.fabricGameService.cellSize;
    const gap = 1;
    let newX: number;
    let newY: number;

    if (this.smoothDragMode()) {
      // 丝滑拖拽模式：恢复透明度，进行位置验证
      obj.set({ opacity: 1.0 });

      // 在释放时进行网格对齐
      this.snapToGrid(obj);

      // 计算新位置（基于对齐后的位置）
      newX = Math.round((obj.left! - gap + 1) / cellSize);
      newY = Math.round((obj.top! - gap + 1) / cellSize);

      // 检查释放位置是否有效
      const hasValidPath = this.hasValidMovePath(piece, originalX, originalY, newX, newY);

      if (!hasValidPath || (newX === originalX && newY === originalY)) {
        // 无效位置或未移动，平滑回到原位置
        this.animateToOriginalPosition(obj);
        return;
      }
    } else {
      // 精准拖拽模式：位置已经在移动过程中验证过了
      newX = Math.round((obj.left! - gap + 1) / cellSize);
      newY = Math.round((obj.top! - gap + 1) / cellSize);

      // 检查是否有移动
      if (newX === originalX && newY === originalY) {
        // 没有移动，确保棋子保持可交互状态
        obj.set({
          selectable: true,
          evented: true
        });
        return;
      }
    }

    // 尝试寻找从起始位置到目标位置的路径
    const path = this.findPath(piece, originalX, originalY, newX, newY);

    if (path.length > 0) {
      // 执行路径上的所有移动
      this.executePath(piece, path);
      return;
    }

    // 单一方向移动
    const direction = this.determineDirection(originalX, originalY, newX, newY);
    if (!direction) {
      this.animateToOriginalPosition(obj);
      return;
    }

    const steps = this.calculateMoveSteps(originalX, originalY, newX, newY, direction);

    // 执行移动回调
    if (this.moveCallback) {
      // 检查是否可以移动到目标位置（支持多步移动）
      if (this.canMoveMultipleSteps(piece, direction, steps)) {
        // 计算移动后的目标位置
        let targetX = originalX;
        let targetY = originalY;

        switch (direction) {
          case Direction.Up:
            targetY -= steps;
            break;
          case Direction.Down:
            targetY += steps;
            break;
          case Direction.Left:
            targetX -= steps;
            break;
          case Direction.Right:
            targetX += steps;
            break;
        }

        // 教程模式下验证移动
        if (this.tutorialMode && !this.validateTutorialMove(piece, direction, targetX, targetY)) {
          console.log('教程模式：移动不符合要求，请按照提示操作');
          this.animateToOriginalPosition(obj);
          return; // 阻止移动
        }

        this.moveCallback(piece, direction, steps);
        // 移动成功的话，主组件会更新 Fabric 中的位置
      } else {
        this.animateToOriginalPosition(obj);
      }
    } else {
      this.animateToOriginalPosition(obj);
    }
  }

  // 获取棋子信息
  private getPieceInfo(obj: Group): { piece: Piece; originalX: number; originalY: number } | null {
    const pieceId = (obj as any).pieceId;
    const pieceName = (obj as any).pieceName;

    if (!pieceId || !pieceName) return null;

    const cellSize = this.fabricGameService.cellSize;
    const gap = 1; // 与createPieceGroup中保持一致

    // 从当前位置计算棋子在棋盘上的位置
    const currentX = Math.round((obj.left! - gap + 1) / cellSize);
    const currentY = Math.round((obj.top! - gap + 1) / cellSize);

    // 从原始位置计算棋子在棋盘上的原始位置
    const originalX = Math.round(((obj as any).originalLeft - gap + 1) / cellSize);
    const originalY = Math.round(((obj as any).originalTop - gap + 1) / cellSize);

    const piece: Piece = {
      id: pieceId,
      name: pieceName,
      width: Math.round((obj.width || 0) / cellSize),
      height: Math.round((obj.height || 0) / cellSize),
      x: originalX, // 使用原始位置作为当前逻辑位置
      y: originalY
    };

    return { piece, originalX, originalY };
  }

  // 确定移动方向（优化转角处理）
  private determineDirection(startX: number, startY: number, endX: number, endY: number): Direction | null {
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // 如果是对角线移动，优先选择移动距离更大的方向
    if (deltaX !== 0 && deltaY !== 0) {
      if (Math.abs(deltaX) >= Math.abs(deltaY)) {
        return deltaX > 0 ? Direction.Right : Direction.Left;
      } else {
        return deltaY > 0 ? Direction.Down : Direction.Up;
      }
    }

    // 单一方向移动
    if (deltaX !== 0) {
      return deltaX > 0 ? Direction.Right : Direction.Left;
    } else if (deltaY !== 0) {
      return deltaY > 0 ? Direction.Down : Direction.Up;
    }

    return null;
  }


  // 动画回到原位置（带弹性效果）
  private animateToOriginalPosition(obj: Group): void {
    const originalLeft = (obj as any).originalLeft;
    const originalTop = (obj as any).originalTop;

    if (originalLeft === undefined || originalTop === undefined) {
      // 确保棋子仍然可交互
      obj.set({
        left: obj.left,
        top: obj.top,
        selectable: true,
        evented: true
      });
      this.fabricGameService.canvas?.renderAll();
      return;
    }


    // 在动画开始前确保棋子状态正确
    obj.set({
      selectable: true,
      evented: true
    });

    // 使用 requestAnimationFrame 实现回弹动画
    this.animateBackToPosition(obj, originalLeft, originalTop);
  }

  // 使用 requestAnimationFrame 实现回弹动画
  private animateBackToPosition(obj: Group, targetLeft: number, targetTop: number): void {
    const startLeft = obj.left || 0;
    const startTop = obj.top || 0;
    const duration = 300; // 回弹动画持续时间
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用回弹函数
      const eased = this.easeOutBack(progress);

      // 计算当前位置
      const currentLeft = startLeft + (targetLeft - startLeft) * eased;
      const currentTop = startTop + (targetTop - startTop) * eased;

      // 更新位置，确保棋子保持可交互状态
      obj.set({
        left: currentLeft,
        top: currentTop,
        selectable: true,
        evented: true
      });

      // 重新渲染
      this.fabricGameService.canvas?.renderAll();

      // 继续动画或完成
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 确保最终位置精确，并恢复完整的交互能力
        obj.set({
          left: targetLeft,
          top: targetTop,
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: false,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true
        });

        // 更新原始位置为当前位置
        (obj as any).originalLeft = targetLeft;
        (obj as any).originalTop = targetTop;

        this.fabricGameService.canvas?.renderAll();

        // 强制重置棋子状态，确保交互能力
        this.forceResetPieceState(obj);

      }
    };

    requestAnimationFrame(animate);
  }

  // 增强的回弹缓动函数
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // 设置棋子可拖拽
  setPieceDraggable(pieceObject: Group, draggable: boolean): void {
    pieceObject.set({
      selectable: draggable,
      evented: draggable
    });
  }

  // 获取指定位置的棋子
  getPieceAtPosition(x: number, y: number): Group | null {
    const canvas = this.fabricGameService.canvas;
    if (!canvas) return null;

    // 创建一个模拟的事件对象
    const mockEvent = { clientX: x, clientY: y } as any;
    const pointer = canvas.getPointer(mockEvent);
    const objects = canvas.getObjects();

    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (obj instanceof Group && obj.containsPoint && obj.containsPoint(pointer)) {
        return obj;
      }
    }

    return null;
  }

  // 检查棋子是否可以移动到指定位置
  canMoveTo(piece: Piece, newX: number, newY: number): boolean {
    if (!this.boardStateCallback) return false;

    const boardState = this.boardStateCallback();
    const boardWidth = this.fabricGameService.boardWidth;
    const boardHeight = this.fabricGameService.boardHeight;

    // 检查边界
    if (newX < 0 || newY < 0 ||
      newX + piece.width > boardWidth ||
      newY + piece.height > boardHeight) {
      return false;
    }

    // 检查碰撞
    for (let i = 0; i < piece.height; i++) {
      for (let j = 0; j < piece.width; j++) {
        const cellY = newY + i;
        const cellX = newX + j;

        if (boardState[cellY][cellX] !== '' &&
          boardState[cellY][cellX] !== piece.name) {
          return false;
        }
      }
    }

    return true;
  }

  // 计算移动步数
  private calculateMoveSteps(startX: number, startY: number, endX: number, endY: number, direction: Direction): number {
    switch (direction) {
      case Direction.Up:
        return startY - endY;
      case Direction.Down:
        return endY - startY;
      case Direction.Left:
        return startX - endX;
      case Direction.Right:
        return endX - startX;
      default:
        return 0;
    }
  }

  // 检查棋子是否可以移动多步
  private canMoveMultipleSteps(piece: Piece, direction: Direction, steps: number): boolean {
    if (!this.boardStateCallback) return false;

    const boardState = this.boardStateCallback();
    let currentX = piece.x;
    let currentY = piece.y;

    // 逐步检查每一步是否可以移动
    for (let step = 1; step <= steps; step++) {
      let nextX = currentX;
      let nextY = currentY;

      // 根据方向计算下一步位置
      switch (direction) {
        case Direction.Up:
          nextY = piece.y - step;
          break;
        case Direction.Down:
          nextY = piece.y + step;
          break;
        case Direction.Left:
          nextX = piece.x - step;
          break;
        case Direction.Right:
          nextX = piece.x + step;
          break;
      }

      // 检查这一步是否可以移动到
      if (!this.canMoveTo(piece, nextX, nextY)) {
        return false;
      }
    }

    return true;
  }


  // 寻找从起始位置到目标位置的路径
  private findPath(piece: Piece, startX: number, startY: number, endX: number, endY: number): { direction: Direction, steps: number }[] {
    if (!this.boardStateCallback) return [];

    // 如果起点和终点相同，不需要移动
    if (startX === endX && startY === endY) {
      return [];
    }

    // 尝试两种路径：
    // 路径1：先水平移动，再垂直移动
    // 路径2：先垂直移动，再水平移动

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // 路径1：先水平后垂直
    const path1 = this.tryPath(piece, startX, startY, deltaX, deltaY, true);
    if (path1.length > 0) {
      return path1;
    }

    // 路径2：先垂直后水平
    const path2 = this.tryPath(piece, startX, startY, deltaX, deltaY, false);
    if (path2.length > 0) {
      return path2;
    }

    // 都不行，返回空路径
    return [];
  }

  // 尝试一条路径（horizontalFirst: true = 先水平后垂直，false = 先垂直后水平）
  private tryPath(piece: Piece, startX: number, startY: number, deltaX: number, deltaY: number, horizontalFirst: boolean): { direction: Direction, steps: number }[] {
    const path: { direction: Direction, steps: number }[] = [];
    let currentX = startX;
    let currentY = startY;

    if (horizontalFirst) {
      // 先水平移动
      if (deltaX !== 0) {
        const direction = deltaX > 0 ? Direction.Right : Direction.Left;
        const steps = Math.abs(deltaX);

        if (this.canMoveFromPosition(piece, currentX, currentY, direction, steps)) {
          path.push({ direction, steps });
          currentX += deltaX;
        } else {
          return []; // 水平移动失败
        }
      }

      // 再垂直移动
      if (deltaY !== 0) {
        const direction = deltaY > 0 ? Direction.Down : Direction.Up;
        const steps = Math.abs(deltaY);

        if (this.canMoveFromPosition(piece, currentX, currentY, direction, steps)) {
          path.push({ direction, steps });
        } else {
          return []; // 垂直移动失败
        }
      }
    } else {
      // 先垂直移动
      if (deltaY !== 0) {
        const direction = deltaY > 0 ? Direction.Down : Direction.Up;
        const steps = Math.abs(deltaY);

        if (this.canMoveFromPosition(piece, currentX, currentY, direction, steps)) {
          path.push({ direction, steps });
          currentY += deltaY;
        } else {
          return []; // 垂直移动失败
        }
      }

      // 再水平移动
      if (deltaX !== 0) {
        const direction = deltaX > 0 ? Direction.Right : Direction.Left;
        const steps = Math.abs(deltaX);

        if (this.canMoveFromPosition(piece, currentX, currentY, direction, steps)) {
          path.push({ direction, steps });
        } else {
          return []; // 水平移动失败
        }
      }
    }

    return path;
  }

  // 检查从指定位置能否按指定方向移动指定步数
  private canMoveFromPosition(piece: Piece, fromX: number, fromY: number, direction: Direction, steps: number): boolean {
    if (!this.boardStateCallback) return false;

    const boardState = this.boardStateCallback();
    const boardWidth = this.fabricGameService.boardWidth;
    const boardHeight = this.fabricGameService.boardHeight;

    // 创建临时棋子对象
    const tempPiece: Piece = {
      ...piece,
      x: fromX,
      y: fromY
    };

    // 逐步检查每一步
    for (let step = 1; step <= steps; step++) {
      let nextX = fromX;
      let nextY = fromY;

      switch (direction) {
        case Direction.Up:
          nextY = fromY - step;
          break;
        case Direction.Down:
          nextY = fromY + step;
          break;
        case Direction.Left:
          nextX = fromX - step;
          break;
        case Direction.Right:
          nextX = fromX + step;
          break;
      }

      // 检查边界
      if (nextX < 0 || nextY < 0 ||
        nextX + piece.width > boardWidth ||
        nextY + piece.height > boardHeight) {
        return false;
      }

      // 检查碰撞
      for (let i = 0; i < piece.height; i++) {
        for (let j = 0; j < piece.width; j++) {
          const cellY = nextY + i;
          const cellX = nextX + j;

          if (boardState[cellY][cellX] !== '' &&
            boardState[cellY][cellX] !== piece.name) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // 执行路径上的所有移动
  private executePath(piece: Piece, path: { direction: Direction, steps: number }[]): void {
    if (!this.moveCallback) return;


    // 创建一个特殊的回调来处理多步路径移动
    this.executingPath = true;
    this.pathMoves = [...path]; // 复制路径
    this.currentPiece = piece;

    // 开始执行第一步
    if (this.pathMoves.length > 0) {
      const firstMove = this.pathMoves.shift()!;
      this.moveCallback(piece, firstMove.direction, firstMove.steps);
    }
  }

  // 强制重置棋子状态（解决交互失效问题）
  private forceResetPieceState(obj: Group): void {
    // 完全重置棋子的交互状态
    obj.set({
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true
    });

    // 确保画布重新识别这个对象
    if (this.fabricGameService.canvas) {
      // 先从画布中移除再重新添加，强制刷新对象状态
      this.fabricGameService.canvas.remove(obj);
      this.fabricGameService.canvas.add(obj);

      // 重新设置为活动对象然后取消选择，确保状态正确
      this.fabricGameService.canvas.setActiveObject(obj);
      this.fabricGameService.canvas.discardActiveObject();
      this.fabricGameService.canvas.renderAll();
    }

  }

  // 检查当前位置是否有效（无碰撞且路径畅通）
  private isValidPosition(obj: Group): boolean {
    const pieceInfo = this.getPieceInfo(obj);
    if (!pieceInfo || !this.boardStateCallback) return true;

    const { piece } = pieceInfo;
    const cellSize = this.fabricGameService.cellSize;
    const gap = 1;

    // 计算当前网格位置
    const currentX = Math.round((obj.left! - gap + 1) / cellSize);
    const currentY = Math.round((obj.top! - gap + 1) / cellSize);

    // 计算最后有效位置的网格坐标
    const lastValidLeft = (obj as any).lastValidLeft || (obj as any).originalLeft;
    const lastValidTop = (obj as any).lastValidTop || (obj as any).originalTop;
    const lastValidX = Math.round((lastValidLeft - gap + 1) / cellSize);
    const lastValidY = Math.round((lastValidTop - gap + 1) / cellSize);

    // 检查目标位置是否可以放置棋子
    if (!this.canMoveTo(piece, currentX, currentY)) {
      return false;
    }

    // 检查从最后有效位置到当前位置的路径是否畅通
    return this.isPathClear(piece, lastValidX, lastValidY, currentX, currentY);
  }

  // 恢复到最后有效位置
  private revertToLastValidPosition(obj: Group): void {
    const lastValidLeft = (obj as any).lastValidLeft;
    const lastValidTop = (obj as any).lastValidTop;

    if (lastValidLeft !== undefined && lastValidTop !== undefined) {
      obj.set({
        left: lastValidLeft,
        top: lastValidTop
      });
    } else {
      // 如果没有记录的有效位置，恢复到原始位置
      const originalLeft = (obj as any).originalLeft;
      const originalTop = (obj as any).originalTop;

      if (originalLeft !== undefined && originalTop !== undefined) {
        obj.set({
          left: originalLeft,
          top: originalTop
        });
      }
    }
  }

  // 更新最后有效位置
  private updateLastValidPosition(obj: Group): void {
    (obj as any).lastValidLeft = obj.left;
    (obj as any).lastValidTop = obj.top;
  }

  // 检查从起始位置到目标位置的路径是否畅通
  private isPathClear(piece: Piece, startX: number, startY: number, endX: number, endY: number): boolean {
    // 如果起点和终点相同，路径畅通
    if (startX === endX && startY === endY) {
      return true;
    }

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // 只允许直线移动（水平或垂直）
    if (deltaX !== 0 && deltaY !== 0) {
      return false; // 不允许对角线移动
    }

    // 检查水平移动路径
    if (deltaX !== 0) {
      const direction = deltaX > 0 ? 1 : -1;
      const steps = Math.abs(deltaX);

      // 逐步检查每一步是否可以移动
      for (let step = 1; step <= steps; step++) {
        const nextX = startX + (step * direction);
        if (!this.canMoveTo(piece, nextX, startY)) {
          return false; // 路径被阻挡
        }
      }
    }

    // 检查垂直移动路径
    if (deltaY !== 0) {
      const direction = deltaY > 0 ? 1 : -1;
      const steps = Math.abs(deltaY);

      // 逐步检查每一步是否可以移动
      for (let step = 1; step <= steps; step++) {
        const nextY = startY + (step * direction);
        if (!this.canMoveTo(piece, startX, nextY)) {
          return false; // 路径被阻挡
        }
      }
    }

    return true; // 路径畅通
  }

  // 平滑缩放动画
  // 检查是否有有效的移动路径
  private hasValidMovePath(piece: Piece, startX: number, startY: number, endX: number, endY: number): boolean {
    // 如果目标位置就是起始位置，总是有效的
    if (startX === endX && startY === endY) {
      return true;
    }

    // 检查目标位置是否可以放置棋子
    if (!this.canMoveTo(piece, endX, endY)) {
      return false;
    }

    // 检查是否有从起始位置到目标位置的路径
    const path = this.findPath(piece, startX, startY, endX, endY);
    return path.length > 0;
  }

  // 寻找最近的有效位置
  private findNearestValidPosition(piece: Piece, startX: number, startY: number, targetX: number, targetY: number): { x: number, y: number } | null {
    const deltaX = targetX - startX;
    const deltaY = targetY - startY;

    // 如果目标就是起始位置，返回起始位置
    if (deltaX === 0 && deltaY === 0) {
      return { x: startX, y: startY };
    }

    // 尝试只在主要移动方向上找到最远的有效位置
    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      // 主要是水平移动
      const direction = deltaX > 0 ? 1 : -1;
      for (let step = Math.abs(deltaX); step > 0; step--) {
        const testX = startX + (step * direction);
        if (this.hasValidMovePath(piece, startX, startY, testX, startY)) {
          return { x: testX, y: startY };
        }
      }
    } else {
      // 主要是垂直移动
      const direction = deltaY > 0 ? 1 : -1;
      for (let step = Math.abs(deltaY); step > 0; step--) {
        const testY = startY + (step * direction);
        if (this.hasValidMovePath(piece, startX, startY, startX, testY)) {
          return { x: startX, y: testY };
        }
      }
    }

    // 如果没找到有效位置，返回起始位置
    return { x: startX, y: startY };
  }

  // 缓出二次方函数
  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  // ========== 教程支持方法 ==========

  // 设置教程模式
  setTutorialMode(
    enabled: boolean,
    targetPieceId?: number,
    requiredDirection?: string,
    targetPosition?: { x: number, y: number },
  ): void {
    this.tutorialMode = enabled;
    this.tutorialTargetPieceId = targetPieceId;
    this.tutorialRequiredDirection = requiredDirection;
    this.tutorialTargetPosition = targetPosition;
  }

  // 检查是否允许拖拽（教程模式下只允许拖拽目标棋子）
  private isTutorialDragAllowed(pieceId: number): boolean {
    if (!this.tutorialMode) return true;
    return !this.tutorialTargetPieceId || pieceId === this.tutorialTargetPieceId;
  }

  // 验证教程移动是否符合要求
  private validateTutorialMove(piece: Piece, direction: Direction, targetX: number, targetY: number): boolean {
    if (!this.tutorialMode || !this.tutorialRequiredDirection || !this.tutorialTargetPosition) {
      return true; // 非严格模式，允许移动
    }

    // 检查棋子是否是目标棋子
    if (this.tutorialTargetPieceId && piece.id !== this.tutorialTargetPieceId) {
      return false;
    }

    // 检查移动方向是否正确
    if (direction !== this.tutorialRequiredDirection) {
      this.showTutorialDirectionHint();
      return false;
    }

    // 检查目标位置是否正确
    if (targetX !== this.tutorialTargetPosition.x || targetY !== this.tutorialTargetPosition.y) {
      this.showTutorialPositionHint();
      return false;
    }

    return true;
  }

  // 显示方向提示
  private showTutorialDirectionHint(): void {
    console.log(`请按照教程提示向${this.getDirectionText(this.tutorialRequiredDirection!)}移动`);
    // 这里可以添加更多的视觉提示
  }

  // 显示位置提示
  private showTutorialPositionHint(): void {
    console.log('请移动到高亮显示的目标位置');
    // 这里可以添加更多的视觉提示
  }

  // 获取方向文本
  private getDirectionText(direction: string): string {
    switch (direction) {
      case 'up': return '上';
      case 'down': return '下';
      case 'left': return '左';
      case 'right': return '右';
      default: return '指定方向';
    }
  }

}
