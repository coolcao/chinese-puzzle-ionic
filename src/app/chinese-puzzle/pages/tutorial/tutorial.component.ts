import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect, inject, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';

import { ChinesePuzzleStore } from '../../chinese-puzzle.store';
import { GameManagementService } from '../../services/game-management.service';
import { tutorialLevel, tutorialSteps } from '../../data/tutorial-data';
import { Piece, Direction, TutorialStep } from '../../chinese-puzzle.type';

import { ImageLoadingService } from '../../services/image-loading.service';
import { PieceMovementService } from '../../services/piece-movement.service';
import { AudioService } from '../../services/audio.service';
import { GameStorageService } from '../../services/game-storage.service';
import { TutorialService } from '../../services/tutorial.service';
import { FabricGameService } from '../game-board-fabric/services/fabric-game.service';
import { FabricDrawingService } from '../game-board-fabric/services/fabric-drawing.service';
import { FabricInteractionService } from '../game-board-fabric/services/fabric-interaction.service';

@Component({
  selector: 'app-tutorial',
  standalone: false,
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.css'],
})
export class TutorialComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvasPC', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gameCanvasMobile', { static: false }) canvasMobileRef!: ElementRef<HTMLCanvasElement>;

  private store = inject(ChinesePuzzleStore);
  private gameManagement = inject(GameManagementService);
  public fabricGameService = inject(FabricGameService);
  private fabricDrawingService = inject(FabricDrawingService);
  private fabricInteractionService = inject(FabricInteractionService);
  private imageLoadingService = inject(ImageLoadingService);
  private pieceMovementService = inject(PieceMovementService);
  private audioService = inject(AudioService);
  private gameStorage = inject(GameStorageService);
  private tutorialService = inject(TutorialService);
  private router = inject(Router);

  Direction = Direction;

  boardWidth = this.store.boardWidth();
  boardHeight = this.store.boardHeight();

  pieces = this.store.pieces;
  boardState = this.store.board;
  finished = this.store.finished;
  isDarkMode = computed(() => this.store.settings().isDarkMode);


  steps = 0;

  // 教程相关属性
  isTutorialMode = true;
  currentTutorialStep = 0;
  tutorialSteps: TutorialStep[] = [];
  showTutorialModal = false;
  currentTutorialData: TutorialStep | null = null;
  boardLocked = false; // 棋盘锁定状态
  showBoardMask = false; // 显示棋盘蒙版
  tutorialError = ''; // 教程错误提示
  showTutorialError = false; // 显示教程错误提示

  showSuccess = false;
  showInstructions = false;
  resourceLoading = false;

  currentLevel = tutorialLevel;

  // 监听屏幕大小变化
  private resizeObserver: ResizeObserver | null = null;
  // 监听黑暗模式变化
  private darkModeMediaQuery: MediaQueryList | null = null;
  private darkModeListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    // 监听FabricGameService的cellSizeSignal变化
    effect(() => {
      const cellSize = this.fabricGameService.cellSizeSignal();
      if (cellSize > 0) {
        // 当尺寸变化时重新绘制
        this.drawBoard();
      }
    });

    // 监听游戏完成状态，锁定棋盘
    effect(() => {
      if (this.finished()) {
        this.lockBoard();
      } else {
        this.unlockBoard();
      }
    });

    // 使用 effect 监听棋盘状态变化，确保回调始终获取最新状态
    effect(() => {
      const currentBoard = this.boardState();
      // 每当棋盘状态发生变化时，重新设置回调
      if (currentBoard && currentBoard.length > 0) {
        this.fabricInteractionService.setBoardStateCallback(() => {
          return this.boardState(); // 总是返回最新的棋盘状态
        });
      }
    });

    // 设置移动回调
    this.fabricInteractionService.setMoveCallback((piece: Piece, direction: Direction, steps: number) => {
      this.handlePieceMove(piece, direction, steps);
    });
  }

  ngOnInit() {
    // 教程页面始终加载教程关卡
    this.gameManagement.loadLevel(tutorialLevel);
    this.initTutorial();

    // 在数据集更改后重新加载图片
    this.preLoadImage();
  }

  ngAfterViewInit() {
    // 初始化ResizeObserver
    this.initResizeObserver();

    // 使用setTimeout确保DOM已渲染，再尝试初始化canvas
    setTimeout(() => {
      this.initCanvas();
    }, 0);

  }

  ngOnDestroy(): void {
    this.destroyResizeObserver();
    this.fabricGameService.dispose();
  }

  // ========== 教程相关方法 ==========

  private initTutorial() {
    this.tutorialSteps = tutorialSteps;
    this.currentTutorialStep = 0;

    // 延迟开始教程，等待棋盘渲染完成
    setTimeout(() => {
      this.startTutorial();
    }, 0);
  }

  private startTutorial() {
    if (this.tutorialSteps.length > 0) {
      // 教程开始时保存初始棋子位置
      this.tutorialService.saveCurrentPiecePositions(this.pieces());
      // 教程开始时默认锁定棋盘
      this.lockTutorialBoard();
      this.showTutorialStep(0);
    }
  }

  private showTutorialStep(stepIndex: number) {
    if (stepIndex >= this.tutorialSteps.length) {
      this.completeTutorial();
      return;
    }

    this.currentTutorialStep = stepIndex;
    this.currentTutorialData = this.tutorialSteps[stepIndex];
    this.showTutorialModal = true;

    // 根据步骤类型执行不同操作
    this.handleTutorialStep(this.currentTutorialData);
  }

  private handleTutorialStep(step: TutorialStep) {
    // 启用教程服务
    this.tutorialService.enableTutorial(step);

    // 根据步骤类型控制棋盘锁定状态
    if (step.type === 'interact') {
      // 交互步骤：解锁棋盘，允许用户操作
      this.unlockTutorialBoard();
    } else {
      // 其他步骤（explain, highlight, move）：锁定棋盘，只能查看
      this.lockTutorialBoard();
    }

    switch (step.type) {
      case 'highlight':
        this.highlightElement(step);
        break;
      case 'move':
        this.demonstrateMove(step);
        break;
      case 'explain':
        // 只显示说明，不需要额外操作
        break;
      case 'interact':
        // 等待用户交互
        this.waitForUserInteraction(step);
        break;
    }
  }

  private highlightElement(step: TutorialStep) {
    // 高亮指定棋子或区域
    if (step.targetPieceId) {
      this.highlightPiece(step.targetPieceId);

      // 显示方向箭头
      if (step.showDirectionArrow && step.moveDirection) {
        const pieces = this.pieces();
        const targetPiece = pieces.find(p => p.id === step.targetPieceId);
        if (targetPiece) {
          this.fabricDrawingService.showDirectionArrow(targetPiece, step.moveDirection);
        }
      }
    } else if (step.highlightArea) {
      this.highlightArea(step.highlightArea);
    }

    // 高亮目标位置
    if (step.highlightTargetPosition && step.targetPosition) {
      // 根据棋子类型确定尺寸
      let width = 1, height = 1;
      if (step.targetPieceId) {
        const pieces = this.pieces();
        const targetPiece = pieces.find(p => p.id === step.targetPieceId);
        if (targetPiece) {
          width = targetPiece.width;
          height = targetPiece.height;
        }
      }
      this.fabricDrawingService.highlightTargetPosition(step.targetPosition, width, height);
    }
  }

  private highlightPiece(pieceId: number) {
    // 在fabric canvas上高亮指定棋子
    const pieces = this.pieces();
    const targetPiece = pieces.find(p => p.id === pieceId);
    if (targetPiece) {
      this.fabricDrawingService.highlightPiece(targetPiece);
    }
  }

  private highlightArea(area: { x: number, y: number, width: number, height: number }) {
    // 在fabric canvas上高亮指定区域
    this.fabricDrawingService.highlightArea(area);
  }

  private demonstrateMove(step: TutorialStep) {
    // 演示移动操作
    if (step.targetPieceId && step.moveDirection) {
      const pieces = this.pieces();
      const targetPiece = pieces.find(p => p.id === step.targetPieceId);
      if (targetPiece) {
        // 执行移动动画
        this.handlePieceMove(targetPiece, step.moveDirection, 1);
      }
    }
  }

  private waitForUserInteraction(step: TutorialStep) {
    // 对于交互步骤，同时显示高亮、箭头和目标位置
    this.highlightElement(step);
    // 教程服务已经在 handleTutorialStep 中启用，无需额外设置
  }

  // 验证教程移动是否符合要求（使用TutorialService）
  private validateTutorialMove(piece: Piece, direction: Direction): boolean {
    const result = this.tutorialService.validateTutorialMove(piece, direction);

    if (!result.isValid && result.errorMessage) {
      this.showTutorialErrorMessage(result.errorMessage);
    }

    return result.isValid;
  }

  // 显示教程错误提示
  private showTutorialErrorMessage(message: string) {
    this.tutorialError = message;
    this.showTutorialError = true;

    // 播放错误音效
    this.audioService.playFailSound();

    // 3秒后自动隐藏错误提示
    setTimeout(() => {
      this.hideTutorialError();
    }, 3000);
  }

  // 隐藏教程错误提示
  hideTutorialError() {
    this.showTutorialError = false;
    this.tutorialError = '';
  }


  // 强制恢复指定棋子的视觉位置（立即生效）
  private forceRestorePieceVisualPosition(piece: Piece) {
    const savedPosition = this.tutorialService.getSavedPosition(piece.id);
    if (savedPosition) {
      // 恢复到保存的位置
      const restoredPiece = { ...piece, x: savedPosition.x, y: savedPosition.y };

      // 立即更新 Fabric 中的棋子视觉位置
      this.fabricDrawingService.updatePiecePosition(restoredPiece);
    } else {
      // 如果没有保存的位置，强制更新棋子位置
      this.fabricDrawingService.updatePiecePosition(piece);
    }

    // 确保棋子交互状态正确
    this.ensurePieceInteractivity(piece.id);

    // 强制渲染
    this.fabricGameService.renderCanvas();
  }

  // 确保指定棋子的交互状态正确
  private ensurePieceInteractivity(pieceId: number) {
    if (!this.fabricGameService.canvas) return;

    // 获取Fabric中对应的棋子对象
    const fabricObjects = this.fabricGameService.canvas.getObjects();
    const targetObject = fabricObjects.find((obj: any) => obj.pieceId === pieceId);

    if (targetObject) {
      // 强制重置交互状态
      targetObject.set({
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: false,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true
      });

      // 如果对象当前被选中，取消选中以重置状态
      if (this.fabricGameService.canvas.getActiveObject() === targetObject) {
        this.fabricGameService.canvas.discardActiveObject();
      }
    }
  }

  // 检查教程进度
  private checkTutorialProgress(movedPiece: Piece) {
    const currentStep = this.currentTutorialData;
    if (!currentStep || !currentStep.waitForUser) return;

    // 清除任何错误提示
    this.hideTutorialError();

    // 检查是否移动了目标棋子
    if (currentStep.targetPieceId && movedPiece.id === currentStep.targetPieceId) {
      // 验证是否到达了目标位置
      if (this.checkTargetPositionReached(movedPiece, currentStep)) {
        // 用户完成了要求的操作，自动进入下一步
        setTimeout(() => {
          this.nextTutorialStep();
        }, 1000); // 延迟1秒让用户看到操作结果
      }
      // 如果没有到达目标位置，什么都不做，等待用户继续移动
    } else if (!currentStep.targetPieceId) {
      // 没有指定目标棋子，任何移动都算完成
      setTimeout(() => {
        this.nextTutorialStep();
      }, 1000);
    }
  }

  // 检查棋子是否到达了目标位置（使用TutorialService）
  private checkTargetPositionReached(piece: Piece, step: TutorialStep): boolean {
    return this.tutorialService.checkTargetPositionReached(piece);
  }

  nextTutorialStep() {
    this.showTutorialModal = false;
    this.fabricDrawingService.clearHighlights();
    // 清除教程错误提示
    this.hideTutorialError();

    setTimeout(() => {
      this.showTutorialStep(this.currentTutorialStep + 1);
    }, 500);
  }

  skipTutorial() {
    this.showTutorialModal = false;
    this.fabricDrawingService.clearHighlights();
    // 清除教程错误提示
    this.hideTutorialError();
    // 解锁棋盘并隐藏蒙版
    this.unlockTutorialBoard();
    this.showBoardMask = false;
    this.completeTutorial();
  }


  private async completeTutorial() {
    this.isTutorialMode = false;
    this.showTutorialModal = false;
    this.fabricDrawingService.clearHighlights();

    // 禁用教程服务
    this.tutorialService.disableTutorial();

    // 解锁棋盘并隐藏蒙版
    this.unlockTutorialBoard();
    this.showBoardMask = false;

    // 标记教程已完成
    await this.gameStorage.markTutorialCompleted();

    // 显示完成提示
    this.audioService.playSuccessSound();

    // 跳转到关卡选择页面
    setTimeout(() => {
      this.router.navigate(['/levels']);
    }, 2000);
  }

  // 初始化Canvas
  private initCanvas() {
    const canvasElement = this.getCurrentCanvas();
    if (canvasElement) {
      this.fabricGameService.initCanvas(canvasElement);
      this.fabricInteractionService.initInteractions();
      this.resizeObserver?.observe(canvasElement);
      // 立即更新单元格尺寸并绘制
      this.updateCellSize();
      this.drawBoard();
    } else {
      // 如果还是没有找到canvas元素，稍后再尝试
      setTimeout(() => this.initCanvas(), 100);
    }
  }

  // 获取当前应该使用的canvas元素
  private getCurrentCanvas(): HTMLCanvasElement | null {
    const viewportWidth = window.innerWidth;
    const isPC = viewportWidth >= 1024; // lg断点

    let canvasElement: HTMLCanvasElement | null = null;
    if (isPC && this.canvasRef?.nativeElement) {
      canvasElement = this.canvasRef.nativeElement;
    } else if (!isPC && this.canvasMobileRef?.nativeElement) {
      canvasElement = this.canvasMobileRef.nativeElement;
    } else {
      // fallback到任一可用的canvas
      canvasElement = this.canvasRef?.nativeElement || this.canvasMobileRef?.nativeElement || null;
    }

    // 如果根据屏幕尺寸应该使用的canvas元素不存在，尝试获取任何可用的canvas元素
    if (!canvasElement) {
      canvasElement = this.canvasRef?.nativeElement || this.canvasMobileRef?.nativeElement || null;
    }

    return canvasElement;
  }

  // 初始化屏幕大小监听
  private initResizeObserver() {
    let resizeTimeout: any;

    // 防抖处理resize事件
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleCanvasResize();
      }, 150); // 150ms 防抖延迟
    };

    // 监听resize事件
    window.addEventListener('resize', handleResize);

    // 使用ResizeObserver监听元素大小变化
    this.resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    // 监听黑暗模式变化
    if (window.matchMedia) {
      this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.darkModeListener = (e: MediaQueryListEvent) => {
        // 重新绘制棋盘以适配新的主题
        this.drawBoard();
      };
      this.darkModeMediaQuery.addEventListener('change', this.darkModeListener);
    }
  }

  // 处理Canvas大小变化
  private handleCanvasResize() {
    const currentCanvas = this.getCurrentCanvas();
    if (!currentCanvas) {
      return;
    }

    // 检查是否需要切换Canvas（PC/移动端）
    const viewportWidth = window.innerWidth;
    const isPC = viewportWidth >= 1024;
    const shouldUsePC = isPC && this.canvasRef?.nativeElement;
    const shouldUseMobile = !isPC && this.canvasMobileRef?.nativeElement;

    // 获取当前正在使用的Canvas类型
    const currentlyUsingPC = this.fabricGameService.canvas?.getElement() === this.canvasRef?.nativeElement;
    const currentlyUsingMobile = this.fabricGameService.canvas?.getElement() === this.canvasMobileRef?.nativeElement;

    // 如果需要切换Canvas类型，重新初始化
    if ((shouldUsePC && !currentlyUsingPC) || (shouldUseMobile && !currentlyUsingMobile)) {
      this.reinitializeCanvas();
    } else {
      // 只是尺寸变化，更新尺寸并重新绘制
      this.updateCanvasSizeAndRedraw();
    }
  }

  // 重新初始化Canvas（用于PC/移动端切换）
  private reinitializeCanvas() {
    // 保存当前棋子状态
    const currentPieces = this.pieces();

    // 销毁当前Canvas
    this.fabricGameService.dispose();

    // 重新初始化
    setTimeout(() => {
      this.initCanvas();
      // 确保棋子重新绘制
      setTimeout(() => {
        this.drawBoard();
      }, 50);
    }, 50);
  }

  // 更新Canvas尺寸并重新绘制
  private updateCanvasSizeAndRedraw() {
    // 更新单元格尺寸
    this.updateCellSize();

    // 重新绘制棋盘和棋子
    this.drawBoard();
  }

  // 组件销毁时清理监听器
  private destroyResizeObserver() {
    window.removeEventListener('resize', () => { });
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // 清理黑暗模式监听器
    if (this.darkModeMediaQuery && this.darkModeListener) {
      this.darkModeMediaQuery.removeEventListener('change', this.darkModeListener);
      this.darkModeListener = null;
      this.darkModeMediaQuery = null;
    }
  }

  // 更新单元格尺寸
  private updateCellSize() {
    const canvasElement = this.getCurrentCanvas();
    if (!canvasElement) {
      return;
    }

    this.fabricGameService.updateCellSize(canvasElement);
  }

  // 绘制棋盘
  private drawBoard() {
    if (!this.fabricGameService.canvas) {
      return;
    }

    // 检查是否是黑暗模式
    const isDarkMode = this.isDarkMode();

    // 清空画布
    this.fabricGameService.clearCanvas();

    // 绘制棋盘背景和边框
    this.fabricDrawingService.drawBoard(isDarkMode);

    // 绘制所有棋子
    this.pieces().forEach(piece => {
      const pieceGroup = this.fabricDrawingService.createPieceGroup(piece, isDarkMode);
      this.fabricGameService.addPieceObject(piece.id, pieceGroup);
      this.fabricGameService.canvas!.add(pieceGroup);
    });

    // 渲染画布
    this.fabricGameService.renderCanvas();

    // 绘制完成后，根据游戏状态应用锁定
    if (this.finished()) {
      this.lockBoard();
    } else if (this.isTutorialMode) {
      // 教程模式下，根据当前步骤类型应用锁定状态
      if (this.boardLocked) {
        this.lockTutorialBoard();
      } else {
        this.unlockTutorialBoard();
      }
    }
  }


  // 处理棋子移动（支持多步移动）
  private handlePieceMove(piece: Piece, direction: Direction, steps: number) {
    // 在教程模式下，保存移动前的位置
    if (this.isTutorialMode) {
      this.tutorialService.saveCurrentPiecePositions(this.pieces());
    }

    // 教程模式下的严格验证
    if (this.tutorialService.isStrictInteractionStep()) {
      const isValidMove = this.validateTutorialMove(piece, direction);
      if (!isValidMove) {
        // 处理验证失败
        this.tutorialService.handleValidationError();

        // 验证失败，立即强制恢复 Fabric 中的棋子位置
        this.forceRestorePieceVisualPosition(piece);

        return; // 阻止移动并已显示提示
      }
    }

    let currentPiece = piece;
    let totalStepsMoved = 0;

    // 执行多步移动
    for (let step = 0; step < steps; step++) {
      if (this.pieceMovementService.canMove(currentPiece, direction, this.boardState(), this.boardWidth, this.boardHeight)) {
        const moveResult = this.pieceMovementService.movePiece(currentPiece, direction, this.boardState(), this.boardWidth, this.boardHeight);
        if (moveResult) {
          // 更新状态
          this.store.updatePiece(moveResult.updatedPiece);
          this.store.updateBoard(moveResult.updatedBoardState);
          this.steps += 1;
          totalStepsMoved += 1;
          currentPiece = moveResult.updatedPiece;

          // 教程模式下检查是否完成了要求的操作
          if (this.isTutorialMode && this.currentTutorialData?.waitForUser) {
            this.checkTutorialProgress(currentPiece);
          }

        } else {
          break;
        }
      } else {
        break;
      }
    }

    // 如果至少移动了一步，更新 Fabric 中的棋子位置
    if (totalStepsMoved > 0) {
      // 播放移动音效
      this.audioService.playWoodSound();

      // 使用 FabricDrawingService 的动画方法更新位置
      this.fabricDrawingService.updatePiecePosition(currentPiece);

      // 通知交互服务移动已完成（用于路径执行）
      this.fabricInteractionService.notifyMoveCompleted(currentPiece);

      // 教程模式下，成功移动后更新保存的位置
      if (this.isTutorialMode) {
        this.tutorialService.saveCurrentPiecePositions(this.pieces());
        // 清除错误处理状态，允许后续操作
        this.tutorialService.clearErrorState();
      }
    } else {
      // 播放失败音效
      this.audioService.playFailSound();
    }
  }


  // 触摸移动事件
  onTouchMove(event: TouchEvent) {
    // 阻止页面滚动
    event.preventDefault();
  }

  // 返回到关卡选择页面
  goToLevelSelect() {
    this.audioService.playClickSound();
    this.router.navigate(['levels'], { replaceUrl: true });
  }

  private preLoadImage() {
    // 设置加载状态
    this.resourceLoading = true;

    // 获取当前最新的棋子数据
    const currentPieces = this.pieces();

    this.imageLoadingService.preLoadImage(currentPieces).then(result => {
      // 图片加载完成后重新绘制棋盘
      this.resourceLoading = false;
      // 等待一帧后重新绘制，确保状态更新
      requestAnimationFrame(() => {
        this.drawBoard();
      });
    });
  }

  // 锁定棋盘，禁止操作
  private lockBoard() {
    if (this.fabricGameService.canvas) {
      this.fabricGameService.canvas.selection = false;
      this.fabricGameService.canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
      this.fabricGameService.canvas.renderAll();
    }
  }

  // 解锁棋盘，允许操作
  private unlockBoard() {
    if (this.fabricGameService.canvas) {
      this.fabricGameService.canvas.selection = false; // 保持不允许多选
      this.fabricGameService.canvas.forEachObject((obj) => {
        obj.selectable = true;
        obj.evented = true;
      });
      this.fabricGameService.canvas.renderAll();
    }
  }

  // 教程专用：锁定棋盘
  private lockTutorialBoard() {
    this.boardLocked = true;
    this.showBoardMask = true; // 显示蒙版
    if (this.fabricGameService.canvas) {
      this.fabricGameService.canvas.selection = false;
      this.fabricGameService.canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
      this.fabricGameService.canvas.renderAll();
    }
  }

  // 教程专用：解锁棋盘
  private unlockTutorialBoard() {
    this.boardLocked = false;
    this.showBoardMask = false; // 隐藏蒙版
    if (this.fabricGameService.canvas) {
      this.fabricGameService.canvas.selection = false; // 保持不允许多选
      this.fabricGameService.canvas.forEachObject((obj) => {
        obj.selectable = true;
        obj.evented = true;
      });
      this.fabricGameService.canvas.renderAll();
    }
  }

  // 监听键盘事件
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.goToLevelSelect();
    }
  }
}
