import { Injectable } from '@angular/core';
import { Canvas, Rect, Line, Text, Group, Pattern, Gradient, Shadow, Image } from 'fabric';
import { Piece } from '../../chinese-puzzle.type';
import { FabricGameService } from './fabric-game.service';
import { ImageLoadingService } from '../../services/image-loading.service';

@Injectable({
  providedIn: 'root'
})
export class FabricDrawingService {
  constructor(
    private fabricGameService: FabricGameService,
    private imageLoadingService: ImageLoadingService
  ) {}

  // 绘制棋盘
  drawBoard(isDarkMode: boolean): void {
    const canvas = this.fabricGameService.canvas;
    if (!canvas) return;

    // 不绘制边框，使用HTML的CSS边框
    // this.drawBorder(isDarkMode);

    // 绘制出口
    this.drawExit(isDarkMode);

    canvas.renderAll();
  }


  // 绘制边框
  private drawBorder(isDarkMode: boolean): void {
    const canvas = this.fabricGameService.canvas;
    if (!canvas) return;

    const dimensions = this.fabricGameService.getCanvasDimensions();
    const { width, height } = dimensions;

    // 外边框
    const outerBorder = new Rect({
      left: 0,
      top: 0,
      width: width,
      height: height,
      fill: 'transparent',
      stroke: isDarkMode ? '#3A2A1A' : '#6B4E2E',
      strokeWidth: 6,
      selectable: false,
      evented: false,
      absolutePositioned: true
    });

    // 内边框（高光效果）
    const innerBorder = new Rect({
      left: 3,
      top: 3,
      width: width - 6,
      height: height - 6,
      fill: 'transparent',
      stroke: isDarkMode ? '#4A3A2A' : '#8B6F47',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      absolutePositioned: true
    });

    canvas.add(outerBorder);
    canvas.add(innerBorder);
  }

  // 绘制出口
  private drawExit(isDarkMode: boolean): void {
    const canvas = this.fabricGameService.canvas;
    if (!canvas) return;

    const cellSize = this.fabricGameService.cellSize;
    const boardHeight = this.fabricGameService.boardHeight;
    const boardWidth = this.fabricGameService.boardWidth;
    const cellOffset = this.fabricGameService.cellOffset;

    const boardBottom = boardHeight * cellSize;
    const exitWidth = boardWidth * cellSize / 2;
    const exitX = exitWidth / 2;

    // 左侧开口边缘
    const leftEdge = new Line([0, boardBottom, exitX, boardBottom], {
      stroke: isDarkMode ? '#3A2A1A' : '#5D4037',
      strokeWidth: 3,
      selectable: false,
      evented: false
    });

    // 右侧开口边缘
    const rightEdge = new Line([exitX + exitWidth, boardBottom, boardWidth * cellSize, boardBottom], {
      stroke: isDarkMode ? '#3A2A1A' : '#5D4037',
      strokeWidth: 3,
      selectable: false,
      evented: false
    });

    // 左侧高光
    const leftHighlight = new Line([0, boardBottom - 1, exitX, boardBottom - 1], {
      stroke: isDarkMode ? '#4A3A2A' : '#8D6E63',
      strokeWidth: 1,
      selectable: false,
      evented: false
    });

    // 右侧高光
    const rightHighlight = new Line([exitX + exitWidth, boardBottom - 1, boardWidth * cellSize, boardBottom - 1], {
      stroke: isDarkMode ? '#4A3A2A' : '#8D6E63',
      strokeWidth: 1,
      selectable: false,
      evented: false
    });

    // 出口文字
    const exitText = new Text('出口', {
      left: (boardWidth * cellSize) / 2,
      top: boardBottom + cellOffset / 2 - 20,
      fontSize: 20,
      fill: isDarkMode ? '#B4A490' : '#3D2F1F',
      fontFamily: 'Arial',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    });

    canvas.add(leftEdge, rightEdge, leftHighlight, rightHighlight, exitText);
  }

  // 创建棋子组
  createPieceGroup(piece: Piece, isDarkMode: boolean): Group {
    const cellSize = this.fabricGameService.cellSize;
    const gap = 1; // 减小间距，与DOM版本保持一致

    // 创建多层棋子效果
    const objects = this.createMultiLayerPiece(piece, cellSize, gap, isDarkMode);

    // 创建棋子内容（图片或文字）
    const content = this.createPieceContent(piece, isDarkMode);
    objects.push(content);

    // 创建组
    const group = new Group(objects, {
      left: piece.x * cellSize + gap - 1,
      top: piece.y * cellSize + gap - 1,
      selectable: true,
      hasControls: false,
      hasBorders: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true
    });

    // 添加自定义属性
    (group as any).pieceId = piece.id;
    (group as any).pieceName = piece.name;

    // 存储原始位置信息
    (group as any).originalLeft = group.left;
    (group as any).originalTop = group.top;
    // 初始化最后有效位置为当前位置
    (group as any).lastValidLeft = group.left;
    (group as any).lastValidTop = group.top;
    // 存储原始缩放信息
    (group as any).originalScaleX = group.scaleX || 1;
    (group as any).originalScaleY = group.scaleY || 1;

    return group;
  }

  // 创建多层棋子效果
  private createMultiLayerPiece(piece: Piece, cellSize: number, gap: number, isDarkMode: boolean): any[] {
    const width = piece.width * cellSize - gap * 2;
    const height = piece.height * cellSize - gap * 2;
    const objects: any[] = [];

    // 1. 创建外阴影层（模拟多个阴影叠加）
    const shadowLayers = this.createShadowLayers(width, height, isDarkMode);
    objects.push(...shadowLayers);

    // 2. 创建基础木质矩形（包含背景图片）
    const baseRect = this.createBaseWoodRect(width, height, isDarkMode, piece);
    objects.push(baseRect);

    // 3. 创建内边框层（包含角色图片或木质背景图片）
    const innerBorder = this.createInnerBorder(width, height, isDarkMode, piece);
    objects.push(innerBorder);

    // 4. 创建光滑表面效果层
    const glossLayers = this.createGlossLayers(width, height, isDarkMode);
    objects.push(...glossLayers);

    // 5. 在黑暗模式下为图片添加深色叠加层
    if (isDarkMode) {
      const darkOverlay = this.createDarkOverlay(width, height, piece);
      if (darkOverlay) {
        objects.push(darkOverlay);
      }
    }

    return objects;
  }

  // 创建阴影层（模拟Canvas版本的多层阴影效果）
  private createShadowLayers(width: number, height: number, isDarkMode: boolean): Rect[] {
    const shadows: Rect[] = [];

    // 第一层阴影（较远）
    const shadow1 = new Rect({
      left: 4,
      top: 8,
      width: width,
      height: height,
      rx: 8,
      ry: 8,
      fill: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
      selectable: false,
      evented: false,
      absolutePositioned: true
    });
    shadows.push(shadow1);

    // 第二层阴影（较近）
    const shadow2 = new Rect({
      left: 2,
      top: 4,
      width: width,
      height: height,
      rx: 8,
      ry: 8,
      fill: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)',
      selectable: false,
      evented: false,
      absolutePositioned: true
    });
    shadows.push(shadow2);

    return shadows;
  }

  // 创建基础棋子矩形（外层边框，无背景）
  private createBaseWoodRect(width: number, height: number, isDarkMode: boolean, piece: Piece): Rect {
    // 创建外层矩形框架，只有边框，无填充
    const rect = new Rect({
      left: 0,
      top: 0,
      width: width,
      height: height,
      rx: 8,
      ry: 8,
      fill: 'transparent', // 外层透明
      stroke: '#5a2508',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      absolutePositioned: true
    });

    return rect;
  }

  // 创建内边框层（包含角色图片或木质背景图片）
  private createInnerBorder(width: number, height: number, isDarkMode: boolean, piece: Piece): Rect {
    // 调整 padding，确保上下左右均匀
    const padding = 3; // 进一步减少 padding，让图片更大
    const strokeWidth = 2; // 减少边框宽度，避免占用过多空间

    // 首先根据棋子的实际尺寸获取正确的图片，而不是依赖piece.img属性
    const correctImage = this.getCorrectPieceImage(piece);
    
    let innerFill: string | Pattern;

    if (correctImage && correctImage.complete) {
      // 计算适配棋子大小的缩放比例
      const imgWidth = correctImage.width;
      const imgHeight = correctImage.height;
      const targetWidth = width - padding * 2;
      const targetHeight = height - padding * 2;
      
      // 使用较大的缩放比例来填满区域（保持DOM版本的行为）
      const scaleX = targetWidth / imgWidth;
      const scaleY = targetHeight / imgHeight;
      const scale = Math.max(scaleX, scaleY);
      
      // 计算居中偏移
      const offsetX = (targetWidth - imgWidth * scale) / 2;
      const offsetY = (targetHeight - imgHeight * scale) / 2;
      
      // 直接使用正确的图片创建Pattern，但添加适当的缩放变换
      innerFill = new Pattern({
        source: correctImage,
        repeat: 'no-repeat',
        patternTransform: [scale, 0, 0, scale, offsetX, offsetY]
      });
    } else {
        // 如果没有角色图片，回退到使用木质纹理图片
        const woodImage = isDarkMode ?
          this.imageLoadingService.getWoodDarkImage() :
          this.imageLoadingService.getWoodLightImage();

        if (woodImage && woodImage.complete) {
          // 使用木质纹理图片作为内层背景
          innerFill = new Pattern({
            source: woodImage,
            repeat: 'repeat',
            offsetX: 0,
            offsetY: 0
          });
        } else {
          // 如果图片未加载，使用颜色作为备用
          innerFill = isDarkMode ? '#8B4513' : '#D4A76A';
        }
      }

    return new Rect({
      left: padding,
      top: padding,
      width: width - padding * 2,
      height: height - padding * 2,
      rx: 6,
      ry: 6,
      fill: innerFill, // 内层填充角色图片或木质纹理
      stroke: '#c4a47a',
      strokeWidth: strokeWidth,
      selectable: false,
      evented: false,
      absolutePositioned: true
    });
  }

  // 创建光滑表面效果层
  private createGlossLayers(width: number, height: number, isDarkMode: boolean): Rect[] {
    const glossLayers: Rect[] = [];

    // 顶部高光效果
    const topGloss = new Rect({
      left: 4,
      top: 4,
      width: width - 8,
      height: height * 0.3,
      rx: 6,
      ry: 6,
      fill: this.createTopGlossGradient(width - 8, height * 0.3, isDarkMode),
      selectable: false,
      evented: false,
      absolutePositioned: true,
      opacity: 0.4
    });
    glossLayers.push(topGloss);

    // 底部阴影效果
    const bottomShadow = new Rect({
      left: 4,
      top: height * 0.7,
      width: width - 8,
      height: height * 0.3 - 4,
      rx: 6,
      ry: 6,
      fill: this.createBottomShadowGradient(width - 8, height * 0.3, isDarkMode),
      selectable: false,
      evented: false,
      absolutePositioned: true,
      opacity: 0.3
    });
    glossLayers.push(bottomShadow);

    return glossLayers;
  }

  // 创建顶部光泽渐变
  private createTopGlossGradient(width: number, height: number, isDarkMode: boolean): Gradient<any, any> {
    return new Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: 0, y2: height },
      colorStops: isDarkMode ? [
        { offset: 0, color: 'rgba(255, 255, 255, 0.3)' },
        { offset: 1, color: 'rgba(255, 255, 255, 0)' }
      ] : [
        { offset: 0, color: 'rgba(255, 255, 255, 0.5)' },
        { offset: 1, color: 'rgba(255, 255, 255, 0)' }
      ]
    });
  }

  // 创建底部阴影渐变
  private createBottomShadowGradient(width: number, height: number, isDarkMode: boolean): Gradient<any, any> {
    return new Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: 0, y2: height },
      colorStops: isDarkMode ? [
        { offset: 0, color: 'rgba(0, 0, 0, 0)' },
        { offset: 1, color: 'rgba(0, 0, 0, 0.4)' }
      ] : [
        { offset: 0, color: 'rgba(0, 0, 0, 0)' },
        { offset: 1, color: 'rgba(0, 0, 0, 0.2)' }
      ]
    });
  }

  // 为黑暗模式创建深色叠加层
  private createDarkOverlay(width: number, height: number, piece: Piece): Rect | null {
    // 只有当棋子有图片时才添加深色叠加层
    const correctImage = this.getCorrectPieceImage(piece);
    if (!correctImage || !correctImage.complete) {
      return null;
    }

    const padding = 3; // 与内边框层的padding保持一致

    return new Rect({
      left: padding,
      top: padding,
      width: width - padding * 2,
      height: height - padding * 2,
      rx: 6,
      ry: 6,
      fill: 'rgba(0, 0, 0, 0.3)', // 30%透明度的黑色叠加
      selectable: false,
      evented: false,
      absolutePositioned: true
    });
  }












  // 创建棋子内容（当背景不是角色图片时显示图片或文字）
  private createPieceContent(piece: Piece, isDarkMode: boolean): any {
    const cellSize = this.fabricGameService.cellSize;
    const gap = 1; // 与其他地方的间距保持一致
    const width = piece.width * cellSize - gap * 2;
    const height = piece.height * cellSize - gap * 2;

    // 检查是否已经有角色图片作为背景，使用正确的图片获取方法
    const correctImage = this.getCorrectPieceImage(piece);

    // 如果已经有角色图片作为背景，则不显示额外的内容
    if (correctImage && correctImage.complete) {
      // 创建一个透明的占位矩形
      const placeholder = new Rect({
        left: width / 2,
        top: height / 2,
        width: 0,
        height: 0,
        fill: 'transparent',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        absolutePositioned: true
      });

      return placeholder;
    } else {
      // 没有角色图片作为背景时显示文字
      const fontSize = Math.max(12, Math.min(width / 4, height / 4, 24)) * 0.8;

      let textContent = piece.name;
      let fontSizeAdjusted = fontSize;

      if (height > width) {
        // 竖向棋子：文字竖向排列
        const chars = piece.name.split('');
        textContent = chars.join('\n');
        // 调整竖向文字的字体大小，使其与横向文字大小一致
        fontSizeAdjusted = fontSize;
      }

      const text = new Text(textContent, {
        left: width / 2,
        top: height / 2,
        fontSize: fontSizeAdjusted,
        fill: isDarkMode ? '#F5DEB3' : '#8B4513', // 与原版相同的文字颜色
        fontFamily: 'Arial',
        fontWeight: 'bold',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        absolutePositioned: true,
        shadow: new Shadow({
          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)',
          blur: 1,
          offsetX: 0,
          offsetY: 0
        })
      });

      return text;
    }
  }



  // 更新棋子位置（带平滑动画）
  updatePiecePosition(piece: Piece): void {
    const pieceObject = this.fabricGameService.getPieceObject(piece.id);
    if (!pieceObject) return;

    const cellSize = this.fabricGameService.cellSize;
    const gap = 1; // 与创建棋子时的间距保持一致
    const newLeft = piece.x * cellSize + gap - 1;
    const newTop = piece.y * cellSize + gap - 1;


    // 使用 requestAnimationFrame 实现更可控的动画
    this.animatePieceToPosition(pieceObject, newLeft, newTop, () => {
      // 动画完成后更新原始位置信息
      (pieceObject as any).originalLeft = newLeft;
      (pieceObject as any).originalTop = newTop;
    });
  }

  // 直接设置棋子位置（无动画效果）
  private animatePieceToPosition(
    pieceObject: any,
    targetLeft: number,
    targetTop: number,
    onComplete?: () => void
  ): void {
    // 直接设置棋子位置
    pieceObject.set({
      left: targetLeft,
      top: targetTop
    });

    // 重新渲染画布
    this.fabricGameService.canvas?.renderAll();

    // 立即执行完成回调
    if (onComplete) {
      onComplete();
    }
  }

  // 根据棋子尺寸获取正确的图片
  private getCorrectPieceImage(piece: Piece): HTMLImageElement | undefined {
    // 首先尝试使用原始图片路径（如果存在）
    if (piece.img) {
      const originalImage = this.imageLoadingService.getPieceImage(piece.img);
      if (originalImage && originalImage.complete) {
        return originalImage;
      }
    }

    // 根据棋子名称和尺寸确定正确的图片路径
    const baseName = piece.name.replace(/[12]$/, ''); // 移除可能的尺寸后缀
    
    // 检查是否是需要特殊处理的角色
    const specialCharacters = ['张飞', '马超', '关羽', '赵云', '黄忠'];
    
    if (specialCharacters.some(char => baseName.includes(char))) {
      // 根据棋子的实际尺寸确定图片名称
      const sizeCode = `${piece.width}${piece.height}`;
      const imagePath = `assets/img/chinese-puzzle/${baseName}${sizeCode}.png`;
      
      // 尝试从ImageLoadingService获取这个图片
      const correctImage = this.imageLoadingService.getPieceImage(imagePath);
      if (correctImage && correctImage.complete) {
        return correctImage;
      }

      // 如果当前尺寸的图片不存在，尝试其他尺寸的图片作为回退
      const alternateSizes = ['12', '21'];
      for (const altSize of alternateSizes) {
        if (altSize !== sizeCode) {
          const altImagePath = `assets/img/chinese-puzzle/${baseName}${altSize}.png`;
          const altImage = this.imageLoadingService.getPieceImage(altImagePath);
          if (altImage && altImage.complete) {
            return altImage;
          }
        }
      }
    }

    // 对于其他角色（如曹操、卒等），直接使用原始图片路径
    if (piece.img) {
      return this.imageLoadingService.getPieceImage(piece.img);
    }
    
    return undefined;
  }

  // 缓出四次方函数 - 更明显的缓动效果
  private easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

}
