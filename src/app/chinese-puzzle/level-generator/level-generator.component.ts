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

// A* 算法用的最小堆优先队列
class PriorityQueue<T> {
  private heap: { priority: number; value: T }[] = [];

  insert(value: T, priority: number): void {
    this.heap.push({ value, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  extractMin(): T | null {
    if (this.isEmpty()) {
      return null;
    }
    this.swap(0, this.heap.length - 1);
    const min = this.heap.pop();
    if (!this.isEmpty()) {
      this.sinkDown(0);
    }
    return min!.value;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority > this.heap[index].priority) {
        this.swap(parentIndex, index);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private sinkDown(index: number): void {
    const leftChildIndex = 2 * index + 1;
    const rightChildIndex = 2 * index + 2;
    let smallest = index;

    if (leftChildIndex < this.heap.length && this.heap[leftChildIndex].priority < this.heap[smallest].priority) {
      smallest = leftChildIndex;
    }
    if (rightChildIndex < this.heap.length && this.heap[rightChildIndex].priority < this.heap[smallest].priority) {
      smallest = rightChildIndex;
    }

    if (smallest !== index) {
      this.swap(index, smallest);
      this.sinkDown(smallest);
    }
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
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
  pieces: EditorPiece[] = [];
  isAnimating = false;
  solutionPath: { state: EditorPiece[], cost: number }[] | null = null;

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

    const btnX = piecePixelX + piecePixelWidth - (btnSize / 2) + 5;
    const btnY = piecePixelY + (btnSize / 2) - 5;

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

    const btnX = piecePixelX + (btnSize / 2) - 5;
    const btnY = piecePixelY + (btnSize / 2) - 5;

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
        const rotateBtnX = piecePixelX + (btnSize / 2) - 5;
        const rotateBtnY = piecePixelY + (btnSize / 2) - 5;
        const rotateDist = Math.sqrt(Math.pow(pos.x - rotateBtnX, 2) + Math.pow(pos.y - rotateBtnY, 2));
        if (rotateDist <= btnSize / 2) {
          this.rotatePiece(clickedPiece);
          return;
        }
      }

      // Check for delete button click
      const piecePixelWidth = clickedPiece.width * this.cellSize;
      const deleteBtnX = piecePixelX + piecePixelWidth - (btnSize / 2) + 5;
      const deleteBtnY = piecePixelY + (btnSize / 2) - 5;
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
          const rotateBtnX = piecePixelX + (btnSize / 2) - 5;
          const rotateBtnY = piecePixelY + (btnSize / 2) - 5;
          const rotateDist = Math.sqrt(Math.pow(pos.x - rotateBtnX, 2) + Math.pow(pos.y - rotateBtnY, 2));
          if (rotateDist <= btnSize / 2) {
            onAButton = true;
            break;
          }
        }

        // Check hover on delete button
        const piecePixelWidth = piece.width * this.cellSize;
        const deleteBtnX = piecePixelX + piecePixelWidth - (btnSize / 2) + 5;
        const deleteBtnY = piecePixelY + (btnSize / 2) - 5;
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
      this.showMessage('无法旋转，空间不足或与其它棋子冲突');
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
      this.showMessage('目标位置已被占据或超出边界');
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

  private showMessage(msg: string, autoClear = true) {
    this.message = msg;
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
    if (!this.levelName.trim()) {
      this.showMessage('请输入关卡名称');
      return false;
    }
    if (this.pieces.length === 0) {
      this.showMessage('请至少添加一个棋子');
      return false;
    }
    const caocao = this.pieces.find(p => p.name === '曹操');
    if (!caocao) {
      this.showMessage('必须包含曹操棋子');
      return false;
    }

    this.showMessage('正在使用 A* 算法检查解法, 请稍候...', false);

    const startTime = performance.now();
    const solutionPath = await this.isSolvable();
    const endTime = performance.now();
    const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);

    if (solutionPath) {
      this.solutionPath = solutionPath;
      const steps = solutionPath.length > 0 ? solutionPath[solutionPath.length - 1].cost : 0;
      this.showMessage(`数据合法, 关卡有解! 最佳步数: ${steps} (用时: ${durationInSeconds}秒)`, false);
      return true;
    } else {
      this.showMessage(`数据合法, 但当前关卡无解! (用时: ${durationInSeconds}秒)`, false);
      return false;
    }
  }

  animateSolution() {
    if (!this.solutionPath) return;

    const path = this.solutionPath;
    this.isAnimating = true;
    this.invalidateSolution();

    let step = 0;
    const interval = setInterval(() => {
      if (step < path.length) {
        this.pieces = path[step].state;
        this.draw();
        step++;
      } else {
        clearInterval(interval);
        this.isAnimating = false;
        this.draw();
      }
    }, 1000);
  }

  private reconstructPath(cameFrom: Map<string, { state: EditorPiece[], cost: number }>, current: { state: EditorPiece[], cost: number }): { state: EditorPiece[], cost: number }[] {
    const totalPath = [current];
    let currentHash = this.getBoardStateHash(current.state);
    while (cameFrom.has(currentHash)) {
      const previous = cameFrom.get(currentHash)!;
      totalPath.unshift(previous);
      currentHash = this.getBoardStateHash(previous.state);
    }
    return totalPath;
  }

  private async isSolvable(): Promise<{ state: EditorPiece[], cost: number }[] | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        const initialState = this.pieces;
        const goalX = 1, goalY = 3;

        const heuristic = (state: EditorPiece[]): number => {
          const caocao = state.find(p => p.name === '曹操');
          if (!caocao) return Infinity;
          return Math.abs(caocao.x - goalX) + Math.abs(caocao.y - goalY);
        };

        const openSet = new PriorityQueue<{ state: EditorPiece[], cost: number }>();
        const initialNode = { state: initialState, cost: 0 };
        openSet.insert(initialNode, heuristic(initialState));

        const cameFrom = new Map<string, { state: EditorPiece[], cost: number }>();
        const gScore = new Map<string, number>();
        gScore.set(this.getBoardStateHash(initialState), 0);

        while (!openSet.isEmpty()) {
          const currentNode = openSet.extractMin()!;
          const currentState = currentNode.state;
          const currentStateHash = this.getBoardStateHash(currentState);

          const caocao = currentState.find(p => p.name === '曹操');
          if (caocao && caocao.x === goalX && caocao.y === goalY) {
            resolve(this.reconstructPath(cameFrom, currentNode));
            return;
          }

          const successors = this.getSuccessorsWithCost(currentState);
          for (const { state: successor, cost: moveCost } of successors) {
            const successorHash = this.getBoardStateHash(successor);
            const tentativeGScore = (gScore.get(currentStateHash) ?? Infinity) + moveCost;

            if (tentativeGScore < (gScore.get(successorHash) ?? Infinity)) {
              const newNode = { state: successor, cost: tentativeGScore };
              cameFrom.set(successorHash, currentNode);
              gScore.set(successorHash, tentativeGScore);
              const fScore = tentativeGScore + heuristic(successor);
              openSet.insert(newNode, fScore);
            }
          }
        }

        resolve(null); // No solution found
      }, 0);
    });
  }

  private getBoardStateHash(pieces: EditorPiece[]): string {
    // Sort pieces by ID to ensure hash is consistent
    const sortedPieces = [...pieces].sort((a, b) => a.templateId - b.templateId);
    return sortedPieces.map(p => `${p.templateId},${p.x},${p.y},${p.width},${p.height}`).join('|');
  }

  private getSuccessorsWithCost(pieces: EditorPiece[]): { state: EditorPiece[], cost: number }[] {
    const successors: { state: EditorPiece[], cost: number }[] = [];
    const directions = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];

    for (const piece of pieces) {
      for (const dir of directions) {
        for (let distance = 1; ; distance++) {
          const newX = piece.x + dir.dx * distance;
          const newY = piece.y + dir.dy * distance;

          if (newX < 0 || newY < 0 || newX + piece.width > this.boardWidth || newY + piece.height > this.boardHeight) {
            break; // Out of bounds, stop sliding in this direction
          }

          const newPiece = { ...piece, x: newX, y: newY };

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

          if (isBlocked) {
            break; // Collision, stop sliding in this direction
          } else {
            const newState = pieces.map(p => (p.id === piece.id ? newPiece : p));
            successors.push({ state: newState, cost: distance });
          }
        }
      }
    }
    return successors;
  }

  private generateDataSetString(): string | null {
    if (!this.solutionPath) {
      this.showMessage('请先验证关卡以获取最佳步数!', false);
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

    const minSteps = this.solutionPath[this.solutionPath.length - 1].cost;
    const levelsString = `export const levels: Level[] = [\n  { id: '${this.levelName}', name: '${this.levelName}', difficulty: '${this.levelDifficulty}', minSteps: ${minSteps}, pieces: dataSet['${this.levelName}'] },\n];`;

    return `${dataSetString}\n\n${levelsString}`;
  }

  async generateAndDownload() {
    const dataSet = this.generateDataSetString();
    if (dataSet) {
      this.downloadFile(dataSet, `${this.levelName}-data-set.ts`);
    }
  }

  async generateAndCopy() {
    const dataSet = this.generateDataSetString();
    if (dataSet) {
      navigator.clipboard.writeText(dataSet).then(() => {
        this.showMessage('已复制到剪贴板!');
      }).catch(err => {
        this.showMessage('复制失败, 请检查浏览器权限.');
        console.error('Could not copy text: ', err);
      });
    }
  }

  private downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }
  // #endregion
}
