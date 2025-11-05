import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect, inject, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { timer, interval, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { ChinesePuzzleStore } from '../../chinese-puzzle.store';
import { GameManagementService } from '../../services/game-management.service';
import { Piece, Direction, GameStep, Position } from '../../chinese-puzzle.type';
import { ImageLoadingService } from '../../services/image-loading.service';
import { PieceMovementService } from '../../services/piece-movement.service';
import { AudioService } from '../../services/audio.service';
import { GameStorageService } from '../../services/game-storage.service';
import { LevelStateService } from '../../services/level-state.service';
import { FabricGameService } from './services/fabric-game.service';
import { FabricDrawingService } from './services/fabric-drawing.service';
import { FabricInteractionService } from './services/fabric-interaction.service';

@Component({
  selector: 'app-game-board-fabric',
  standalone: false,
  templateUrl: './game-board-fabric.component.html',
  styleUrls: ['./game-board-fabric.component.css'],
})
export class GameBoardFabricComponent implements OnInit, AfterViewInit, OnDestroy {
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
  private levelStateService = inject(LevelStateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);

  Direction = Direction;

  boardWidth = this.store.boardWidth();
  boardHeight = this.store.boardHeight();

  // 获取当前语言
  get currentLanguage(): string {
    return this.translate.currentLang || 'zh';
  }

  dataSetNames = this.store.dataSetNames;
  dataSetName = this.store.dataSetName;

  pieces = this.store.pieces;
  boardState = this.store.board;
  finished = this.store.finished;
  isDarkMode = computed(() => this.store.settings().isDarkMode);


  steps = signal(0);

  showSuccess = signal(false);
  showInstructions = signal(false);
  resourceLoading = signal(false);
  showCompletionModal = signal(false);

  // 防止关卡刚加载时就触发完成效果
  private isLevelJustLoaded = true;

  // 计时器相关
  private gameTime = signal(0); // 游戏时间（秒）
  private gameStartTime = signal<number | null>(null);
  private timerSubscription: Subscription | null = null;
  private isGameStarted = signal(false);

  // 操作步骤记录
  private gameSteps: GameStep[] = [];
  private currentStepNumber = signal(0);

  currentLevel = this.store.currentLevel;

  // 监听屏幕大小变化
  private resizeObserver: ResizeObserver | null = null;
  // 监听黑暗模式变化
  private darkModeMediaQuery: MediaQueryList | null = null;
  private darkModeListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    effect(() => {
      // 只有在关卡加载完成且用户确实进行了移动后才触发完成效果
      if (this.finished() && !this.isLevelJustLoaded && this.steps() > 0) {
        // 停止计时器
        this.stopTimer();

        // 播放成功音效
        this.audioService.playSuccessSound();

        // 保存游戏进度，包含步数和时间
        const currentLevel = this.currentLevel();
        if (currentLevel) {
          // 保存到历史记录
          this.saveGameHistory();
          
          // 保存游戏进度并处理关卡解锁
          this.saveGameProgressAndUnlock(currentLevel.id, this.steps(), this.gameTime());
        }

        // 显示完成Modal
        this.showCompletionModal.set(true);
        // 同时显示撒花效果
        this.showSuccess.set(true);
        timer(2500).subscribe(() => {
          this.showSuccess.set(false);
        });
      }
    });

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

  async ngOnInit() {
    if (!(await this.gameStorage.isTutorialCompleted())) {
      this.router.navigate([''], { replaceUrl: true });
      return;
    }

    // 重置步数和关卡加载标志
    this.steps.set(0);
    this.isLevelJustLoaded = true;
    // 重置计时器
    this.resetTimer();
    // 重置操作步骤记录
    this.resetGameSteps();

    // 从查询参数中获取关卡ID
    this.route.queryParams.subscribe(params => {
      const levelId = params['levelId'];

      if (levelId) {
        // URL中指定了关卡，先加载设置，然后手动切换到指定关卡
        const decodedLevelId = decodeURIComponent(levelId);
        this.gameManagement.loadSettings().then(() => {
          this.gameManagement.changeLevel(decodedLevelId);
        });
      } else {
        // 如果没有指定关卡，恢复最近关卡
        this.gameManagement.restoreLastLevel();
      }

      // 在数据集更改后重新加载图片
      this.preLoadImage().then(() => {
        console.log("Image loading completed");
        // 等待一帧后重新绘制，确保状态更新
        requestAnimationFrame(() => {
          this.drawBoard();
          // 图片加载完成后重新绘制棋盘
          this.resourceLoading.set(false);
        });
      });
    });
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
    this.stopTimer();
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
    }
  }


  // 处理棋子移动（支持多步移动）
  private handlePieceMove(piece: Piece, direction: Direction, steps: number) {
    const operationStartTime = Date.now();
    const originalPosition: Position = { x: piece.x, y: piece.y };

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
          this.steps.update(steps => steps + 1);
          totalStepsMoved += 1;
          currentPiece = moveResult.updatedPiece;

          // 第一次移动时标记关卡已开始游戏
          if (this.isLevelJustLoaded) {
            this.isLevelJustLoaded = false;
          }

          // 第一次有效移动时启动计时器
          if (!this.isGameStarted()) {
            this.startTimer();
          }

        } else {
          break;
        }
      } else {
        break;
      }
    }

    // 如果至少移动了一步，更新 Fabric 中的棋子位置并记录操作步骤
    if (totalStepsMoved > 0) {
      const finalPosition: Position = { x: currentPiece.x, y: currentPiece.y };

      // 记录操作步骤
      this.recordGameStep(piece, originalPosition, finalPosition, direction, operationStartTime);

      // 播放移动音效
      this.audioService.playWoodSound();

      // 使用 FabricDrawingService 的动画方法更新位置
      this.fabricDrawingService.updatePiecePosition(currentPiece);

      // 通知交互服务移动已完成（用于路径执行）
      this.fabricInteractionService.notifyMoveCompleted(currentPiece);
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

  changeDataSet(dataSetName: string) {
    this.audioService.playClickSound();
    this.gameManagement.changeLevel(dataSetName);
    this.steps.set(0);
    // 重置关卡加载标志
    this.isLevelJustLoaded = true;
    // 重置计时器
    this.resetTimer();
    // 重置操作步骤记录
    this.resetGameSteps();
    // 直接重新绘制棋盘即可
    Promise.resolve().then(() => {
      this.drawBoard();
    });
  }

  // 返回到关卡选择页面
  goToLevelSelect() {
    this.audioService.playClickSound();
    this.router.navigate(['levels'], { replaceUrl: true });
  }

  // 切换说明显示状态
  toggleInstructions() {
    this.showInstructions.set(!this.showInstructions());
  }

  onDataSetChange(dataSetName: string) {
    this.changeDataSet(dataSetName);
  }

  private async preLoadImage() {
    // 设置加载状态
    this.resourceLoading.set(true);
    // 获取当前最新的棋子数据
    const currentPieces = this.pieces();
    await this.imageLoadingService.preLoadImage(currentPieces);
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

  // 前往下一关
  goToNextLevel() {
    this.audioService.playClickSound();
    const currentNames = this.dataSetNames();
    const currentName = this.dataSetName();
    const currentIndex = currentNames.indexOf(currentName);

    if (currentIndex < currentNames.length - 1) {
      const nextLevel = currentNames[currentIndex + 1];
      this.router.navigate(['game-board-fabric'], {
        queryParams: { level: nextLevel },
        replaceUrl: true
      });
    }
  }

  // 重新开始当前关卡
  restartGame() {
    this.audioService.playClickSound();
    const currentLevel = this.currentLevel();
    if (currentLevel) {
      // 重置游戏状态
      this.steps.set(0);
      this.isLevelJustLoaded = true;
      this.resetTimer();
      // 重置操作步骤记录
      this.resetGameSteps();

      // 重新加载当前关卡
      this.gameManagement.changeLevel(currentLevel.id);

      // 重新绘制棋盘并启动计时器
      Promise.resolve().then(() => {
        this.drawBoard();
        this.startTimer();
      });
    }
  }

  // 检查是否有下一关
  hasNextLevel(): boolean {
    const currentNames = this.dataSetNames();
    const currentName = this.dataSetName();
    const currentIndex = currentNames.indexOf(currentName);

    return currentIndex < currentNames.length - 1;
  }

  // 关闭完成Modal
  closeCompletionModal() {
    this.audioService.playClickSound();
    this.showCompletionModal.set(false);

    // 关闭Modal后，确保游戏状态仍然锁定（如果游戏已完成）
    setTimeout(() => {
      if (this.finished()) {
        this.lockBoard();
      }
    }, 0);
  }

  // 处理Modal遮罩点击
  onModalBackdropClick(event: Event) {
    // 点击遮罩时关闭Modal
    this.closeCompletionModal();
  }

  // 开始计时器
  private startTimer() {
    if (this.isGameStarted()) {
      return; // 避免重复启动
    }

    this.isGameStarted.set(true);
    this.gameStartTime.set(Date.now());
    this.gameTime.set(0);


    // 每秒更新一次游戏时间
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.gameStartTime()) {
        this.gameTime.set(Math.floor((Date.now() - this.gameStartTime()!) / 1000));
      }
    });
  }

  // 停止计时器
  private stopTimer() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
    this.isGameStarted.set(false);
  }

  // 重置计时器
  private resetTimer() {
    this.stopTimer();
    this.gameTime.set(0);
    this.gameStartTime.set(null);
    this.isGameStarted.set(false);
  }

  // 重置操作步骤记录
  private resetGameSteps() {
    this.gameSteps = [];
    this.currentStepNumber.set(0);
  }


  // 记录操作步骤
  private recordGameStep(piece: Piece, fromPosition: Position, toPosition: Position, direction: Direction, operationStartTime: number) {
    if (!this.gameStartTime) return;

    const now = Date.now();
    const step: GameStep = {
      stepNumber: this.currentStepNumber() + 1,
      timestamp: now - this.gameStartTime()!,
      pieceId: piece.id,
      pieceName: piece.name,
      fromPosition: { ...fromPosition },
      toPosition: { ...toPosition },
      direction,
      distance: this.calculateDistance(fromPosition, toPosition, direction),
      duration: now - operationStartTime
    };

    this.gameSteps.push(step);
    console.log('记录操作步骤:', step);
  }

  // 计算移动距离
  private calculateDistance(from: Position, to: Position, direction: Direction): number {
    switch (direction) {
      case Direction.Up:
      case Direction.Down:
        return Math.abs(to.y - from.y);
      case Direction.Left:
      case Direction.Right:
        return Math.abs(to.x - from.x);
      default:
        return 0;
    }
  }

  // 格式化时间显示 (MM:SS)
  getFormattedTime(): string {
    const minutes = Math.floor(this.gameTime()! / 60);
    const seconds = this.gameTime()! % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // 保存游戏历史记录
  private async saveGameHistory() {
    try {
      const currentLevel = this.currentLevel();
      if (!currentLevel) {
        return;
      }

      await this.gameStorage.saveGameHistory(
        currentLevel.id,
        this.steps(),
        this.gameTime(),
        this.gameSteps
      );

      console.log('Game history saved with steps:', {
        levelId: currentLevel.id,
        steps: this.steps,
        time: this.gameTime,
        gameStepsCount: this.gameSteps.length
      });
    } catch (error) {
      console.error('Failed to save game history:', error);
    }
  }

  // 保存游戏进度并处理关卡解锁
  private async saveGameProgressAndUnlock(levelId: string, steps: number, time: number) {
    try {
      // 保存游戏进度
      await this.gameStorage.saveProgress(levelId, steps, time);
      
      // 处理关卡解锁逻辑
      const nextLevelId = await this.levelStateService.completeLevel(levelId);
      
      if (nextLevelId) {
        console.log(`🎉 关卡 "${levelId}" 完成，已解锁下一关: "${nextLevelId}"`);
      } else {
        console.log(`🏆 恭喜！你已完成关卡 "${levelId}"`);
      }
    } catch (error) {
      console.error('保存进度和处理解锁失败:', error);
    }
  }

  // 获取完成评价
  getCompletionRating(): string {
    const steps = this.steps;
    const currentLevel = this.currentLevel();

    // 获取关卡的实际最优步数，如果没有则使用基于难度的默认值
    const optimalSteps = currentLevel?.minSteps || this.getDefaultThresholdByDifficulty(currentLevel?.difficulty);

    // 计算步数与最优步数的比率
    const efficiency = steps() / optimalSteps;

    let ratingKey: string;
    if (efficiency <= 1.05) {
      ratingKey = 'rating.perfect';
    } else if (efficiency <= 1.4) {
      ratingKey = 'rating.excellent';
    } else if (efficiency <= 1.6) {
      ratingKey = 'rating.good';
    } else {
      ratingKey = 'rating.needImprovement';
    }

    // 打印评分详情（用于调试）
    const rating = this.translate.instant(ratingKey);
    console.log('🏆 评分详情:', {
      实际步数: steps,
      最优步数: optimalSteps,
      效率比: (efficiency * 100).toFixed(1) + '%',
      星级评价: rating,
      关卡信息: {
        id: currentLevel?.id,
        difficulty: currentLevel?.difficulty,
        configuredMinSteps: currentLevel?.minSteps
      }
    });

    return this.translate.instant(ratingKey);
  }

  // 根据难度获取默认阈值（当关卡没有minSteps时使用）
  private getDefaultThresholdByDifficulty(difficulty?: string): number {
    switch (difficulty) {
      case 'easy':
        return 80;
      case 'medium':
        return 120;
      case 'hard':
        return 180;
      default:
        return 120;
    }
  }

  // 获取当前游戏的操作步骤（用于外部访问）
  getGameSteps(): GameStep[] {
    return [...this.gameSteps];
  }


  // 演示：打印详细的操作步骤（开发调试用）
  printGameSteps() {
    console.log('=== 游戏操作步骤详情 ===');
    console.log('关卡ID:', this.currentLevel()?.id);
    console.log('总步数:', this.gameSteps.length);
    console.log('总时间:', this.gameTime, '秒');

    this.gameSteps.forEach((step, index) => {
      console.log(`步骤 ${step.stepNumber}:`, {
        棋子: step.pieceName,
        从: `(${step.fromPosition.x}, ${step.fromPosition.y})`,
        到: `(${step.toPosition.x}, ${step.toPosition.y})`,
        方向: step.direction,
        距离: step.distance,
        耗时: step.duration + 'ms',
        时间戳: step.timestamp + 'ms'
      });
    });
  }

  // 监听键盘事件
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.showCompletionModal()) {
      this.closeCompletionModal();
    }

    // 开发调试：按F12打印操作步骤
    if (event.key === 'F12' && this.gameSteps.length > 0) {
      event.preventDefault();
      this.printGameSteps();
    }
  }
}
