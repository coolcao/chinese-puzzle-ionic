import { Injectable, inject } from '@angular/core';
import { Piece } from '../chinese-puzzle.type';
import { CanvasResizeService } from './canvas-resize.service';

@Injectable({
  providedIn: 'root'
})
export class CanvasDrawingService {
  // 图片资源
  private pieceImages: Map<string, HTMLImageElement> = new Map();
  private woodDarkImage: HTMLImageElement | null = null;
  private woodLightImage: HTMLImageElement | null = null;

  private canvasResizeService = inject(CanvasResizeService);

  constructor() { }

  // 设置图片资源
  setPieceImages(images: Map<string, HTMLImageElement>) {
    this.pieceImages = images;
  }

  setWoodDarkImage(image: HTMLImageElement | null) {
    this.woodDarkImage = image;
  }

  setWoodLightImage(image: HTMLImageElement | null) {
    this.woodLightImage = image;
  }

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

  // 绘制棋盘
  drawBoard(canvas: HTMLCanvasElement, pieces: Piece[]) {
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // 重置canvas上下文缩放
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 使用木质贴图绘制棋盘背景
    this.drawWoodenBoardWithImage(ctx);

    // 绘制出口（木板开口）
    const exitWidth = (this.canvasResizeService.boardWidth * this.canvasResizeService.cellSize + this.canvasResizeService.cellOffset) / 2;
    const exitX = exitWidth / 2;
    const boardBottom = this.canvasResizeService.boardHeight * this.canvasResizeService.cellSize + this.canvasResizeService.cellOffset;

    // 绘制开口边缘（看起来像木板的切割边缘）
    ctx.strokeStyle = this.isDarkMode() ? '#3A2A1A' : '#5D4037';
    ctx.lineWidth = 3;

    // 左侧开口边缘
    ctx.beginPath();
    ctx.moveTo(0, boardBottom);
    ctx.lineTo(exitX, boardBottom);
    ctx.stroke();

    // 右侧开口边缘
    ctx.beginPath();
    ctx.moveTo(exitX + exitWidth, boardBottom);
    ctx.lineTo(this.canvasResizeService.boardWidth * this.canvasResizeService.cellSize + this.canvasResizeService.cellOffset, boardBottom);
    ctx.stroke();

    // 添加边缘高光效果
    ctx.strokeStyle = this.isDarkMode() ? '#4A3A2A' : '#8D6E63';
    ctx.lineWidth = 1;

    // 左侧高光
    ctx.beginPath();
    ctx.moveTo(0, boardBottom - 1);
    ctx.lineTo(exitX, boardBottom - 1);
    ctx.stroke();

    // 右侧高光
    ctx.beginPath();
    ctx.moveTo(exitX + exitWidth, boardBottom - 1);
    ctx.lineTo(this.canvasResizeService.boardWidth * this.canvasResizeService.cellSize + this.canvasResizeService.cellOffset, boardBottom - 1);
    ctx.stroke();

    // 绘制出口文字
    ctx.font = '20px Arial';
    // 根据主题模式调整文字颜色
    ctx.fillStyle = this.isDarkMode() ? '#B4A490' : '#3D2F1F'; // 黑暗模式浅色，白天模式深色
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('出口', (this.canvasResizeService.boardWidth * this.canvasResizeService.cellSize + this.canvasResizeService.cellOffset) / 2, this.canvasResizeService.boardHeight * this.canvasResizeService.cellSize + this.canvasResizeService.cellOffset / 2 - 20);

    // 绘制棋子
    pieces.forEach(piece => {
      this.drawPiece(ctx, piece);
    });
  }

  // 更新单元格尺寸
  private updateCellSize(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;

    // 设置canvas尺寸，考虑DPR
    canvas.width = this.canvasResizeService.boardWidth * this.canvasResizeService.cellSize * dpr;
    canvas.height = this.canvasResizeService.boardHeight * this.canvasResizeService.cellSize * dpr;

    // 设置canvas显示尺寸
    canvas.style.width = (this.canvasResizeService.boardWidth * this.canvasResizeService.cellSize) + 'px';
    canvas.style.height = (this.canvasResizeService.boardHeight * this.canvasResizeService.cellSize) + 'px';

    // 重置canvas上下文缩放
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
  }

  // 绘制单个棋子
  private drawPiece(ctx: CanvasRenderingContext2D, piece: Piece) {
    const dpr = window.devicePixelRatio || 1;
    const gap = 1.5; // 棋子之间的间隙
    const x = piece.x * this.canvasResizeService.cellSize + gap;
    const y = piece.y * this.canvasResizeService.cellSize + gap;
    const width = piece.width * this.canvasResizeService.cellSize + 1 - gap * 2;
    const height = piece.height * this.canvasResizeService.cellSize + 1 - gap * 2;
    const borderRadius = 8; // 圆角半径

    // 保存当前绘图状态
    ctx.save();

    // 创建圆角矩形路径
    this.createRoundedRectPath(ctx, x, y, width, height, borderRadius);
    ctx.clip();

    // 绘制更真实的木质棋子
    this.drawRealisticWoodenPiece(ctx, x, y, width, height, piece.name);

    // 绘制棋子名称
    // 根据棋子大小动态调整文字大小
    const fontSize = Math.max(12, Math.min(width / 4, height / 4, 24));
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

    // 根据棋子方向调整文字方向
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    if (height > width) {
      // 竖向棋子：绘制竖向排列的文字
      const chars = piece.name.split('');
      const charSpacing = fontSize * 0.9; // 字符间距
      const totalHeight = chars.length * charSpacing;
      const startY = centerY - totalHeight / 2 + charSpacing / 2;

      chars.forEach((char, index) => {
        const charY = startY + index * charSpacing;
        ctx.fillText(char, centerX, charY);
      });
    } else {
      // 横向棋子或正方形棋子：绘制横向文字
      ctx.fillText(piece.name, centerX, centerY);
    }

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

  // 使用木质贴图绘制棋盘背景
  private drawWoodenBoardWithImage(ctx: CanvasRenderingContext2D) {
    const boardWidth = this.canvasResizeService.boardWidth * this.canvasResizeService.cellSize + this.canvasResizeService.cellOffset;
    const boardHeight = this.canvasResizeService.boardHeight * this.canvasResizeService.cellSize + this.canvasResizeService.cellOffset;

    // 获取对应的木质贴图
    const woodImage = this.isDarkMode() ? this.woodDarkImage : this.woodLightImage;

    if (woodImage && woodImage.complete) {
      // 绘制木质贴图背景
      ctx.drawImage(woodImage, 0, 0, boardWidth, boardHeight);
    } else {
      // 如果图片未加载，使用简单的渐变作为备选
      this.drawFallbackBoard(ctx, boardWidth, boardHeight);
    }

    // 绘制边框
    ctx.strokeStyle = this.isDarkMode() ? '#3A2A1A' : '#6B4E2E';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, boardWidth, boardHeight);

    // 绘制内边框（高光效果）
    ctx.strokeStyle = this.isDarkMode() ? '#4A3A2A' : '#8B6F47';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, boardWidth - 6, boardHeight - 6);
  }

  // 备选的简单棋盘背景
  private drawFallbackBoard(ctx: CanvasRenderingContext2D, boardWidth: number, boardHeight: number) {
    const gradient = ctx.createLinearGradient(0, 0, boardWidth, boardHeight);
    const isDark = this.isDarkMode();

    if (isDark) {
      gradient.addColorStop(0, '#5A4A3A');
      gradient.addColorStop(0.3, '#4A3A2A');
      gradient.addColorStop(0.7, '#3A2A1A');
      gradient.addColorStop(1, '#2A1A0A');
    } else {
      gradient.addColorStop(0, '#D4B896');
      gradient.addColorStop(0.3, '#C8A87E');
      gradient.addColorStop(0.7, '#B29868');
      gradient.addColorStop(1, '#9C8356');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, boardWidth, boardHeight);
  }






}
