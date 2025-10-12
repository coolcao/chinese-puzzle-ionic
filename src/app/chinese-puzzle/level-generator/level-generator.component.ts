import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Piece } from '../chinese-puzzle.type';
import { CanvasDrawingService } from '../services/canvas-drawing.service';
import { ImageLoadingService } from '../services/image-loading.service';
import { environment } from '../../../environments/environment';

// 扩展 Piece 类型以包含 templateId 和其他编辑器状态
interface EditorPiece extends Piece {
  templateId: number;
  isDragging?: boolean;
}

@Component({
  selector: 'app-level-generator',
  standalone: false,
  templateUrl: './level-generator.component.html',
  styleUrls: ['./level-generator.component.css']
})
export class LevelGeneratorComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private canvasDrawingService = inject(CanvasDrawingService);
  private imageLoadingService = inject(ImageLoadingService);

  @ViewChild('editorCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  // 棋盘尺寸和单元格大小
  readonly boardWidth = 4;
  readonly boardHeight = 5;
  readonly cellSize = 100;

  // 状态
  levelName = '';
  levelDifficulty = '初级';
  message = '';
  messageType: 'info' | 'success' | 'error' = 'info'; // 提示类型
  pieces: EditorPiece[] = [];
  isAnimating = false;
  solutionPath: EditorPiece[][] | null = null;
  
  // 验证时间统计
  validationTime = 0;
  
  // 动画控制
  animationInterval: any = null;
  animationPaused = false;
  currentAnimationStep = 0;

  // 棋子模板
  allPieceTemplates = [
    { id: 1, name: '曹操', width: 2, height: 2, img: 'assets/img/chinese-puzzle/曹操.png' },
    { id: 2, name: '关羽', width: 2, height: 1, img: 'assets/img/chinese-puzzle/关羽21.png' },
    { id: 3, name: '张飞', width: 1, height: 2, img: 'assets/img/chinese-puzzle/张飞12.png' },
    { id: 4, name: '赵云', width: 1, height: 2, img: 'assets/img/chinese-puzzle/赵云12.png' },
    { id: 5, name: '马超', width: 1, height: 2, img: 'assets/img/chinese-puzzle/马超12.png' },
    { id: 6, name: '黄忠', width: 1, height: 2, img: 'assets/img/chinese-puzzle/黄忠12.png' },
    { id: 7, name: '卒', width: 1, height: 1, img: 'assets/img/chinese-puzzle/卒.png' }
  ];
  pieceStock: Array<{ template: any, count: number }> = [];

  // 拖拽状态
  private draggedPiece: EditorPiece | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private draggedFromTemplate: any = null;
  private draggedTemplatePreviewPos: { x: number, y: number } | null = null;

  // 监听黑暗模式
  private darkModeMediaQuery: MediaQueryList | null = null;
  private darkModeListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() { }

  ngOnInit() {
    if (environment.production) {
      this.router.navigate(['/']);
      return;
    }
    this.resetBoard();
    this.preLoadImages();
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.initDarkModeListener();
  }

  ngOnDestroy() {
    if (this.darkModeMediaQuery && this.darkModeListener) {
      this.darkModeMediaQuery.removeEventListener('change', this.darkModeListener);
    }
    // 清理动画定时器
    this.stopAnimation();
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = this.boardWidth * this.cellSize;
    canvas.height = this.boardHeight * this.cellSize;
    this.draw();
  }

  private initDarkModeListener() {
    if (window.matchMedia) {
      this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.darkModeListener = () => this.draw();
      this.darkModeMediaQuery.addEventListener('change', this.darkModeListener);
    }
  }

  private preLoadImages() {
    const piecesToLoad: Piece[] = [];
    this.allPieceTemplates.forEach(template => {
      piecesToLoad.push({ ...template, x: 0, y: 0, id: 0 });
      if (template.width !== template.height) {
        const baseName = template.name.replace(/\d+$/, '');
        const rotatedImgPath = `assets/img/chinese-puzzle/${baseName}${template.height}${template.width}.png`;
        piecesToLoad.push({
          ...template,
          img: rotatedImgPath,
          x: 0, y: 0, id: 0
        });
      }
    });

    this.imageLoadingService.preLoadImage(piecesToLoad).then(() => {
      this.draw();
    });
  }

  private invalidateSolution() {
    this.solutionPath = null;
    this.message = '';
  }

  // #region 绘图逻辑
  private draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.drawGrid();
    this.pieces.forEach(p => {
      if (!p.isDragging) {
        this.drawPiece(p);
      }
    });

    if (this.draggedFromTemplate && this.draggedTemplatePreviewPos) {
      const template = this.draggedFromTemplate;
      const ghostPiece: EditorPiece = {
        id: 0, templateId: template.id, name: template.name, img: template.img,
        width: template.width, height: template.height,
        x: this.draggedTemplatePreviewPos.x - (template.width * this.cellSize) / 2,
        y: this.draggedTemplatePreviewPos.y - (template.height * this.cellSize) / 2,
        isDragging: true
      };
      this.drawPiece(ghostPiece);
    }

    if (this.draggedPiece && this.draggedPiece.isDragging) {
      this.drawPiece(this.draggedPiece);
    }
  }

  private drawGrid() {
    this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.15)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.boardWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize, 0);
      this.ctx.lineTo(x * this.cellSize, this.boardHeight * this.cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.boardHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize);
      this.ctx.lineTo(this.boardWidth * this.cellSize, y * this.cellSize);
      this.ctx.stroke();
    }
  }

  private drawPiece(piece: EditorPiece) {
    if (!piece.img) {
      console.warn('Piece is missing img property:', piece);
      return;
    }
    const pieceImage = this.imageLoadingService.getPieceImage(piece.img);
    if (!pieceImage) {
      console.warn(`Image not found for ${piece.img}`);
      return;
    }

    const x = piece.isDragging ? piece.x : piece.x * this.cellSize;
    const y = piece.isDragging ? piece.y : piece.y * this.cellSize;
    const width = piece.width * this.cellSize;
    const height = piece.height * this.cellSize;

    this.ctx.save();
    if (piece.isDragging) {
      this.ctx.globalAlpha = 0.7;
    }
    this.ctx.drawImage(pieceImage, x, y, width, height);
    this.ctx.restore();

    if (!piece.isDragging) {
      this.drawDeleteButton(piece);
      this.drawRotateButton(piece);
    }
  }

  private drawDeleteButton(piece: EditorPiece) {
    const btnSize = 28;
    const piecePixelX = piece.x * this.cellSize;
    const piecePixelY = piece.y * this.cellSize;
    const piecePixelWidth = piece.width * this.cellSize;

    // 向左下移动：减少右边距，增加上边距
    const btnX = piecePixelX + piecePixelWidth - (btnSize / 2) - 5;
    const btnY = piecePixelY + (btnSize / 2) + 5;

    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    this.ctx.beginPath();
    this.ctx.arc(btnX, btnY, btnSize / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('×', btnX, btnY);
  }

  private drawRotateButton(piece: EditorPiece) {
    if (piece.width === piece.height) return; // Not a rectangle

    const btnSize = 28;
    const piecePixelX = piece.x * this.cellSize;
    const piecePixelY = piece.y * this.cellSize;

    // 向右下移动：增加左边距和上边距
    const btnX = piecePixelX + (btnSize / 2) + 5;
    const btnY = piecePixelY + (btnSize / 2) + 5;

    // Draw circle
    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.85)'; // Blue
    this.ctx.beginPath();
    this.ctx.arc(btnX, btnY, btnSize / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Draw rotate icon (simple curved arrow)
    this.ctx.save();
    this.ctx.translate(btnX, btnY);
    this.ctx.rotate(-Math.PI / 4);
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, btnSize * 0.3, 0, Math.PI * 1.5);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(btnSize * 0.3, -btnSize * 0.1);
    this.ctx.lineTo(btnSize * 0.3, btnSize * 0.1);
    this.ctx.lineTo(btnSize * 0.5, 0);
    this.ctx.closePath();
    this.ctx.fillStyle = 'white';
    this.ctx.fill();
    this.ctx.restore();
  }
  // #endregion

  // #region 棋盘内拖拽
  onMouseDown(event: MouseEvent) {
    if (this.isAnimating) return;
    const pos = this.getCanvasPos(event);
    const clickedPiece = this.getPieceAt(pos.x, pos.y);

    if (clickedPiece) {
      const btnSize = 28;
      const piecePixelX = clickedPiece.x * this.cellSize;
      const piecePixelY = clickedPiece.y * this.cellSize;

      // Check for rotate button click
      if (clickedPiece.width !== clickedPiece.height) {
        const rotateBtnX = piecePixelX + (btnSize / 2) + 5;
        const rotateBtnY = piecePixelY + (btnSize / 2) + 5;
        const rotateDist = Math.sqrt(Math.pow(pos.x - rotateBtnX, 2) + Math.pow(pos.y - rotateBtnY, 2));
        if (rotateDist <= btnSize / 2) {
          this.rotatePiece(clickedPiece);
          return;
        }
      }

      // Check for delete button click
      const piecePixelWidth = clickedPiece.width * this.cellSize;
      const deleteBtnX = piecePixelX + piecePixelWidth - (btnSize / 2) - 5;
      const deleteBtnY = piecePixelY + (btnSize / 2) + 5;
      const deleteDist = Math.sqrt(Math.pow(pos.x - deleteBtnX, 2) + Math.pow(pos.y - deleteBtnY, 2));
      if (deleteDist <= btnSize / 2) {
        this.removePiece(clickedPiece);
        return;
      }

      // If not a button click, start dragging
      this.invalidateSolution();
      this.draggedPiece = clickedPiece;
      this.draggedPiece.isDragging = true;
      this.dragOffsetX = pos.x - (clickedPiece.x * this.cellSize);
      this.dragOffsetY = pos.y - (clickedPiece.y * this.cellSize);
    }
  }

  onMouseMove(event: MouseEvent) {
    const pos = this.getCanvasPos(event);
    let onAButton = false;

    if (!this.draggedPiece && !this.isAnimating) {
      for (const piece of this.pieces) {
        const btnSize = 28;
        const piecePixelX = piece.x * this.cellSize;
        const piecePixelY = piece.y * this.cellSize;

        // Check hover on rotate button
        if (piece.width !== piece.height) {
          const rotateBtnX = piecePixelX + (btnSize / 2) + 5;
          const rotateBtnY = piecePixelY + (btnSize / 2) + 5;
          const rotateDist = Math.sqrt(Math.pow(pos.x - rotateBtnX, 2) + Math.pow(pos.y - rotateBtnY, 2));
          if (rotateDist <= btnSize / 2) {
            onAButton = true;
            break;
          }
        }

        // Check hover on delete button
        const piecePixelWidth = piece.width * this.cellSize;
        const deleteBtnX = piecePixelX + piecePixelWidth - (btnSize / 2) - 5;
        const deleteBtnY = piecePixelY + (btnSize / 2) + 5;
        const deleteDist = Math.sqrt(Math.pow(pos.x - deleteBtnX, 2) + Math.pow(pos.y - deleteBtnY, 2));
        if (deleteDist <= btnSize / 2) {
          onAButton = true;
          break;
        }
      }
    }

    this.ctx.canvas.style.cursor = this.isAnimating ? 'default' : (onAButton ? 'pointer' : (this.draggedPiece ? 'grabbing' : 'grab'));

    if (this.draggedPiece) {
      const pieceWidthPx = this.draggedPiece.width * this.cellSize;
      const pieceHeightPx = this.draggedPiece.height * this.cellSize;
      const boardWidthPx = this.boardWidth * this.cellSize;
      const boardHeightPx = this.boardHeight * this.cellSize;

      let newX = pos.x - this.dragOffsetX;
      let newY = pos.y - this.dragOffsetY;

      newX = Math.max(0, Math.min(newX, boardWidthPx - pieceWidthPx));
      newY = Math.max(0, Math.min(newY, boardHeightPx - pieceHeightPx));

      this.draggedPiece.x = newX;
      this.draggedPiece.y = newY;
      this.draw();
    }
  }

  onMouseUp(event: MouseEvent) {
    if (this.draggedPiece) {
      const gridX = Math.round(this.draggedPiece.x / this.cellSize);
      const gridY = Math.round(this.draggedPiece.y / this.cellSize);

      this.draggedPiece.isDragging = false;
      const tempPiece = { ...this.draggedPiece, x: gridX, y: gridY };

      if (this.isValidPosition(tempPiece)) {
        this.draggedPiece.x = gridX;
        this.draggedPiece.y = gridY;
      }
      this.draggedPiece = null;
      this.draw();
    }
  }

  onMouseLeave(event: MouseEvent) {
    if (this.draggedPiece) {
      this.onMouseUp(event);
    }
  }

  private rotatePiece(piece: EditorPiece) {
    const tempRotatedPiece = {
      ...piece,
      width: piece.height,
      height: piece.width
    };

    if (this.isValidPosition(tempRotatedPiece)) {
      piece.width = tempRotatedPiece.width;
      piece.height = tempRotatedPiece.height;

      const baseName = piece.name.replace(/\d+$/, '');
      piece.img = `assets/img/chinese-puzzle/${baseName}${piece.width}${piece.height}.png`;

      this.invalidateSolution();
      this.draw();
    } else {
      this.showMessage('无法旋转，空间不足或与其它棋子冲突', true, 'error');
    }
  }
  // #endregion

  // #region 从模板拖拽
  onTemplateDragStart(event: DragEvent, template: any) {
    if (this.isAnimating) {
      event.preventDefault();
      return;
    }
    this.draggedFromTemplate = template;
    if (event.dataTransfer) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      event.dataTransfer.setDragImage(canvas, 0, 0);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onTemplateDragEnd(event: DragEvent) {
    this.draggedFromTemplate = null;
    this.draggedTemplatePreviewPos = null;
    this.draw();
  }

  onCanvasDragOver(event: DragEvent) {
    event.preventDefault();
    if (this.draggedFromTemplate) {
      this.draggedTemplatePreviewPos = this.getCanvasPos(event);
      this.draw();
    }
  }

  onCanvasDragLeave(event: DragEvent) {
    this.draggedTemplatePreviewPos = null;
    this.draw();
  }

  onCanvasDrop(event: DragEvent) {
    event.preventDefault();
    if (!this.draggedFromTemplate) return;

    const pos = this.getCanvasPos(event);
    const template = this.draggedFromTemplate;

    const pieceWidthPx = template.width * this.cellSize;
    const pieceHeightPx = template.height * this.cellSize;
    const topLeftX = pos.x - pieceWidthPx / 2;
    const topLeftY = pos.y - pieceHeightPx / 2;

    const gridX = Math.round(topLeftX / this.cellSize);
    const gridY = Math.round(topLeftY / this.cellSize);

    const newPiece: EditorPiece = {
      ...template,
      id: Date.now(),
      templateId: template.id,
      x: gridX,
      y: gridY
    };

    if (this.isValidPosition(newPiece)) {
      this.pieces.push(newPiece);
      const stockItem = this.pieceStock.find(item => item.template.id === newPiece.templateId);
      if (stockItem) {
        stockItem.count--;
      }
      this.invalidateSolution();
    } else {
      this.showMessage('目标位置已被占据或超出边界', true, 'error');
    }

    this.draggedFromTemplate = null;
    this.draggedTemplatePreviewPos = null;
    this.draw();
  }

  public rotateTemplate(template: any): void {
    if (template.width === template.height) { return; }
    const temp = template.width;
    template.width = template.height;
    template.height = temp;

    const baseName = template.name.replace(/\d+$/, '');
    template.img = `assets/img/chinese-puzzle/${baseName}${template.width}${template.height}.png`;
  }
  // #endregion

  // #region 辅助函数
  private getCanvasPos(event: MouseEvent | DragEvent): { x: number, y: number } {
    const rect = this.ctx.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private getPieceAt(x: number, y: number): EditorPiece | null {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      const pieceX = p.x * this.cellSize;
      const pieceY = p.y * this.cellSize;
      if (x >= pieceX && x <= pieceX + p.width * this.cellSize &&
        y >= pieceY && y <= pieceY + p.height * this.cellSize) {
        return p;
      }
    }
    return null;
  }

  private isValidPosition(piece: EditorPiece): boolean {
    if (piece.x < 0 || piece.y < 0 ||
      piece.x + piece.width > this.boardWidth ||
      piece.y + piece.height > this.boardHeight) {
      return false;
    }
    for (const other of this.pieces) {
      if (piece.id === other.id) continue;
      if (piece.x < other.x + other.width &&
        piece.x + piece.width > other.x &&
        piece.y < other.y + other.height &&
        piece.y + piece.height > other.y) {
        return false;
      }
    }
    return true;
  }

  private removePiece(pieceToRemove: EditorPiece) {
    this.pieces = this.pieces.filter(p => p.id !== pieceToRemove.id);
    const stockItem = this.pieceStock.find(item => item.template.id === pieceToRemove.templateId);
    if (stockItem) {
      stockItem.count++;
    }
    this.invalidateSolution();
    this.draw();
  }

  private showMessage(msg: string, autoClear = true, type: 'info' | 'success' | 'error' = 'info') {
    this.message = msg;
    this.messageType = type;
    if (autoClear) {
      setTimeout(() => {
        if (this.message === msg) {
          this.message = '';
        }
      }, 3000);
    }
  }
  // #endregion

  // #region 顶部和底部按钮
  goHome() {
    this.router.navigate(['/']);
  }

  resetBoard() {
    this.pieces = [];
    this.pieceStock = this.allPieceTemplates.map(template => ({
      template: JSON.parse(JSON.stringify(template)), // Deep copy
      count: template.name === '卒' ? 4 : 1
    }));
    this.invalidateSolution();
    if (this.ctx) {
      this.draw();
    }
  }

  async validateData(): Promise<boolean> {
    this.invalidateSolution();
    if (this.isAnimating) return false;
    
    if (this.pieces.length === 0) {
      this.showMessage('请至少添加一个棋子', true, 'error');
      return false;
    }
    const caocao = this.pieces.find(p => p.name === '曹操');
    if (!caocao) {
      this.showMessage('必须包含曹操棋子', true, 'error');
      return false;
    }

    this.showMessage('正在检查解法, 请稍候...', false, 'info');

    // 开始计时
    const startTime = performance.now();
    const solutionPath = await this.isSolvable();
    const endTime = performance.now();
    
    // 计算验证耗时
    this.validationTime = Math.round(endTime - startTime);

    if (solutionPath) {
      this.solutionPath = solutionPath;
      const steps = solutionPath.length - 1;
      this.showMessage(`数据合法, 关卡有解! 最佳步数: ${steps}, 验证耗时: ${this.validationTime}ms`, false, 'success');
      return true;
    } else {
      this.showMessage(`数据合法, 但当前关卡无解! 验证耗时: ${this.validationTime}ms`, true, 'error');
      return false;
    }
  }

  animateSolution() {
    if (!this.solutionPath) return;

    const path = this.solutionPath;
    this.isAnimating = true;
    this.animationPaused = false;
    this.currentAnimationStep = 0;
    this.invalidateSolution();

    this.showMessage('🎬 正在演示解法步骤...', false, 'info');

    this.animationInterval = setInterval(() => {
      if (!this.animationPaused && this.currentAnimationStep < path.length) {
        this.pieces = path[this.currentAnimationStep];
        this.draw();
        this.currentAnimationStep++;
        
        // 更新进度提示
        if (this.currentAnimationStep < path.length) {
          const progress = this.currentAnimationStep;
          const total = path.length - 1;
          this.showMessage(`🎬 演示步骤 ${progress}/${total} - 可暂停/恢复动画`, false, 'info');
        }
      } else if (this.currentAnimationStep >= path.length) {
        this.stopAnimation();
        this.showMessage('✅ 解法演示完成!', true, 'success');
      }
    }, 1000);
  }

  pauseAnimation() {
    if (this.isAnimating) {
      this.animationPaused = !this.animationPaused;
      if (this.animationPaused) {
        this.showMessage('⏸️ 动画已暂停 - 点击恢复继续演示', false, 'info');
      } else {
        const progress = this.currentAnimationStep;
        const total = this.solutionPath ? this.solutionPath.length - 1 : 0;
        this.showMessage(`▶️ 动画已恢复 - 步骤 ${progress}/${total}`, false, 'info');
      }
    }
  }

  stopAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
    this.isAnimating = false;
    this.animationPaused = false;
    this.currentAnimationStep = 0;
    this.draw();
  }

  private async isSolvable(): Promise<EditorPiece[][] | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        const initialState = this.pieces;
        const goalPieceName = '曹操';
        const goalX = 1;
        const goalY = 3;

        const queue: EditorPiece[][] = [initialState];
        const predecessors = new Map<string, EditorPiece[][]>();
        predecessors.set(this.getBoardStateHash(initialState), [initialState]);

        let path: EditorPiece[][] | null = null;

        while (queue.length > 0) {
          const currentState = queue.shift()!;
          const currentPath = predecessors.get(this.getBoardStateHash(currentState))!;

          const caocao = currentState.find(p => p.name === goalPieceName);
          if (caocao && caocao.x === goalX && caocao.y === goalY) {
            path = currentPath;
            break;
          }

          const successors = this.getSuccessors(currentState);
          for (const successor of successors) {
            const hash = this.getBoardStateHash(successor);
            if (!predecessors.has(hash)) {
              const newPath = [...currentPath, successor];
              predecessors.set(hash, newPath);
              queue.push(successor);
            }
          }
        }
        resolve(path);
      }, 0);
    });
  }

  private getBoardStateHash(pieces: EditorPiece[]): string {
    const grid = Array(this.boardHeight).fill(null).map(() => Array(this.boardWidth).fill(0));
    pieces.forEach(p => {
      for (let y = p.y; y < p.y + p.height; y++) {
        for (let x = p.x; x < p.x + p.width; x++) {
          grid[y][x] = p.templateId;
        }
      }
    });
    return grid.flat().join(',');
  }

  private getSuccessors(pieces: EditorPiece[]): EditorPiece[][] {
    const successors: EditorPiece[][] = [];
    const moves = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      for (const move of moves) {
        const newX = piece.x + move.dx;
        const newY = piece.y + move.dy;

        const newPiece = { ...piece, x: newX, y: newY };

        if (newX < 0 || newY < 0 || newX + piece.width > this.boardWidth || newY + piece.height > this.boardHeight) {
          continue;
        }

        let isBlocked = false;
        const otherPieces = pieces.filter(p => p.id !== piece.id);
        for (const other of otherPieces) {
          if (newPiece.x < other.x + other.width &&
            newPiece.x + newPiece.width > other.x &&
            newPiece.y < other.y + other.height &&
            newPiece.y + newPiece.height > other.y) {
            isBlocked = true;
            break;
          }
        }

        if (!isBlocked) {
          const newState = pieces.map(p => p.id === piece.id ? newPiece : p);
          successors.push(newState);
        }
      }
    }
    return successors;
  }

  private generateDataSetString(): string | null {
    if (!this.solutionPath) {
      this.showMessage('请先验证关卡以获取最佳步数!', false, 'error');
      return null;
    }

    const nameMapping: { [key: string]: string } = {
      '曹操': 'caocao',
      '关羽': 'guanyu',
      '张飞': 'zhangfei',
      '赵云': 'zhaoyun',
      '马超': 'machao',
      '黄忠': 'huangzhong',
    };
    let zuCounter = 1;

    const dataSetPieces = this.pieces.map(p => {
      let constantName = nameMapping[p.name];
      if (p.name === '卒') {
        constantName = `zu${zuCounter++}`;
      }

      const originalTemplate = this.allPieceTemplates.find(t => t.id === p.templateId);
      let dimensionOverride = '';
      if (originalTemplate && (originalTemplate.width !== p.width || originalTemplate.height !== p.height)) {
        dimensionOverride = `, width: ${p.width}, height: ${p.height}`;
      }

      return `    { ...${constantName}, x: ${p.x}, y: ${p.y}${dimensionOverride} }`;
    }).join(',\n');

    const dataSetString = `export const dataSet: Record<string, Piece[]> = {\n  '${this.levelName}': [\n${dataSetPieces}\n  ]\n};`;

    const minSteps = this.solutionPath.length - 1;
    const levelsString = `export const levels: Level[] = [\n  { id: '${this.levelName}', name: '${this.levelName}', difficulty: '${this.levelDifficulty}', minSteps: ${minSteps}, pieces: dataSet['${this.levelName}'] },\n];`;

    return `${dataSetString}\n\n${levelsString}`;
  }


  async generateAndCopy() {
    if (!this.levelName.trim()) {
      this.showMessage('请输入关卡名称', true, 'error');
      return;
    }
    
    const dataSet = this.generateDataSetString();
    if (dataSet) {
      navigator.clipboard.writeText(dataSet).then(() => {
        this.showMessage('已复制到剪贴板!', true, 'success');
      }).catch(err => {
        this.showMessage('复制失败, 请检查浏览器权限.', true, 'error');
        console.error('Could not copy text: ', err);
      });
    }
  }

  // #endregion
}