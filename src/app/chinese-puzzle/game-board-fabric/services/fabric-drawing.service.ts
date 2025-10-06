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


    // 绘制边框
    this.drawBorder(isDarkMode);

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
    const gap = 2; // 增大间距，从1.5增加到3

    // 创建多层棋子效果
    const objects = this.createMultiLayerPiece(piece, cellSize, gap, isDarkMode);

    // 创建棋子内容（图片或文字）
    const content = this.createPieceContent(piece, isDarkMode);
    objects.push(content);

    // 创建组
    const group = new Group(objects, {
      left: piece.x * cellSize + gap,
      top: piece.y * cellSize + gap,
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
    const baseRect = this.createBaseWoodRect(width, height, isDarkMode, piece.name);
    objects.push(baseRect);

    // 3. 创建内边框层（包含角色图片或木质背景图片）
    const innerBorder = this.createInnerBorder(width, height, isDarkMode, piece.name);
    objects.push(innerBorder);

    // 4. 创建光滑表面效果层
    const glossLayers = this.createGlossLayers(width, height, isDarkMode);
    objects.push(...glossLayers);

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
  private createBaseWoodRect(width: number, height: number, isDarkMode: boolean, pieceName: string): Rect {
    // 创建外层矩形框架，只有边框，无填充
    const rect = new Rect({
      left: 0,
      top: 0,
      width: width,
      height: height,
      rx: 8,
      ry: 8,
      fill: 'transparent', // 外层透明
      stroke: isDarkMode ? '#f5e5c9' : '#5a2508',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      absolutePositioned: true
    });

    return rect;
  }

  // 创建内边框层（包含角色图片或木质背景图片）
  private createInnerBorder(width: number, height: number, isDarkMode: boolean, pieceName: string): Rect {
    // 调整 padding，确保上下左右均匀
    const padding = 6; // 减少 padding，让背景更居中
    const strokeWidth = 2; // 减少边框宽度，避免占用过多空间

    // 首先尝试获取角色图片
    const pieceImage = this.imageLoadingService.getPieceImage(pieceName);

    let innerFill: string | Pattern;

    if (pieceImage && pieceImage.complete) {
      // 为不同尺寸的棋子调整图片显示策略
      const imgWidth = pieceImage.width;
      const imgHeight = pieceImage.height;

      // 创建一个临时canvas来绘制处理后的图片
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCanvas.width = width - padding * 2;
        tempCanvas.height = height - padding * 2;

        // 计算缩放比例，使用较大的缩放比例来填满区域，可能会裁剪图片
        const scaleX = tempCanvas.width / imgWidth;
        const scaleY = tempCanvas.height / imgHeight;
        const scale = Math.max(scaleX, scaleY); // 使用较大的缩放比例来填满区域

        // 计算缩放后的尺寸
        const displayWidth = imgWidth * scale;
        const displayHeight = imgHeight * scale;

        // 计算居中位置（可能为负值，表示图片超出显示区域）
        const x = (tempCanvas.width - displayWidth) / 2;
        const y = (tempCanvas.height - displayHeight) / 2;

        // 在临时canvas上绘制缩放后的图片，确保填满整个区域
        tempCtx.drawImage(pieceImage, x, y, displayWidth, displayHeight);

        // 如果是黑暗模式，调整图片以适应黑暗主题
        if (isDarkMode) {
          // 创建一个ImageData对象来处理像素
          const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const data = imageData.data;

          // 调整每个像素以适应黑暗模式，同时保持细节
          for (let i = 0; i < data.length; i += 4) {
            // 获取RGBA值
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // 应用亮度和对比度调整
            // 降低亮度
            r = r * 0.7;
            g = g * 0.7;
            b = b * 0.7;

            // 增加对比度
            r = ((r - 128) * 1.2) + 128;
            g = ((g - 128) * 1.2) + 128;
            b = ((b - 128) * 1.2) + 128;

            // 确保值在有效范围内
            r = Math.min(255, Math.max(0, r));
            g = Math.min(255, Math.max(0, g));
            b = Math.min(255, Math.max(0, b));

            // 设置调整后的值
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }

          // 将修改后的图像数据放回canvas
          tempCtx.putImageData(imageData, 0, 0);
        }

        // 使用临时canvas作为Pattern的source
        innerFill = new Pattern({
          source: tempCanvas,
          repeat: 'no-repeat'
        });
      } else {
        // 如果无法创建canvas，使用简单的Pattern，但仍使用max来填满区域
        const scaleX = (width - padding * 2) / imgWidth;
        const scaleY = (height - padding * 2) / imgHeight;
        const scale = Math.max(scaleX, scaleY);

        innerFill = new Pattern({
          source: pieceImage,
          repeat: 'no-repeat'
        });
      }
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
      stroke: isDarkMode ? '#9c5a2a' : '#c4a47a',
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












  // 创建棋子内容（当背景不是角色图片时显示图片或文字）
  private createPieceContent(piece: Piece, isDarkMode: boolean): any {
    const cellSize = this.fabricGameService.cellSize;
    const gap = 1.5;
    const width = piece.width * cellSize - gap * 2;
    const height = piece.height * cellSize - gap * 2;

    // 检查是否已经有角色图片作为背景
    const pieceImage = this.imageLoadingService.getPieceImage(piece.name);

    // 如果已经有角色图片作为背景，则不显示额外的内容
    if (pieceImage && pieceImage.complete) {
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
    const gap = 1.5;
    const newLeft = piece.x * cellSize + gap;
    const newTop = piece.y * cellSize + gap;


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

  // 缓出四次方函数 - 更明显的缓动效果
  private easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

}
