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
  private woodDarkImage: HTMLImageElement | null = null;
  private woodLightImage: HTMLImageElement | null = null;

  // 监听屏幕大小变化
  private resizeObserver: ResizeObserver | null = null;
  // 监听黑暗模式变化
  private darkModeMediaQuery: MediaQueryList | null = null;
  private darkModeListener: ((e: MediaQueryListEvent) => void) | null = null;

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

    // 监听黑暗模式变化
    if (window.matchMedia) {
      this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.darkModeListener = (e: MediaQueryListEvent) => {
        console.log('Dark mode changed:', e.matches);
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

    // 绘制更真实的木质棋子
    this.drawRealisticWoodenPiece(ctx, x, y, width, height, piece.name);

    // 绘制棋子名称（当没有图片或图片未加载时显示）
    // 根据棋子大小动态调整文字大小
    const fontSize = Math.max(12, Math.min(width / 4, height / 4, 24));
    if (!piece.img || !this.pieceImages.has(piece.name)) {
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = '#6b4f27'; // text-[#6b4f27]
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(piece.name, x + width / 2, y + height / 2);
    }

    // 绘制棋子名称
    ctx.font = `bold ${fontSize * 0.8}px Arial`;
    // 在黑暗模式下使用更亮的文字颜色
    if (this.isDarkMode()) {
      ctx.fillStyle = '#F5DEB3'; // 浅木色文字
      // 为文字添加轻微发光效果
      ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowBlur = 1;
    } else {
      ctx.fillStyle = '#8B4513'; // 深棕色文字
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 0.5;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(piece.name, x + width / 2, y + height / 2);
    
    // 重置阴影效果
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 恢复绘图状态
    ctx.restore();

    // 根据黑暗模式调整边框颜色，白天模式颜色更深，黑夜模式颜色更浅
    let outerBorderColor, innerBorderColor;
    
    if (this.isDarkMode()) {
      // 黑夜模式下使用更浅的颜色
      outerBorderColor = '#f5e5c9'; // 更浅的外边框
      innerBorderColor = '#9c5a2a'; // 更浅的内边框
    } else {
      // 白天模式下使用更深的颜色
      outerBorderColor = '#5a2508'; // 更深的外边框
      innerBorderColor = '#c4a47a'; // 更深的内边框
    }
    
    // 绘制外边框
    ctx.strokeStyle = outerBorderColor;
    ctx.lineWidth = 1;
    this.createRoundedRectPath(ctx, x, y, width, height, borderRadius);
    ctx.stroke();

    const padding = 8;

    // 绘制内边框
    ctx.strokeStyle = innerBorderColor;
    ctx.lineWidth = 3;
    this.createRoundedRectPath(ctx, x + padding, y + padding, width - padding * 2, height - padding * 2, borderRadius - 2);
    ctx.stroke();
  }

  // 绘制更真实的木质棋子
  private drawRealisticWoodenPiece(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, pieceName: string) {
    const isDark = this.isDarkMode();

    // 使用木质纹理图片为每个棋子单独贴图
    const woodImage = isDark ? this.woodDarkImage : this.woodLightImage;

    // 定义内边框的padding和圆角半径
    const padding = 8;
    const innerBorderRadius = 6; // borderRadius - 2

    if (woodImage && woodImage.complete) {
      // 为每个棋子单独绘制木质纹理图片，从内边框内开始绘制，带圆角
      this.drawImageFill(ctx, woodImage, x + padding, y + padding, width - padding * 2, height - padding * 2, innerBorderRadius);
    } else {
      // 如果图片未加载完成，回退到原来的渐变效果（也需要调整位置和圆角）
      // 注意：drawWoodenGradient方法也需要修改以支持圆角和位置调整
      this.drawWoodenGradient(ctx, x + padding, y + padding, width - padding * 2, height - padding * 2, isDark, pieceName);
    }

    // 添加边框效果
    this.addWoodenBorder(ctx, x, y, width, height, isDark);

    // 添加立体阴影效果
    this.addWoodenShadows(ctx, x, y, width, height, isDark);
  }
  
  // 绘制木质渐变效果（回退方案）
  private drawWoodenGradient(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isDark: boolean, pieceName: string) {
    const borderRadius = 6; // 内边框的圆角半径

    // 保存当前绘图状态
    ctx.save();

    // 创建圆角矩形路径并裁剪
    this.createRoundedRectPath(ctx, x, y, width, height, borderRadius);
    ctx.clip();

    // 绘制木质基底 - 为白天和黑夜模式分别设计颜色
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);

    if (isDark) {
      // 夜晚模式下的深色木质渐变
      gradient.addColorStop(0, '#8B4513'); // 深棕色
      gradient.addColorStop(0.5, '#A0522D'); // 中等棕色
      gradient.addColorStop(1, '#5D2906'); // 深红棕色
    } else {
      // 白天模式下的更浅色木质渐变
      gradient.addColorStop(0, '#E6D2B5'); // 更浅的木色
      gradient.addColorStop(0.5, '#D4A76A'); // 浅木色
      gradient.addColorStop(1, '#C18E4F'); // 中木色
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // 添加木质纹理效果 - 模拟1.html中的网格纹理
    this.drawWoodGrainTexture(ctx, x, y, width, height, isDark, pieceName);

    // 恢复绘图状态
    ctx.restore();
  }
  
  // 绘制木质纹理效果
  private drawWoodGrainTexture(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isDark: boolean, pieceName: string) {
    // 为每个棋子创建固定的种子值，确保纹理不会随机变化
    const seed = this.hashString(pieceName) % 1000;
    
    // 创建可预测的随机数生成器
    const random = (min: number, max: number, offset: number = 0) => {
      const x = Math.sin(seed + offset) * 10000;
      return min + (x - Math.floor(x)) * (max - min);
    };
    
    // 创建网格状木质纹理 - 模拟1.html中的网格纹理效果
    const gridSize = 10; // 网格大小
    
    // 1. 绘制水平网格线
    ctx.strokeStyle = isDark ? 
      'rgba(139, 69, 19, 0.15)' :  // 深色模式下使用深棕色
      'rgba(230, 210, 181, 0.08)'; // 浅色模式下使用更浅的颜色
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= Math.ceil(height / gridSize); i++) {
      const yPos = y + i * gridSize;
      if (yPos >= y && yPos <= y + height) {
        ctx.beginPath();
        ctx.moveTo(x, yPos);
        ctx.lineTo(x + width, yPos);
        ctx.stroke();
      }
    }
    
    // 2. 绘制垂直网格线
    ctx.strokeStyle = isDark ? 
      'rgba(160, 82, 45, 0.25)' :   // 深色模式下使用中等棕色
      'rgba(212, 167, 106, 0.15)';  // 浅色模式下使用更浅的颜色
    
    for (let i = 0; i <= Math.ceil(width / gridSize); i++) {
      const xPos = x + i * gridSize;
      if (xPos >= x && xPos <= x + width) {
        ctx.beginPath();
        ctx.moveTo(xPos, y);
        ctx.lineTo(xPos, y + height);
        ctx.stroke();
      }
    }
    
    // 3. 添加随机的木质纹理点 - 增加真实感
    const dotCount = 30 + Math.floor(random(0, 20, 100));
    for (let i = 0; i < dotCount; i++) {
      const dotX = x + random(0, width, i * 10);
      const dotY = y + random(0, height, i * 20);
      const dotSize = 1 + random(0, 2, i * 30);
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
      
      // 根据位置创建深浅不同的纹理点
      const depth = random(0, 1, i * 40);
      ctx.fillStyle = isDark ? 
        `rgba(139, 69, 19, ${0.1 + depth * 0.3})` :  // 深色模式下使用深棕色
        `rgba(230, 210, 181, ${0.05 + depth * 0.15})`; // 浅色模式下使用更浅的颜色
      ctx.fill();
    }
  }
  
  // 添加3D边缘效果
  private add3DEdges(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isDark: boolean) {
    // 创建更明显的3D效果
    
    // 1. 顶部高光 - 模拟光源照射
    const topLight = ctx.createLinearGradient(x, y, x, y + height * 0.2);
    topLight.addColorStop(0, isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.6)');
    topLight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = topLight;
    ctx.fillRect(x, y, width, height * 0.2);
    
    // 2. 左侧高光
    const leftLight = ctx.createLinearGradient(x, y, x + width * 0.2, y);
    leftLight.addColorStop(0, isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.5)');
    leftLight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = leftLight;
    ctx.fillRect(x, y, width * 0.2, height);
    
    // 3. 右侧阴影 - 模拟背光
    const rightShadow = ctx.createLinearGradient(x + width * 0.8, y, x + width, y);
    rightShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    rightShadow.addColorStop(1, isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.4)');
    
    ctx.fillStyle = rightShadow;
    ctx.fillRect(x + width * 0.8, y, width * 0.2, height);
    
    // 4. 底部阴影
    const bottomShadow = ctx.createLinearGradient(x, y + height * 0.8, x, y + height);
    bottomShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomShadow.addColorStop(1, isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.5)');
    
    ctx.fillStyle = bottomShadow;
    ctx.fillRect(x, y + height * 0.8, width, height * 0.2);
    
    // 5. 内部阴影 - 增强立体感
    const innerShadow = ctx.createRadialGradient(
      x + width/2, y + height/2, 0,
      x + width/2, y + height/2, Math.min(width, height) * 0.8
    );
    innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    innerShadow.addColorStop(1, isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.15)');
    
    ctx.fillStyle = innerShadow;
    ctx.fillRect(x, y, width, height);
  }
  
  // 添加边框效果
  private addWoodenBorder(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isDark: boolean) {
    // 添加内边框效果 - 模拟1.html中的内边框
    const borderWidth = 3;
    const borderRadius = 4;
    
    // 绘制内边框阴影
    ctx.fillStyle = isDark ? 
      'rgba(0, 0, 0, 0.15)' :  // 深色模式下使用更深的阴影
      'rgba(0, 0, 0, 0.03)';   // 浅色模式下使用更浅的阴影
    ctx.fillRect(x + borderWidth, y + borderWidth, width - 2 * borderWidth, height - 2 * borderWidth);
  }
  
  // 添加立体阴影效果
  private addWoodenShadows(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isDark: boolean) {
    // 添加外阴影效果 - 模拟1.html中的外阴影
    
    // 1. 外阴影
    const outerShadow = ctx.createLinearGradient(x, y, x, y + height);
    outerShadow.addColorStop(0, isDark ? 
      'rgba(0, 0, 0, 0.2)' :   // 深色模式下使用更深的阴影
      'rgba(0, 0, 0, 0.05)');  // 浅色模式下使用更浅的阴影
    outerShadow.addColorStop(1, isDark ? 
      'rgba(0, 0, 0, 0.4)' :   // 深色模式下使用更深的阴影
      'rgba(0, 0, 0, 0.15)');  // 浅色模式下使用更浅的阴影
    
    // 绘制外阴影
    ctx.fillStyle = outerShadow;
    ctx.fillRect(x + 2, y + 4, width, height);
    ctx.fillRect(x + 4, y + 8, width, height);
    
    // 2. 内阴影 - 顶部高光
    const innerHighlight = ctx.createLinearGradient(x, y, x, y + height * 0.3);
    innerHighlight.addColorStop(0, isDark ? 
      'rgba(255, 255, 255, 0.15)' :  // 深色模式下使用较弱的高光
      'rgba(255, 255, 255, 0.3)');   // 浅色模式下使用更强的高光
    innerHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = innerHighlight;
    ctx.fillRect(x, y, width, height * 0.3);
    
    // 3. 内阴影 - 底部阴影
    const innerShadow = ctx.createLinearGradient(x, y + height * 0.7, x, y + height);
    innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    innerShadow.addColorStop(1, isDark ? 
      'rgba(0, 0, 0, 0.3)' :    // 深色模式下使用更深的阴影
      'rgba(0, 0, 0, 0.15)');   // 浅色模式下使用更浅的阴影
    
    ctx.fillStyle = innerShadow;
    ctx.fillRect(x, y + height * 0.7, width, height * 0.3);
  }

  // 添加木质纹理细节
  private addWoodGrainDetails(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isDark: boolean) {
    // 这个函数现在已经被整合到新的绘制函数中，但为了保持代码兼容性暂时保留
    // 实际的纹理绘制已经在drawWoodGrain函数中实现
  }

  // 按比例填充绘制图片，确保图片填充整个区域（可能会裁切），支持圆角
  private drawImageFill(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, borderRadius: number = 0) {
    // 计算图片的宽高比
    const imageAspect = image.width / image.height;
    const containerAspect = width / height;

    let drawWidth, drawHeight, offsetX, offsetY;

    // 根据宽高比决定如何缩放图片以填充整个区域
    if (imageAspect > containerAspect) {
      // 图片更宽，以高度为准填充，裁切左右
      drawHeight = height;
      drawWidth = height * imageAspect;
      offsetX = (width - drawWidth) / 2;
      offsetY = 0;
    } else {
      // 图片更高，以宽度为准填充，裁切上下
      drawWidth = width;
      drawHeight = width / imageAspect;
      offsetX = 0;
      offsetY = (height - drawHeight) / 2;
    }

    // 如果需要圆角，创建裁剪区域
    if (borderRadius > 0) {
      ctx.save();
      this.createRoundedRectPath(ctx, x, y, width, height, borderRadius);
      ctx.clip();
    }

    // 绘制图片，确保填充整个区域
    ctx.drawImage(image, x + offsetX, y + offsetY, drawWidth, drawHeight);

    // 恢复绘图状态
    if (borderRadius > 0) {
      ctx.restore();
    }
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
  
  // 字符串哈希函数 - 为每个棋子生成固定种子
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
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
    this.woodDarkImage = null;
    this.woodLightImage = null;

    // 获取当前最新的棋子数据
    const currentPieces = this.pieces();

    // 预加载木质纹理图片
    const woodDarkImg = new Image();
    woodDarkImg.src = 'assets/img/wood_dark.png';
    woodDarkImg.onload = () => {
      this.woodDarkImage = woodDarkImg;
      // 如果棋子图片已经加载完成，则绘制棋盘
      if (!this.resourceLoading) {
        this.drawBoard();
      }
    };
    woodDarkImg.onerror = () => {
      // 即使wood dark图片加载失败也要尝试绘制
      if (!this.resourceLoading) {
        this.drawBoard();
      }
    };

    const woodLightImg = new Image();
    woodLightImg.src = 'assets/img/wood_light.png';
    woodLightImg.onload = () => {
      this.woodLightImage = woodLightImg;
      // 如果棋子图片已经加载完成，则绘制棋盘
      if (!this.resourceLoading) {
        this.drawBoard();
      }
    };
    woodLightImg.onerror = () => {
      // 即使wood light图片加载失败也要尝试绘制
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
