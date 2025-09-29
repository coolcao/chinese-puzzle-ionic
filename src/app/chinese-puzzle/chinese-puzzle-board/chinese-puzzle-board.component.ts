import { Component, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';
import { timer } from 'rxjs';

import { ChinesePuzzleStore } from '../chinese-puzzle.store';
import { ToolsService } from '../../common/tools.service';
import { Direction, Piece } from '../chinese-puzzle.type';
import { ImagePreloaderService } from '../image-preloader.service';

@Component({
  selector: 'app-chinese-puzzle-board',
  standalone: false,

  templateUrl: './chinese-puzzle-board.component.html',
  styleUrl: './chinese-puzzle-board.component.less'
})
export class ChinesePuzzleBoardComponent implements OnInit, OnDestroy {
  private store = inject(ChinesePuzzleStore);
  private tools = inject(ToolsService);
  private imagePreLoader = inject(ImagePreloaderService);
  // 单元格尺寸
  cellSize = 150;
  // 由于边框问题，这里加一个偏移量
  cellOffset = 8;

  Direction = Direction;

  showInstructions = false;


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

  // 监听屏幕大小变化
  private resizeObserver: ResizeObserver | null = null;

  // 初始化屏幕大小监听
  private initResizeObserver() {
    // 获取当前视窗大小
    const updateCellSize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 根据屏幕大小动态计算单元格尺寸
      // 这里取视窗宽度和高度的较小值的1/6作为单元格尺寸
      // 确保棋盘在各种屏幕尺寸下都能完整显示
      const minDimension = Math.min(viewportWidth, viewportHeight);

      this.cellSize = Math.floor(minDimension / 5);

      // 确保最小尺寸不小于75px
      this.cellSize = Math.max(this.cellSize, 75);
      // 确保最大尺寸不超过150px
      this.cellSize = Math.min(this.cellSize, 150);
    };

    // 初始设置
    updateCellSize();

    // 监听resize事件
    window.addEventListener('resize', updateCellSize);

    // 使用ResizeObserver监听元素大小变化
    this.resizeObserver = new ResizeObserver(() => {
      updateCellSize();
    });
  }

  // 组件销毁时清理监听器
  private destroyResizeObserver() {
    window.removeEventListener('resize', () => { });
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  ngOnInit() {
    this.store.initBoard();
    this.preLoadImage();
    this.initResizeObserver();
  }
  ngOnDestroy(): void {
    this.destroyResizeObserver();
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
    }
  }

  private resetClickOrDragState() {
    this.piece = null;
    this.startPosition = null;
  }
  onDragStart(piece: Piece, dragStart: CdkDragStart) {
    dragStart.source.element.nativeElement.style.zIndex = '20';
    const event: MouseEvent = dragStart.event as MouseEvent;
    this.piece = piece;
    this.startPosition = { x: event.clientX, y: event.clientY };
  }

  // 用户结束拖拽时触发
  onDragEnd(dragEnd: CdkDragEnd) {

    dragEnd.source.element.nativeElement.style.zIndex = '10';

    if (!this.piece || !this.startPosition) return;

    const distance = dragEnd.distance;

    const { x, y } = distance;

    let dragSteps = 0;

    let direction: Direction | null = null;

    if (Math.abs(x) > Math.abs(y)) {
      direction = x > 0 ? Direction.Right : Direction.Left;
      dragSteps = Math.abs(x) / this.cellSize;
    } else {
      direction = y > 0 ? Direction.Down : Direction.Up;
      dragSteps = Math.abs(y) / this.cellSize;
    }

    if (direction && this.canMove(this.piece, direction)) {

      // 确定了方向，并且可以移动
      const piece = this.piece;
      this.movePiece(piece, direction);
      // 如果拖拽步数大于1，则继续移动
      if (dragSteps > 1) {
        this.movePiece(piece, direction);
      }
    } else {
      // 如果无法移动，还原
      console.log('无法移动，还原');

      dragEnd.source.reset();
    }

    this.resetClickOrDragState();
  }

  changeDataSet(dataSetName: string) {
    this.store.changeDataSet(dataSetName);
    this.steps = 0;
  }

  private preLoadImage() {
    this.resourceLoading = true;
    const imageUrls = this.pieces().filter(p => !!p.img).map(piece => piece.img!);
    if (!imageUrls || imageUrls.length == 0) {
      return;
    }

    this.imagePreLoader.preloadImages(imageUrls).then(success => {
      if (success) {
        this.resourceLoading = false;
        console.log('所有图片已成功加载');
      } else {
        console.error('图片预加载失败');
      }
    })
  }
}
