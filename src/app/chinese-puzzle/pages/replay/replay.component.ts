import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameStorageService } from '../../services/game-storage.service';
import {
  GameHistoryRecord,
  Level,
  Piece,
  GameStep,
} from '../../chinese-puzzle.type';
import { FabricGameService } from '../game-board-fabric/services/fabric-game.service';
import { FabricDrawingService } from '../game-board-fabric/services/fabric-drawing.service';
import { levels } from '../../data/data-set';
import { interval } from 'rxjs';
import { ImageLoadingService } from '../../services/image-loading.service';
import { ToastController } from '@ionic/angular';
import { LanguageService } from '../../services/language.service';
import { PieceImageService } from '../../services/piece-image.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-replay',
  templateUrl: './replay.component.html',
  styleUrls: ['./replay.component.css'],
  standalone: false,
})
export class ReplayComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('replayCanvasPC', { static: false })
  canvasPCRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('replayCanvasMobile', { static: false })
  canvasMobileRef!: ElementRef<HTMLCanvasElement>;

  historyRecord: GameHistoryRecord | null = null;
  currentLevel: Level | null = null;
  currentPieces: Piece[] = [];
  isPlaying = false;
  currentStep = 0;
  totalSteps = 0;
  playbackSpeed = 1;
  currentStepIndex = 0;

  // 倒计时相关状态
  isCountingDown = false;
  countdownValue = 0;

  historyId: string | null = null;
  private playbackTimerId: number | null = null;
  private isFrameInProgress = false;
  private resizeObserver: ResizeObserver | null = null;
  private darkModeMediaQuery: MediaQueryList | null = null;
  private darkModeListener: ((e: MediaQueryListEvent) => void) | null = null;

  // 当前语言
  currentLanguage = this.languageService.getCurrentLanguage();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameStorage: GameStorageService,
    public fabricGameService: FabricGameService,
    private fabricDrawingService: FabricDrawingService,
    private imageLoadingService: ImageLoadingService,
    private toastController: ToastController,
    private languageService: LanguageService,
    private pieceImageService: PieceImageService,
    public translate: TranslateService,
  ) {
    effect(() => {
      const cellSize = this.fabricGameService.cellSizeSignal();
      if (cellSize > 0 && this.currentPieces.length > 0) {
        this.drawBoard();
      }
    });
  }

  ngOnInit() {
    this.historyId = this.route.snapshot.paramMap.get('id');
    if (this.historyId) {
      this.loadHistoryRecord();
    } else {
      console.error('No history ID provided in route');
    }
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.initResizeObserver();
  }

  ngOnDestroy() {
    this.stopPlayback();
    this.destroyResizeObserver();
    this.fabricGameService.dispose();
  }

  async loadHistoryRecord() {
    const allHistory = await this.gameStorage.getGameHistory();
    this.historyRecord =
      allHistory.find((record) => record.id === this.historyId) || null;

    if (this.historyRecord) {
      this.currentLevel = this.findLevelById(this.historyRecord.levelId);

      if (this.currentLevel) {
        // 使用PieceImageService更新图片路径，确保1*2和2*1棋子使用正确的图片
        const piecesWithCorrectImages =
          this.pieceImageService.updatePiecesImagePaths(
            this.currentLevel.pieces,
          );
        this.currentPieces = JSON.parse(
          JSON.stringify(piecesWithCorrectImages),
        );

        // 按stepNumber排序gameSteps，确保播放顺序正确
        this.historyRecord.gameSteps.sort(
          (a, b) => a.stepNumber - b.stepNumber,
        );

        this.totalSteps = this.historyRecord.gameSteps.length;
        this.currentStep = 0;
        this.currentStepIndex = 0;

        await this.preLoadImages();
        this.drawBoard();
      } else {
        console.error('Level data not found:', this.historyRecord.levelId);
      }
    } else {
      console.error('History record not found:', this.historyId);
    }
  }

  private findLevelById(levelId: string): Level | null {
    return levels.find((level) => level.id === levelId) || null;
  }

  private initCanvas() {
    // 根据屏幕尺寸选择合适的canvas
    const canvasElement = this.getCurrentCanvas();
    if (canvasElement) {
      this.fabricGameService.boardWidth = 4;
      this.fabricGameService.boardHeight = 5;
      this.fabricGameService.initCanvas(canvasElement);
      this.updateCellSize();
      this.drawBoard();
    } else {
      setTimeout(() => this.initCanvas(), 100);
    }
  }

  private getCurrentCanvas(): HTMLCanvasElement | null {
    const isLargeScreen = window.innerWidth >= 1024;
    if (isLargeScreen && this.canvasPCRef?.nativeElement) {
      return this.canvasPCRef.nativeElement;
    } else if (!isLargeScreen && this.canvasMobileRef?.nativeElement) {
      return this.canvasMobileRef.nativeElement;
    }
    return null;
  }

  private initResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.handleCanvasResize();
    });

    // 监听两个canvas的父元素
    if (this.canvasPCRef?.nativeElement?.parentElement) {
      this.resizeObserver.observe(this.canvasPCRef.nativeElement.parentElement);
    }
    if (this.canvasMobileRef?.nativeElement?.parentElement) {
      this.resizeObserver.observe(
        this.canvasMobileRef.nativeElement.parentElement,
      );
    }

    // 监听窗口大小变化以切换canvas
    window.addEventListener('resize', () => {
      setTimeout(() => {
        this.initCanvas(); // 重新初始化适当的canvas
      }, 100);
    });

    if (window.matchMedia) {
      this.darkModeMediaQuery = window.matchMedia(
        '(prefers-color-scheme: dark)',
      );
      this.darkModeListener = (e: MediaQueryListEvent) => {
        this.drawBoard();
      };
      this.darkModeMediaQuery.addEventListener('change', this.darkModeListener);
    }
  }

  private handleCanvasResize() {
    this.updateCellSize();
    this.drawBoard();
  }

  private destroyResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.darkModeMediaQuery && this.darkModeListener) {
      this.darkModeMediaQuery.removeEventListener(
        'change',
        this.darkModeListener,
      );
      this.darkModeListener = null;
      this.darkModeMediaQuery = null;
    }
  }

  private updateCellSize() {
    const canvasElement = this.getCurrentCanvas();
    if (!canvasElement) {
      return;
    }
    this.fabricGameService.updateCellSize(canvasElement);
  }

  private async preLoadImages() {
    if (this.currentPieces.length > 0) {
      await this.imageLoadingService.preLoadImage(this.currentPieces);
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      // 如果正在播放，则暂停
      this.pause();
    } else {
      // 检查是否已播放完毕
      if (this.isPlaybackCompleted()) {
        // 如果已播放完毕，重新开始播放
        this.restartAndPlay();
      } else {
        // 判断是否从头开始播放
        if (this.currentStepIndex === 0) {
          // 从头开始播放，显示倒计时
          this.startCountdown();
        } else {
          // 中途暂停后继续播放，不显示倒计时，直接播放
          this.play();
        }
      }
    }
  }

  // 检查播放是否已完毕
  private isPlaybackCompleted(): boolean {
    return !!(
      this.historyRecord &&
      this.currentStepIndex >= this.historyRecord.gameSteps.length
    );
  }

  // 重新开始播放
  private async restartAndPlay() {
    // 重新加载关卡数据
    await this.restartReplay();
    // 开始倒计时并播放
    this.startCountdown();
  }

  startCountdown() {
    this.isCountingDown = true;
    this.countdownValue = 3;

    const countdownTimer = interval(1000).subscribe(() => {
      this.countdownValue--;

      if (this.countdownValue <= 0) {
        // 倒计时结束，开始播放
        this.isCountingDown = false;
        countdownTimer.unsubscribe();
        this.play();
      }
    });
  }

  play() {
    if (!this.historyRecord || !this.currentLevel || this.isPlaying) return;

    this.isPlaying = true;
    this.scheduleNextFrame();
  }

  pause() {
    this.isPlaying = false;
    this.stopPlayback();
  }

  private stopPlayback() {
    if (this.playbackTimerId !== null) {
      clearTimeout(this.playbackTimerId);
      this.playbackTimerId = null;
    }
  }

  private scheduleNextFrame() {
    if (!this.isPlaying) {
      return;
    }

    if (this.playbackTimerId !== null) {
      clearTimeout(this.playbackTimerId);
    }

    const frameInterval = Math.max(16, 1000 / this.playbackSpeed);

    this.playbackTimerId = window.setTimeout(async () => {
      this.playbackTimerId = null;
      if (this.isFrameInProgress) {
        this.scheduleNextFrame();
        return;
      }

      await this.nextFrame();
    }, frameInterval);
  }

  private async nextFrame() {
    if (!this.historyRecord) {
      return;
    }

    this.isFrameInProgress = true;

    try {
      if (this.currentStepIndex >= this.historyRecord.gameSteps.length) {
        this.pause();
        this.showToast(this.translate.instant('replay.completed'));
        return;
      }

      const currentGameStep =
        this.historyRecord.gameSteps[this.currentStepIndex];
      await this.executeStep(currentGameStep);
      this.currentStepIndex++;
      // 当前步数应该是已完成的步数，最大不超过总步数
      this.currentStep = Math.min(this.currentStepIndex, this.totalSteps);
    } finally {
      this.isFrameInProgress = false;

      if (this.isPlaying && this.currentStepIndex < this.totalSteps) {
        this.scheduleNextFrame();
      } else if (this.currentStepIndex >= this.totalSteps) {
        // 播放完成，显示提示并确保按钮状态正确
        this.pause();
        this.showToast(this.translate.instant('replay.completed'));
      }
    }
  }

  private async executeStep(step: GameStep) {
    const piece = this.currentPieces.find((p) => p.id === step.pieceId);
    if (!piece) return;

    // 检查是否真的需要移动
    if (piece.x === step.toPosition.x && piece.y === step.toPosition.y) {
      return;
    }

    // 使用动画移动棋子
    const animationDuration = Math.max(200, 600 / this.playbackSpeed); // 根据播放速度调整动画时长

    try {
      await this.fabricGameService.animatePieceToPosition(
        step.pieceId,
        step.toPosition.x,
        step.toPosition.y,
        animationDuration,
      );

      // 更新逻辑位置
      piece.x = step.toPosition.x;
      piece.y = step.toPosition.y;
    } catch (error) {
      // 如果动画失败，直接设置位置
      piece.x = step.toPosition.x;
      piece.y = step.toPosition.y;
      this.drawBoard();
    }
  }

  onSliderChange(event: any) {
    const targetStep = parseInt(event.target.value);
    this.seek(targetStep);
  }

  async seek(targetStep?: number) {
    if (!this.historyRecord || !this.currentLevel) return;

    const seekStep = targetStep !== undefined ? targetStep : this.currentStep;

    // 使用PieceImageService更新图片路径，确保1*2和2*1棋子使用正确的图片
    const piecesWithCorrectImages =
      this.pieceImageService.updatePiecesImagePaths(this.currentLevel.pieces);
    this.currentPieces = JSON.parse(JSON.stringify(piecesWithCorrectImages));
    this.currentStepIndex = 0;

    // 重绘棋盘以显示初始状态
    this.drawBoard();

    // 对于seek操作，我们直接设置位置而不使用动画，以提高性能
    for (
      let i = 0;
      i < Math.min(seekStep, this.historyRecord.gameSteps.length);
      i++
    ) {
      const step = this.historyRecord.gameSteps[i];
      // 直接设置位置，不使用动画
      const piece = this.currentPieces.find((p) => p.id === step.pieceId);
      if (piece) {
        piece.x = step.toPosition.x;
        piece.y = step.toPosition.y;
      }
      this.currentStepIndex++;
    }

    // 重绘棋盘以反映所有变化
    this.drawBoard();

    this.currentStep = seekStep;
  }

  async restartReplay() {
    this.pause();

    // 重新加载关卡数据
    if (this.currentLevel) {
      // 使用PieceImageService更新图片路径，确保1*2和2*1棋子使用正确的图片
      const piecesWithCorrectImages =
        this.pieceImageService.updatePiecesImagePaths(this.currentLevel.pieces);
      this.currentPieces = JSON.parse(JSON.stringify(piecesWithCorrectImages));

      // 重新预加载图片
      await this.preLoadImages();

      // 重置播放状态
      this.currentStepIndex = 0;
      this.currentStep = 0;

      // 重绘棋盘
      this.drawBoard();
    }
  }

  changePlaybackSpeed() {
    const speeds = [1, 2, 4, 6];
    const currentIndex = speeds.indexOf(this.playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.playbackSpeed = speeds[nextIndex];

    if (this.isPlaying) {
      if (this.playbackTimerId !== null) {
        clearTimeout(this.playbackTimerId);
        this.playbackTimerId = null;
      }

      if (!this.isFrameInProgress) {
        this.scheduleNextFrame();
      }
    }
  }

  getSpeedText(): string {
    return `${this.playbackSpeed}x`;
  }

  getCardHeight(): number {
    // 使用信号值确保稳定的高度计算
    const cellSize = this.fabricGameService.cellSizeSignal();
    return cellSize > 0 ? this.fabricGameService.boardHeight * cellSize : 400; // 400px作为默认高度
  }

  goBack() {
    this.router.navigate(['/profile'], { replaceUrl: true });
  }

  private lockBoard() {
    if (this.fabricGameService.canvas) {
      this.fabricGameService.canvas.selection = false;
      this.fabricGameService.canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
      this.fabricGameService.canvas.renderAll();
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color: 'dark',
      cssClass: 'toast',
      mode: 'md',
    });
    toast.present();
  }

  private drawBoard() {
    if (!this.fabricGameService.canvas) {
      return;
    }

    const isDarkMode =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.fabricGameService.clearCanvas();
    this.fabricDrawingService.drawBoard(isDarkMode);

    if (this.currentPieces.length > 0) {
      this.currentPieces.forEach((piece) => {
        const pieceGroup = this.fabricDrawingService.createPieceGroup(
          piece,
          isDarkMode,
        );
        this.fabricGameService.addPieceObject(piece.id, pieceGroup);
        this.fabricGameService.canvas!.add(pieceGroup);
      });
    }

    this.fabricGameService.renderCanvas();
    this.lockBoard();
  }
}
