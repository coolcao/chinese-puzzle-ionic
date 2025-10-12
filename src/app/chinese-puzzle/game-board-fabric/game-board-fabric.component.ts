import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { timer } from 'rxjs';

import { ChinesePuzzleStore } from '../chinese-puzzle.store';
import { Piece, Direction } from '../chinese-puzzle.type';
import { ImageLoadingService } from '../services/image-loading.service';
import { PieceMovementService } from '../services/piece-movement.service';
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
  public fabricGameService = inject(FabricGameService);
  private fabricDrawingService = inject(FabricDrawingService);
  private fabricInteractionService = inject(FabricInteractionService);
  private imageLoadingService = inject(ImageLoadingService);
  private pieceMovementService = inject(PieceMovementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  Direction = Direction;

  boardWidth = this.store.boardWidth();
  boardHeight = this.store.boardHeight();

  dataSetNames = this.store.dataSetNames;
  dataSetName = this.store.dataSetName;

  pieces = this.store.pieces;
  boardState = this.store.board;
  finished = this.store.finished;
  isDarkMode = this.store.isDarkMode;


  steps = 0;

  showSuccess = false;
  showInstructions = false;
  resourceLoading = false;
  showCompletionModal = false;

  currentLevel = this.store.currentLevel;

  // 监听屏幕大小变化
  private resizeObserver: ResizeObserver | null = null;
  // 监听黑暗模式变化
  private darkModeMediaQuery: MediaQueryList | null = null;
  private darkModeListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    effect(() => {
      if (this.finished()) {
        // 显示完成Modal
        this.showCompletionModal = true;
        // 同时显示撒花效果
        this.showSuccess = true;
        timer(2500).subscribe(() => {
          this.showSuccess = false;
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

    // 设置移动回调
    this.fabricInteractionService.setMoveCallback((piece: Piece, direction: Direction, steps: number) => {
      this.handlePieceMove(piece, direction, steps);
    });

    // 设置棋盘状态回调
    this.fabricInteractionService.setBoardStateCallback(() => {
      return this.boardState();
    });
  }

  ngOnInit() {
    // 从查询参数中获取关卡ID
    this.route.queryParams.subscribe(params => {
      const levelId = params['level'];
      if (levelId) {
        this.store.changeDataSet(levelId);
      } else {
        // 如果没有指定关卡，默认加载"横刀立马"
        this.store.changeDataSet('横刀立马');
      }

      // 在数据集更改后重新加载图片
      this.preLoadImage();
    });
  }

  ngAfterViewInit() {
    // 初始化ResizeObserver
    this.initResizeObserver();

    // 使用setTimeout确保DOM已渲染，再尝试初始化canvas
    setTimeout(() => {
      this.initCanvas();
    }, 0);
    
    // 监听游戏完成状态，锁定棋盘
    effect(() => {
      if (this.finished()) {
        this.lockBoard();
      } else {
        this.unlockBoard();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyResizeObserver();
    this.fabricGameService.dispose();
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

        } else {
          break;
        }
      } else {
        break;
      }
    }

    // 如果至少移动了一步，更新 Fabric 中的棋子位置
    if (totalStepsMoved > 0) {
      // 使用 FabricDrawingService 的动画方法更新位置
      this.fabricDrawingService.updatePiecePosition(currentPiece);

      // 通知交互服务移动已完成（用于路径执行）
      this.fabricInteractionService.notifyMoveCompleted(currentPiece);
    } else {
    }
  }


  // 触摸移动事件
  onTouchMove(event: TouchEvent) {
    // 阻止页面滚动
    event.preventDefault();
  }

  changeDataSet(dataSetName: string) {
    this.store.changeDataSet(dataSetName);
    this.steps = 0;
    // 直接重新绘制棋盘即可
    Promise.resolve().then(() => {
      this.drawBoard();
    });
  }

  // 返回到关卡选择页面
  goToLevelSelect() {
    this.router.navigate(['level-select'], { replaceUrl: true });
  }

  onDataSetChange(dataSetName: string) {
    this.changeDataSet(dataSetName);
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

  // 前往下一关
  goToNextLevel() {
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

  // 检查是否有下一关
  hasNextLevel(): boolean {
    const currentNames = this.dataSetNames();
    const currentName = this.dataSetName();
    const currentIndex = currentNames.indexOf(currentName);
    
    return currentIndex < currentNames.length - 1;
  }

  // 关闭完成Modal
  closeCompletionModal() {
    this.showCompletionModal = false;
    
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

  // 获取完成评价
  getCompletionRating(): string {
    const steps = this.steps;
    const difficulty = this.currentLevel()?.difficulty || '中级';
    
    // 根据步数和难度给出评价
    let threshold: number;
    switch (difficulty) {
      case '初级':
        threshold = 100;
        break;
      case '中级':
        threshold = 150;
        break;
      case '高级':
        threshold = 200;
        break;
      case '专家':
        threshold = 250;
        break;
      case '大师':
        threshold = 300;
        break;
      default:
        threshold = 150;
    }

    if (steps <= threshold * 0.7) {
      return '完美通关！🏆';
    } else if (steps <= threshold) {
      return '表现优秀！⭐';
    } else if (steps <= threshold * 1.3) {
      return '还不错！👍';
    } else {
      return '继续努力！💪';
    }
  }

  // 监听键盘事件
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.showCompletionModal) {
      this.closeCompletionModal();
    }
  }
}
