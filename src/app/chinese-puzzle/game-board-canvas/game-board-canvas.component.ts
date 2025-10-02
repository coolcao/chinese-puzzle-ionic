import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect, inject, OnInit } from '@angular/core';
import { ChinesePuzzleStore } from '../chinese-puzzle.store';
import { Piece, Direction } from '../chinese-puzzle.type';
import { ToolsService } from '../../common/tools.service';
import { ImagePreloaderService } from '../image-preloader.service';
import { timer } from 'rxjs';

@Component({
  selector: 'app-game-board-canvas',
  standalone: false,
  templateUrl: './game-board-canvas.component.html',
  styleUrls: ['./game-board-canvas.component.css']
})
export class GameBoardCanvasComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvasPC', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gameCanvasMobile', { static: false }) canvasMobileRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  private store = inject(ChinesePuzzleStore);
  private tools = inject(ToolsService);
  private imagePreLoader = inject(ImagePreloaderService);

  // 单元格尺寸
  cellSize = 150;
  // 由于边框问题，这里加一个偏移量
  cellOffset = 8;

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

  resourceLoading = false;
  showSuccess = false;
  showInstructions = false;

  // 图片资源
  private pieceImages: Map<string, HTMLImageElement> = new Map();
  private woodPatternImage: HTMLImageElement | null = null;

  // 监听屏幕大小变化
  private resizeObserver: ResizeObserver | null = null;

  // 检查是否是黑暗模式
  private isDarkMode(): boolean {
    // 检查多种可能的黑暗模式标记
    return (
      document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
      localStorage.getItem('theme') === 'dark'
    );
  }

  constructor() {
    effect(() => {
      if (this.finished()) {
        this.showSuccess = true;
        timer(2500).subscribe(() => {
          this.showSuccess = false;
        });
      }
    });
  }

  ngOnInit() {
    this.store.initBoard();
    this.preLoadImage();
    this.initResizeObserver();
  }

  ngOnDestroy(): void {
    this.destroyResizeObserver();
  }

  // 初始化屏幕大小监听
  private initResizeObserver() {
    console.log('Initializing resize observer');
    // 获取当前视窗大小
    const updateCellSize = () => {
      console.log('Update cell size triggered');
      this.updateCellSize();
      this.drawBoard();
    };

    // 监听resize事件
    window.addEventListener('resize', updateCellSize);

    // 使用ResizeObserver监听元素大小变化
    this.resizeObserver = new ResizeObserver(() => {
      console.log('ResizeObserver triggered');
      updateCellSize();
    });

    // 延迟监听canvas元素大小变化，确保canvas元素已经被渲染
    // 使用更长的延迟并添加更多的检查
    setTimeout(() => {
      console.log('Checking for canvas elements...');
      console.log('PC canvas ref exists:', !!this.canvasRef);
      console.log('Mobile canvas ref exists:', !!this.canvasMobileRef);
      console.log('PC canvas element exists:', !!this.canvasRef?.nativeElement);
      console.log('Mobile canvas element exists:', !!this.canvasMobileRef?.nativeElement);

      // 监听canvas元素大小变化
      if (this.canvasRef?.nativeElement) {
        this.resizeObserver?.observe(this.canvasRef.nativeElement);
        console.log('Observing PC canvas');
        // 立即绘制一次
        this.drawBoard();
      } else if (this.canvasMobileRef?.nativeElement) {
        this.resizeObserver?.observe(this.canvasMobileRef.nativeElement);
        console.log('Observing Mobile canvas');
        // 立即绘制一次
        this.drawBoard();
      } else {
        console.log('No canvas element to observe');
        // 如果还是没有找到canvas元素，再尝试一次
        setTimeout(() => {
          console.log('Retrying to draw board after 200ms delay');
          this.drawBoard();
        }, 200);
      }
    }, 200);
  }

  // 组件销毁时清理监听器
  private destroyResizeObserver() {
    window.removeEventListener('resize', () => { });
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  // 更新单元格尺寸
  private updateCellSize() {
    // 确定当前使用的canvas元素
    // 检查当前视口宽度来决定使用哪个canvas
    const viewportWidth = window.innerWidth;
    const isPC = viewportWidth >= 1024; // lg断点

    let canvasElement;
    if (isPC && this.canvasRef?.nativeElement) {
      canvasElement = this.canvasRef.nativeElement;
    } else if (!isPC && this.canvasMobileRef?.nativeElement) {
      canvasElement = this.canvasMobileRef.nativeElement;
    } else {
      // fallback到任一可用的canvas
      canvasElement = this.canvasRef?.nativeElement || this.canvasMobileRef?.nativeElement;
    }

    if (!canvasElement) {
      console.log('Canvas element not found, skipping updateCellSize');
      return;
    }

    const canvas = canvasElement;
    const dpr = window.devicePixelRatio || 1;

    const viewportHeight = window.innerHeight;

    let availableHeight, availableWidth;

    if (isPC) {
      // PC端布局：顶部header + 下面左右布局
      // 顶部header约80px，右侧信息卡片宽度约320px + 边距
      availableWidth = viewportWidth - 320 - 72; // 减去信息卡片宽度和左右边距
      availableHeight = viewportHeight - 80 - 48; // 减去顶部header和上下边距
    } else {
      // 移动端上下布局
      // 顶部导航约60px + 控制栏约80px + 边距约32px = 约172px
      availableHeight = viewportHeight - 172;
      availableWidth = viewportWidth - 16; // 减少左右边距到16px
    }

    // 根据可用空间计算单元格尺寸
    // 棋盘尺寸：4x5 单元格
    const maxCellWidth = Math.floor(availableWidth / this.boardWidth);
    const maxCellHeight = Math.floor(availableHeight / this.boardHeight);

    // 取较小值确保棋盘完全可见
    this.cellSize = Math.min(maxCellWidth, maxCellHeight);

    // 根据设备类型设置不同的尺寸限制
    if (isPC) {
      // PC端：最小80px，最大200px
      this.cellSize = Math.max(this.cellSize, 80);
      this.cellSize = Math.min(this.cellSize, 200);
    } else {
      // 移动端：最小60px，最大150px
      this.cellSize = Math.max(this.cellSize, 60);
      this.cellSize = Math.min(this.cellSize, 150);
    }

    // 设置canvas尺寸，考虑DPR
    canvas.width = this.boardWidth * this.cellSize * dpr;
    canvas.height = this.boardHeight * this.cellSize * dpr;

    // 设置canvas显示尺寸
    canvas.style.width = (this.boardWidth * this.cellSize) + 'px';
    canvas.style.height = (this.boardHeight * this.cellSize) + 'px';

    // 重置canvas上下文缩放
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

  }

  // 绘制棋盘
  private drawBoard() {
    // 确定当前使用的canvas元素
    // 检查当前视口宽度来决定使用哪个canvas
    const viewportWidth = window.innerWidth;
    const isPC = viewportWidth >= 1024; // lg断点

    let canvasElement;
    if (isPC && this.canvasRef?.nativeElement) {
      canvasElement = this.canvasRef.nativeElement;
    } else if (!isPC && this.canvasMobileRef?.nativeElement) {
      canvasElement = this.canvasMobileRef.nativeElement;
    } else {
      // fallback到任一可用的canvas
      canvasElement = this.canvasRef?.nativeElement || this.canvasMobileRef?.nativeElement;
    }

    if (!canvasElement) {
      console.log('Canvas element not found, skipping draw');
      return;
    }

    const canvas = canvasElement;

    // 每次绘制时都重新获取canvas上下文，确保在不同设备上都能正确初始化
    this.ctx = canvas.getContext('2d')!;
    this.updateCellSize();

    const ctx = this.ctx;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制棋盘边框
    ctx.strokeStyle = '#92400e'; // border-yellow-800
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, this.boardWidth * this.cellSize + this.cellOffset, this.boardHeight * this.cellSize + this.cellOffset);

    // 绘制出口
    const exitWidth = (this.boardWidth * this.cellSize + this.cellOffset) / 2;
    const exitX = exitWidth / 2;

    // 左侧出口边框
    ctx.beginPath();
    ctx.moveTo(0, this.boardHeight * this.cellSize + this.cellOffset);
    ctx.lineTo(exitX, this.boardHeight * this.cellSize + this.cellOffset);
    ctx.stroke();

    // 右侧出口边框
    ctx.beginPath();
    ctx.moveTo(exitX + exitWidth, this.boardHeight * this.cellSize + this.cellOffset);
    ctx.lineTo(this.boardWidth * this.cellSize + this.cellOffset, this.boardHeight * this.cellSize + this.cellOffset);
    ctx.stroke();

    // 绘制出口文字
    ctx.font = '20px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('出口', (this.boardWidth * this.cellSize + this.cellOffset) / 2, this.boardHeight * this.cellSize + this.cellOffset / 2 - 20);

    // 绘制棋子
    this.pieces().forEach(piece => {
      this.drawPiece(piece);
    });
  }

  // 绘制单个棋子
  private drawPiece(piece: Piece) {
    // 确定当前使用的canvas元素
    const canvasElement = this.canvasRef?.nativeElement || this.canvasMobileRef?.nativeElement;
    if (!canvasElement || !this.ctx) return;

    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const gap = 1.5; // 棋子之间的间隙
    const x = piece.x * this.cellSize + gap;
    const y = piece.y * this.cellSize + gap;
    const width = piece.width * this.cellSize + 1 - gap * 2;
    const height = piece.height * this.cellSize + 1 - gap * 2;
    const borderRadius = 8; // 圆角半径

    // 保存当前绘图状态
    ctx.save();

    // 创建圆角矩形路径
    this.createRoundedRectPath(ctx, x, y, width, height, borderRadius);
    ctx.clip();

    // 绘制棋子背景
    if (this.woodPatternImage) {
      // 创建一个临时canvas来绘制wood pattern
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = width * dpr;
      patternCanvas.height = height * dpr;
      const patternCtx = patternCanvas.getContext('2d')!;
      patternCtx.scale(dpr, dpr);

      // 绘制wood pattern
      patternCtx.drawImage(
        this.woodPatternImage,
        0, 0, this.woodPatternImage.width, this.woodPatternImage.height,
        0, 0, width, height
      );

      // 在棋子位置绘制wood pattern
      ctx.drawImage(patternCanvas, x, y);
    } else {
      // 如果没有wood pattern图片，使用纯色背景
      // 在黑暗模式下使用更深的木质颜色
      if (this.isDarkMode()) {
        ctx.fillStyle = '#a88252'; // 深色木质颜色
      } else {
        ctx.fillStyle = '#d2a86f'; // 木质颜色
      }
      ctx.fillRect(x, y, width, height);
    }

    // 绘制棋子图片
    if (piece.img && this.pieceImages.has(piece.name)) {
      const img = this.pieceImages.get(piece.name)!;
      const padding = 8;
      
      // 简单直接绘制图片，不进行复杂的颜色处理
      if (this.isDarkMode()) {
        // 黑暗模式下，为图片添加轻微发光效果以增强可见性
        ctx.save();
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(img, x + padding, y + padding, width - padding * 2, height - padding * 2);
        ctx.restore();
      } else {
        // 白天模式下直接绘制图片
        ctx.drawImage(img, x + padding, y + padding, width - padding * 2, height - padding * 2);
      }
    }

    // 绘制棋子名称
    if (!piece.img || !this.pieceImages.has(piece.name)) {
      ctx.font = '20px Arial';
      // 在黑暗模式下使用更亮的文字颜色
      if (this.isDarkMode()) {
        ctx.fillStyle = '#e6d2b5'; // 更亮的米色
        // 为文字添加轻微发光效果
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 0.3;
      } else {
        ctx.fillStyle = '#6b4f27'; // text-[#6b4f27]
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(piece.name, x + width / 2, y + height / 2);
    }

    // 恢复绘图状态
    ctx.restore();

    // 根据黑暗模式调整边框颜色
    const outerBorderColor = this.isDarkMode() ? '#e6d2b5' : '#7a360a'; // 黑暗模式下外边框更亮
    const innerBorderColor = this.isDarkMode() ? '#7a360a' : '#e6d2b5'; // 黑暗模式下内边框更暗
    
    // 绘制外边框（在黑暗模式下应该是亮色）
    ctx.strokeStyle = outerBorderColor;
    ctx.lineWidth = 1;
    this.createRoundedRectPath(ctx, x, y, width, height, borderRadius);
    ctx.stroke();

    const padding = 8;

    // 绘制内边框（在黑暗模式下应该是暗色）
    ctx.strokeStyle = innerBorderColor;
    ctx.lineWidth = 3;
    this.createRoundedRectPath(ctx, x + padding, y + padding, width - padding * 2, height - padding * 2, borderRadius - 2);
    ctx.stroke();
  }

  // 创建圆角矩形路径
  private createRoundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // 根据坐标查找棋子
  private getPieceAtPosition(x: number, y: number): Piece | null {
    // 将像素坐标转换为棋盘坐标
    const boardX = Math.floor(x / this.cellSize);
    const boardY = Math.floor(y / this.cellSize);

    // 查找对应位置的棋子
    for (const piece of this.pieces()) {
      if (boardX >= piece.x && boardX < piece.x + piece.width &&
        boardY >= piece.y && boardY < piece.y + piece.height) {
        return piece;
      }
    }

    return null;
  }

  // 检查是否可以移动棋子
  canMove(piece: Piece, direction: Direction): boolean {
    // 计算目标位置
    let targetX = piece.x;
    let targetY = piece.y;

    if (direction === Direction.Up) targetY -= 1;
    if (direction === Direction.Down) targetY += 1;
    if (direction === Direction.Left) targetX -= 1;
    if (direction === Direction.Right) targetX += 1;

    // 检查目标位置是否超出边界
    if (
      targetX < 0 ||
      targetY < 0 ||
      targetX + piece.width > this.boardWidth ||
      targetY + piece.height > this.boardHeight
    ) {
      return false;
    }

    // 检查目标位置是否被其他棋子占用
    for (let i = 0; i < piece.height; i++) {
      for (let j = 0; j < piece.width; j++) {
        const cellY = targetY + i;
        const cellX = targetX + j;

        if (this.boardState()[cellY][cellX] !== '' && this.boardState()[cellY][cellX] !== piece.name) {
          return false;
        }
      }
    }

    return true;
  }

  // 移动棋子
  movePiece(piece: Piece, direction: Direction) {
    if (this.canMove(piece, direction)) {
      const boardState = this.tools.deepClone(this.boardState());
      // 清空棋子原位置
      for (let i = 0; i < piece.height; i++) {
        for (let j = 0; j < piece.width; j++) {
          boardState[piece.y + i][piece.x + j] = '';
        }
      }

      // 更新棋子位置
      if (direction === Direction.Up) piece.y -= 1;
      if (direction === Direction.Down) piece.y += 1;
      if (direction === Direction.Left) piece.x -= 1;
      if (direction === Direction.Right) piece.x += 1;

      // 填充棋子新位置
      for (let i = 0; i < piece.height; i++) {
        for (let j = 0; j < piece.width; j++) {
          boardState[piece.y + i][piece.x + j] = piece.name;
        }
      }

      // 更新状态
      this.store.updatePiece(piece);
      this.store.updateBoard(boardState);

      this.steps += 1;

      // 重新绘制棋盘
      this.drawBoard();
    }
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
    const clickedPiece = this.getPieceAtPosition(x, y);
    if (clickedPiece) {
      this.piece = clickedPiece;
      this.startPosition = { x: event.clientX, y: event.clientY };
    } else {
      console.log('No piece clicked');
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
      console.log('No piece or start position');
      return;
    }

    const deltaX = event.clientX - this.startPosition.x;
    const deltaY = event.clientY - this.startPosition.y;

    let direction: Direction | null = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? Direction.Right : Direction.Left;
    } else {
      direction = deltaY > 0 ? Direction.Down : Direction.Up;
    }

    if (direction && this.canMove(this.piece, direction)) {
      // 确定了方向，并且可以移动
      const piece = this.piece;
      this.movePiece(piece, direction);

      // 计算拖拽距离，如果距离足够远，可以移动多步
      const dragDistance = Math.max(Math.abs(deltaX), Math.abs(deltaY));
      const dragSteps = Math.floor(dragDistance / this.cellSize);

      // 如果拖拽步数大于1，则继续移动
      if (dragSteps > 1) {
        this.movePiece(piece, direction);
      }
    } else {
      console.log('Cannot move piece');
    }

    this.resetClickOrDragState();
  }

  // 触摸开始事件
  onTouchStart(event: TouchEvent) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // 查找点击的是哪个棋子
      const clickedPiece = this.getPieceAtPosition(x, y);
      if (clickedPiece) {
        this.piece = clickedPiece;
        this.startPosition = { x: touch.clientX, y: touch.clientY };
      } else {
        console.log('No piece touched');
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
      console.log('No piece or start position');
      return;
    }

    // 获取触摸点坐标
    let endX, endY;
    if (event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      endX = touch.clientX;
      endY = touch.clientY;
    } else {
      return;
    }

    const deltaX = endX - this.startPosition.x;
    const deltaY = endY - this.startPosition.y;

    let direction: Direction | null = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? Direction.Right : Direction.Left;
    } else {
      direction = deltaY > 0 ? Direction.Down : Direction.Up;
    }

    if (direction && this.canMove(this.piece, direction)) {
      // 确定了方向，并且可以移动
      const piece = this.piece;
      this.movePiece(piece, direction);

      // 计算拖拽距离，如果距离足够远，可以移动多步
      const dragDistance = Math.max(Math.abs(deltaX), Math.abs(deltaY));
      const dragSteps = Math.floor(dragDistance / this.cellSize);

      // 如果拖拽步数大于1，则继续移动
      if (dragSteps > 1) {
        this.movePiece(piece, direction);
      }
    } else {
      console.log('Cannot move piece');
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
    setTimeout(() => {
      this.drawBoard();
    }, 0);
  }

  onDataSetChange(dataSetName: string) {
    this.changeDataSet(dataSetName);
  }

  private preLoadImage() {
    this.resourceLoading = true;

    // 清空之前的图片缓存
    this.pieceImages.clear();
    this.woodPatternImage = null;

    // 获取当前最新的棋子数据
    const currentPieces = this.pieces();

    // 预加载wood pattern图片
    const woodPatternImg = new Image();
    woodPatternImg.src = 'assets/img/wood-pattern.png';
    woodPatternImg.onload = () => {
      this.woodPatternImage = woodPatternImg;
      // 如果棋子图片已经加载完成，则绘制棋盘
      if (!this.resourceLoading) {
        this.drawBoard();
      }
    };
    woodPatternImg.onerror = () => {
      // 即使wood pattern图片加载失败也要尝试绘制
      if (!this.resourceLoading) {
        this.drawBoard();
      }
    };

    // 预加载棋子图片
    const imageUrls = currentPieces.filter(p => !!p.img).map(piece => piece.img!);
    if (!imageUrls || imageUrls.length == 0) {
      this.resourceLoading = false;
      // 即使没有图片也要尝试绘制
      setTimeout(() => {
        this.drawBoard();
      }, 100);
      return;
    }

    this.imagePreLoader.preloadImages(imageUrls).then(success => {
      if (success) {
        // 加载成功后，为每个棋子创建图片对象
        let loadedImages = 0;
        const totalImages = currentPieces.filter(p => !!p.img).length;

        currentPieces.forEach(piece => {
          if (piece.img) {
            const img = new Image();
            img.src = piece.img;
            img.onload = () => {
              this.pieceImages.set(piece.name, img);
              loadedImages++;
              // 所有图片加载完成后重新绘制
              if (loadedImages === totalImages) {
                this.resourceLoading = false;
                // 添加延迟确保canvas已准备好
                setTimeout(() => {
                  this.drawBoard();
                }, 100);
              }
            };
            img.onerror = () => {
              loadedImages++;
              // 即使有图片加载失败也要尝试绘制
              if (loadedImages === totalImages) {
                this.resourceLoading = false;
                // 添加延迟确保canvas已准备好
                setTimeout(() => {
                  this.drawBoard();
                }, 100);
              }
            };
          }
        });
      } else {
        console.error('图片预加载失败');
        this.resourceLoading = false;
        // 即使预加载失败也要尝试绘制
        setTimeout(() => {
          this.drawBoard();
        }, 100);
      }
    });
  }
}
