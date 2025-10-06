import { Injectable, signal } from '@angular/core';
import { ElementRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CanvasResizeService {
  // 单元格尺寸
  cellSize = 0;
  // 由于边框问题，这里加一个偏移量
  cellOffset = 8;

  boardWidth = 4;
  boardHeight = 5;

  // 单元格尺寸信号
  cellSizeSignal = signal(0);

  constructor() { }

  // 更新单元格尺寸
  updateCellSize(canvas: HTMLCanvasElement): number {
    if (!canvas) {
      return this.cellSize;
    }

    // 检查当前视口宽度来决定使用哪个canvas
    const viewportWidth = window.innerWidth;
    const isPC = viewportWidth >= 1024; // lg断点

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
      // PC端：最小25px，最大120px
      this.cellSize = Math.max(this.cellSize, 25);
      this.cellSize = Math.min(this.cellSize, 120);
    } else {
      // 移动端：根据屏幕宽度调整最大尺寸
      // 小屏手机：最小15px，最大70px
      // 大屏手机：最小15px，最大120px
      this.cellSize = Math.max(this.cellSize, 15);

      if (viewportWidth < 375) {
        // 小屏手机（如iPhone SE）
        this.cellSize = Math.min(this.cellSize, 70);
      } else if (viewportWidth < 414) {
        // 中等屏幕手机（如iPhone 8 Plus）
        this.cellSize = Math.min(this.cellSize, 90);
      } else {
        // 大屏手机（如iPhone 11 Pro Max及以上）
        this.cellSize = Math.min(this.cellSize, 120);
      }
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

    // 更新信号
    this.cellSizeSignal.set(this.cellSize);

    return this.cellSize;
  }

  // 获取当前应该使用的canvas元素
  getCurrentCanvas(canvasRef: ElementRef<HTMLCanvasElement> | undefined, canvasMobileRef: ElementRef<HTMLCanvasElement> | undefined): HTMLCanvasElement | null {
    // 检查当前视口宽度来决定使用哪个canvas
    const viewportWidth = window.innerWidth;
    const isPC = viewportWidth >= 1024; // lg断点

    let canvasElement: HTMLCanvasElement | null = null;
    if (isPC && canvasRef?.nativeElement) {
      canvasElement = canvasRef.nativeElement;
    } else if (!isPC && canvasMobileRef?.nativeElement) {
      canvasElement = canvasMobileRef.nativeElement;
    } else {
      // fallback到任一可用的canvas
      canvasElement = canvasRef?.nativeElement || canvasMobileRef?.nativeElement || null;
    }

    // 如果根据屏幕尺寸应该使用的canvas元素不存在，尝试获取任何可用的canvas元素
    if (!canvasElement) {
      canvasElement = canvasRef?.nativeElement || canvasMobileRef?.nativeElement || null;
    }

    return canvasElement;
  }
}
