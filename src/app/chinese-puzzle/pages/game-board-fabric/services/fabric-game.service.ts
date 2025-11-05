import { Injectable, signal } from '@angular/core';
import { Canvas, Group, util, FabricObject } from 'fabric';

@Injectable({
  providedIn: 'root'
})
export class FabricGameService {
  canvas: Canvas | null = null;
  cellSize = 0;
  cellOffset = 8;
  boardWidth = 4;
  boardHeight = 5;

  // 存储棋子对象的映射
  private pieceObjects: Map<number, Group> = new Map();

  // 信号用于状态通知
  cellSizeSignal = signal(0);

  constructor() { }

  // 初始化画布
  initCanvas(canvasElement: HTMLCanvasElement): void {
    // 如果已经有 canvas，先销毁
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
      this.pieceObjects.clear();
    }

    this.canvas = new Canvas(canvasElement, {
      selection: false,
      backgroundColor: 'transparent',
      renderOnAddRemove: true
    });

    // 禁用控件
    this.canvas.defaultCursor = 'pointer';
    this.canvas.hoverCursor = 'pointer';
    this.canvas.selection = false;
  }

  // 更新单元格尺寸
  updateCellSize(canvasElement: HTMLCanvasElement): number {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isPC = viewportWidth >= 1024;
    const dpr = window.devicePixelRatio || 1;

    let availableHeight, availableWidth;

    if (isPC) {
      availableWidth = viewportWidth - 320 - 72;
      availableHeight = viewportHeight - 80 - 48;
    } else {
      availableHeight = viewportHeight - 172;
      availableWidth = viewportWidth - 16;
    }

    const maxCellWidth = Math.floor(availableWidth / this.boardWidth);
    const maxCellHeight = Math.floor(availableHeight / this.boardHeight);

    this.cellSize = Math.min(maxCellWidth, maxCellHeight);

    if (isPC) {
      this.cellSize = Math.max(this.cellSize, 30);
      this.cellSize = Math.min(this.cellSize, 160);
    } else {
      this.cellSize = Math.max(this.cellSize, 15);
      if (viewportWidth < 375) {
        this.cellSize = Math.min(this.cellSize, 70);
      } else if (viewportWidth < 414) {
        this.cellSize = Math.min(this.cellSize, 90);
      } else {
        this.cellSize = Math.min(this.cellSize, 120);
      }
    }

    // 设置canvas尺寸
    const canvasWidth = this.boardWidth * this.cellSize;
    const canvasHeight = this.boardHeight * this.cellSize;

    // 对于 Fabric.js，我们只需要设置逻辑尺寸，不需要考虑 DPR
    canvasElement.width = canvasWidth;
    canvasElement.height = canvasHeight;
    canvasElement.style.width = canvasWidth + 'px';
    canvasElement.style.height = canvasHeight + 'px';

    if (this.canvas) {
      // 更新Canvas尺寸
      this.canvas.setDimensions({
        width: canvasWidth,
        height: canvasHeight
      });

      // 更新Canvas元素的实际尺寸
      this.canvas.setWidth(canvasWidth);
      this.canvas.setHeight(canvasHeight);
    }

    this.cellSizeSignal.set(this.cellSize);
    return this.cellSize;
  }

  // 清空画布
  clearCanvas(): void {
    if (this.canvas) {
      this.canvas.clear();
      this.pieceObjects.clear();
    }
  }

  // 获取当前画布尺寸
  getCanvasDimensions(): { width: number; height: number } {
    return {
      width: this.boardWidth * this.cellSize,
      height: this.boardHeight * this.cellSize
    };
  }

  // 获取棋子对象
  getPieceObject(pieceId: number): Group | undefined {
    return this.pieceObjects.get(pieceId);
  }

  // 添加棋子对象
  addPieceObject(pieceId: number, pieceObject: Group): void {
    this.pieceObjects.set(pieceId, pieceObject);
  }

  // 移除棋子对象
  removePieceObject(pieceId: number): void {
    const pieceObject = this.pieceObjects.get(pieceId);
    if (pieceObject && this.canvas) {
      this.canvas.remove(pieceObject);
      this.pieceObjects.delete(pieceId);
    }
  }

  // 获取所有棋子对象
  getAllPieceObjects(): Map<number, Group> {
    return new Map(this.pieceObjects);
  }

  // 设置画布背景
  setCanvasBackground(isDarkMode: boolean): void {
    if (!this.canvas) return;

    // 设置为透明背景
    this.canvas.backgroundColor = 'transparent';
    this.canvas.renderAll();
  }


  // 动画移动棋子到新位置
  animatePieceToPosition(pieceId: number, newX: number, newY: number, duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      const pieceObject = this.pieceObjects.get(pieceId);
      if (!pieceObject || !this.canvas) {
        resolve();
        return;
      }

      const targetLeft = newX * this.cellSize;
      const targetTop = newY * this.cellSize;

      // 使用 Fabric.js 的 animate 方法
      pieceObject.animate({
        left: targetLeft,
        top: targetTop
      }, {
        duration: duration,
        easing: util.ease.easeOutQuad,
        onChange: () => {
          this.canvas?.renderAll();
        },
        onComplete: () => {
          resolve();
        }
      });
    });
  }

  // 重新渲染画布
  renderCanvas(): void {
    if (this.canvas) {
      this.canvas.renderAll();
    }
  }

  // 销毁画布
  dispose(): void {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
    this.pieceObjects.clear();
  }
}