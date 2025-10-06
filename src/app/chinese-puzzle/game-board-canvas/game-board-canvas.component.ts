import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect, inject, OnInit, signal } from '@angular/core';
import { ChinesePuzzleStore } from '../chinese-puzzle.store';
import { Piece, Direction } from '../chinese-puzzle.type';
import { timer } from 'rxjs';
import { CanvasDrawingService } from '../services/canvas-drawing.service';
import { CanvasResizeService } from '../services/canvas-resize.service';
import { PieceMovementService } from '../services/piece-movement.service';
import { ImageLoadingService } from '../services/image-loading.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-game-board-canvas',
  standalone: false,
  templateUrl: './game-board-canvas.component.html',
  styleUrls: ['./game-board-canvas.component.css']
})
export class GameBoardCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvasPC', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gameCanvasMobile', { static: false }) canvasMobileRef!: ElementRef<HTMLCanvasElement>;

  private store = inject(ChinesePuzzleStore);
  private canvasDrawingService = inject(CanvasDrawingService);
  private canvasResizeService = inject(CanvasResizeService);
  private pieceMovementService = inject(PieceMovementService);
  private imageLoadingService = inject(ImageLoadingService);

  Direction = Direction;

  boardWidth = this.store.boardWidth();
  boardHeight = this.store.boardHeight();

  dataSetNames = this.store.dataSetNames;
  dataSetName = this.store.dataSetName;

  pieces = this.store.pieces;
  boardState = this.store.board;
  finished = this.store.finished;

  piece: Piece | null = null;
  startPosition: { x: number, y: number } | null = null;

  steps = 0;

  showSuccess = false;
  showInstructions = false;
  resourceLoading = false;

  // 监听屏幕大小变化
  private resizeObserver: ResizeObserver | null = null;
  // 监听黑暗模式变化
  private darkModeMediaQuery: MediaQueryList | null = null;
  private darkModeListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    effect(() => {
      if (this.finished()) {
        this.showSuccess = true;
        timer(2500).subscribe(() => {
          this.showSuccess = false;
        });
      }
    });

    // 监听CanvasResizeService的cellSizeSignal变化
    effect(() => {
      const cellSize = this.canvasResizeService.cellSizeSignal();
      if (cellSize > 0) {
        // CanvasDrawingService通过依赖注入直接访问CanvasResizeService的cellSize
        // 无需手动同步
      }
    });
  }

  ngOnInit() {
    this.store.initBoard();
    this.preLoadImage();
  }

  ngAfterViewInit() {
    // 初始化ResizeObserver
    this.initResizeObserver();

    // 使用setTimeout确保DOM已渲染，再尝试获取canvas元素
    this.observeCanvasElement();
  }

  // 观察canvas元素
  private observeCanvasElement() {
    const canvasElement = this.canvasResizeService.getCurrentCanvas(this.canvasRef, this.canvasMobileRef);
    if (canvasElement) {
      this.resizeObserver?.observe(canvasElement);
      // 立即更新单元格尺寸并绘制
      this.updateCellSize();
      this.drawBoard();
    } else {
      // 如果还是没有找到canvas元素，稍后再尝试
      this.observeCanvasElement();
    }
  }

  ngOnDestroy(): void {
    this.destroyResizeObserver();
  }

  // 初始化屏幕大小监听
  private initResizeObserver() {
    // 获取当前视窗大小
    const updateCellSize = () => {
      // 在resize事件中重新观察canvas元素
      this.observeCanvasElement();
      this.updateCellSize();
      this.drawBoard();
    };

    // 监听resize事件
    window.addEventListener('resize', updateCellSize);

    // 使用ResizeObserver监听元素大小变化
    this.resizeObserver = new ResizeObserver(() => {
      updateCellSize();
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
    const canvasElement = this.canvasResizeService.getCurrentCanvas(this.canvasRef, this.canvasMobileRef);
    if (!canvasElement) {
      return;
    }

    const result = this.canvasResizeService.updateCellSize(canvasElement);
    // 通过信号机制同步更新canvasDrawingService中的cellSize
  }

  // 绘制棋盘
  private drawBoard() {
    const canvasElement = this.canvasResizeService.getCurrentCanvas(this.canvasRef, this.canvasMobileRef);
    if (!canvasElement) {
      return;
    }

    // 设置图片资源
    this.canvasDrawingService.setWoodDarkImage(this.imageLoadingService.getWoodDarkImage());
    this.canvasDrawingService.setWoodLightImage(this.imageLoadingService.getWoodLightImage());

    // 绘制棋盘
    this.canvasDrawingService.drawBoard(canvasElement, this.pieces());
  }

  private resetClickOrDragState() {
    this.piece = null;
    this.startPosition = null;
  }

  // 鼠标按下事件
  onMouseDown(event: MouseEvent) {
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 查找点击的是哪个棋子
    const clickedPiece = this.pieceMovementService.getPieceAtPosition(x, y, this.pieces(), this.canvasResizeService.cellSize);
    if (clickedPiece) {
      this.piece = clickedPiece;
      // 保存相对于canvas的起始坐标
      this.startPosition = { x, y };
    }
  }

  // 鼠标移动事件
  onMouseMove(event: MouseEvent) {
    // 这里可以添加拖拽时的视觉反馈
    if (this.piece && this.startPosition) {
    }
  }

  // 鼠标释放事件
  onMouseUp(event: MouseEvent) {
    if (!this.piece || !this.startPosition) {
      return;
    }

    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const endPosition = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const direction = this.pieceMovementService.determineDirection(this.startPosition, endPosition);

    if (direction && this.pieceMovementService.canMove(this.piece, direction, this.boardState(), this.boardWidth, this.boardHeight)) {
      // 确定了方向，并且可以移动
      const result = this.pieceMovementService.movePiece(this.piece, direction, this.boardState(), this.boardWidth, this.boardHeight);
      if (result) {
        // 更新状态
        this.store.updatePiece(result.updatedPiece);
        this.store.updateBoard(result.updatedBoardState);

        this.steps += 1;

        // 重新绘制棋盘
        this.drawBoard();

        // 计算拖拽距离，如果距离足够远，可以移动多步
        const dragSteps = this.pieceMovementService.calculateDragSteps(this.startPosition, endPosition, this.canvasResizeService.cellSize);

        // 如果拖拽步数大于1，则继续移动
        if (dragSteps > 1) {
          this.movePieceMultipleSteps(result.updatedPiece, direction, dragSteps - 1);
        }
      }
    }

    this.resetClickOrDragState();
  }

  // 移动棋子多步
  private movePieceMultipleSteps(piece: Piece, direction: Direction, steps: number) {
    let currentPiece = piece;
    for (let i = 0; i < steps; i++) {
      const result = this.pieceMovementService.movePiece(currentPiece, direction, this.boardState(), this.boardWidth, this.boardHeight);
      if (result) {
        // 更新状态
        this.store.updatePiece(result.updatedPiece);
        this.store.updateBoard(result.updatedBoardState);
        this.steps += 1;
        currentPiece = result.updatedPiece;
      } else {
        break;
      }
    }
    // 重新绘制棋盘
    this.drawBoard();
  }

  // 触摸开始事件
  onTouchStart(event: TouchEvent) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // 查找点击的是哪个棋子
      const clickedPiece = this.pieceMovementService.getPieceAtPosition(x, y, this.pieces(), this.canvasResizeService.cellSize);
      if (clickedPiece) {
        this.piece = clickedPiece;
        // 保存相对于canvas的起始坐标
        this.startPosition = { x, y };
      }
    }
  }

  // 触摸移动事件
  onTouchMove(event: TouchEvent) {
    // 阻止页面滚动
    event.preventDefault();
  }

  // 触摸结束事件
  onTouchEnd(event: TouchEvent) {
    if (!this.piece || !this.startPosition) {
      return;
    }

    // 获取触摸点坐标
    let endX, endY;
    if (event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
      endX = touch.clientX - rect.left;
      endY = touch.clientY - rect.top;
    } else {
      return;
    }

    const endPosition = { x: endX, y: endY };
    const direction = this.pieceMovementService.determineDirection(this.startPosition, endPosition);

    if (direction && this.pieceMovementService.canMove(this.piece, direction, this.boardState(), this.boardWidth, this.boardHeight)) {
      // 确定了方向，并且可以移动
      const result = this.pieceMovementService.movePiece(this.piece, direction, this.boardState(), this.boardWidth, this.boardHeight);
      if (result) {
        // 更新状态
        this.store.updatePiece(result.updatedPiece);
        this.store.updateBoard(result.updatedBoardState);

        this.steps += 1;

        // 重新绘制棋盘
        this.drawBoard();

        // 计算拖拽距离，如果距离足够远，可以移动多步
        const dragSteps = this.pieceMovementService.calculateDragSteps(this.startPosition, endPosition, this.canvasResizeService.cellSize);

        // 如果拖拽步数大于1，则继续移动
        if (dragSteps > 1) {
          this.movePieceMultipleSteps(result.updatedPiece, direction, dragSteps - 1);
        }
      }
    }

    this.resetClickOrDragState();
  }

  changeDataSet(dataSetName: string) {
    this.store.changeDataSet(dataSetName);
    this.steps = 0;
    // 重置拖拽状态
    this.resetClickOrDragState();
    // 不需要重新加载图片，因为图片是固定的
    // 直接重新绘制棋盘即可
    Promise.resolve().then(() => {
      this.drawBoard();
    });
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
    });
  }
}
