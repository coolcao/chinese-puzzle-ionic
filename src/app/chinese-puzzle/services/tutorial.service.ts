import { Injectable, inject } from '@angular/core';
import { Piece, Direction, TutorialStep } from '../chinese-puzzle.type';
import { PieceMovementService } from './piece-movement.service';
import { AudioService } from './audio.service';

export interface TutorialValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  
  private readonly pieceMovementService = inject(PieceMovementService);
  private readonly audioService = inject(AudioService);

  // 教程状态
  private isEnabled = false;
  private currentStep: TutorialStep | null = null;
  private savedPiecePositions: Map<number, {x: number, y: number}> = new Map();
  private isProcessingError = false;

  constructor() { }

  // ========== 教程状态管理 ==========

  /**
   * 启用教程模式
   */
  enableTutorial(step: TutorialStep): void {
    this.isEnabled = true;
    this.currentStep = step;
    this.isProcessingError = false;
  }

  /**
   * 禁用教程模式
   */
  disableTutorial(): void {
    this.isEnabled = false;
    this.currentStep = null;
    this.savedPiecePositions.clear();
    this.isProcessingError = false;
  }

  /**
   * 检查是否启用了教程模式
   */
  isTutorialEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 获取当前教程步骤
   */
  getCurrentStep(): TutorialStep | null {
    return this.currentStep;
  }

  /**
   * 检查是否为交互步骤且启用了严格模式
   */
  isStrictInteractionStep(): boolean {
    return this.isEnabled && 
           this.currentStep?.type === 'interact' && 
           this.currentStep?.strictMovement === true;
  }

  // ========== 位置管理 ==========

  /**
   * 保存所有棋子的当前位置
   */
  saveCurrentPiecePositions(pieces: Piece[]): void {
    this.savedPiecePositions.clear();
    pieces.forEach(piece => {
      this.savedPiecePositions.set(piece.id, { x: piece.x, y: piece.y });
    });
  }

  /**
   * 获取棋子的保存位置
   */
  getSavedPosition(pieceId: number): {x: number, y: number} | undefined {
    return this.savedPiecePositions.get(pieceId);
  }

  // ========== 验证逻辑 ==========

  /**
   * 验证教程移动是否符合要求
   */
  validateTutorialMove(piece: Piece, direction: Direction): TutorialValidationResult {
    if (!this.isStrictInteractionStep()) {
      return { isValid: true };
    }

    // 防止快速连续的错误操作
    if (this.isProcessingError) {
      return { isValid: false };
    }

    // 验证棋子ID
    const pieceValidation = this.validateTargetPiece(piece);
    if (!pieceValidation.isValid) {
      return pieceValidation;
    }

    // 验证移动方向
    const directionValidation = this.validateMoveDirection(direction);
    if (!directionValidation.isValid) {
      return directionValidation;
    }

    return { isValid: true };
  }

  /**
   * 验证是否移动了正确的棋子
   */
  private validateTargetPiece(piece: Piece): TutorialValidationResult {
    if (!this.currentStep?.targetPieceId) {
      return { isValid: true };
    }

    if (piece.id !== this.currentStep.targetPieceId) {
      return {
        isValid: false,
        errorMessage: `请移动指定的棋子，不是其他棋子！`
      };
    }

    return { isValid: true };
  }

  /**
   * 验证移动方向
   */
  private validateMoveDirection(direction: Direction): TutorialValidationResult {
    if (!this.currentStep?.moveDirection) {
      return { isValid: true };
    }

    if (direction !== this.currentStep.moveDirection) {
      const directionNames = {
        [Direction.Up]: '向上',
        [Direction.Down]: '向下',
        [Direction.Left]: '向左',
        [Direction.Right]: '向右'
      };

      return {
        isValid: false,
        errorMessage: `请按照提示${directionNames[this.currentStep.moveDirection]}移动，不是${directionNames[direction]}！`
      };
    }

    return { isValid: true };
  }

  /**
   * 检查棋子是否到达了目标位置
   */
  checkTargetPositionReached(piece: Piece): boolean {
    if (!this.currentStep?.targetPosition) {
      // 如果没有指定目标位置，只要移动了就算完成
      return true;
    }

    // 检查棋子当前位置是否与目标位置一致
    const reachedTarget = piece.x === this.currentStep.targetPosition.x && 
                         piece.y === this.currentStep.targetPosition.y;
    
    if (!reachedTarget) {
      console.log(`教程：棋子 ${piece.name} 当前位置 (${piece.x}, ${piece.y})，目标位置 (${this.currentStep.targetPosition.x}, ${this.currentStep.targetPosition.y})`);
    }
    
    return reachedTarget;
  }

  // ========== 错误处理 ==========

  /**
   * 处理验证失败
   */
  handleValidationError(): void {
    this.isProcessingError = true;
    this.audioService.playFailSound();
    
    // 500ms后允许新的操作
    setTimeout(() => {
      this.isProcessingError = false;
    }, 500);
  }

  /**
   * 清除错误处理状态
   */
  clearErrorState(): void {
    this.isProcessingError = false;
  }

  // ========== 基础棋子ID验证（供Fabric层使用）==========

  /**
   * 基础验证：只检查棋子ID（供Fabric层快速过滤使用）
   */
  isTargetPieceForDrag(pieceId: number): boolean {
    if (!this.isEnabled || !this.currentStep?.targetPieceId) {
      return true; // 非教程模式或无限制，允许拖拽
    }

    return pieceId === this.currentStep.targetPieceId;
  }
}