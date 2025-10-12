import { computed, inject, Injectable, signal } from "@angular/core";
import { ToolsService } from "./services/tools.service";
import { Piece, UserSettings } from "./chinese-puzzle.type";

import { dataSet, levels } from './data-set';



const dataSetNames = Object.keys(dataSet);

@Injectable({
  providedIn: 'root'
})
export class ChinesePuzzleStore {
  private tools = inject(ToolsService);

  private _boardWidth = signal(4);
  private _boardHeight = signal(5);
  private _isDarkMode = signal(false);
  private _settings = signal<UserSettings>({
    isDarkMode: false,
    smoothDragMode: true,
    soundEffectsEnabled: true,
    backgroundMusicEnabled: false,
    vibrationEnabled: true
  });

  private _dataSetName = signal(dataSetNames[0]);

  private _pieces = signal(this.tools.deepClone(dataSet[this._dataSetName()]));
  private _board = signal<string[][]>([]);

  constructor() {
    // 在Store初始化时就创建初始的棋盘状态
    this.initBoard();
  }


  readonly isDarkMode = this._isDarkMode.asReadonly();
  readonly settings = this._settings.asReadonly();
  readonly dataSetNames = signal(dataSetNames);
  readonly dataSetName = this._dataSetName.asReadonly();
  readonly pieces = this._pieces.asReadonly();
  readonly board = this._board.asReadonly();
  readonly boardWidth = this._boardWidth.asReadonly();
  readonly boardHeight = this._boardHeight.asReadonly();
  readonly currentLevel = computed(() => {
    const currentDataSetName = this.dataSetName();
    return levels.find(level => level.id === currentDataSetName) || null;
  });

  finished = computed(() => {
    const caocao = this.pieces().find(p => p.name == '曹操');

    if (caocao && caocao.x == 1 && caocao.y == 3) {
      return true;
    }
    return false;
  });


  initBoard() {
    const board = new Array(this.boardHeight()).fill(null).map(() => new Array(this.boardWidth()).fill(''));
    this.pieces().forEach(piece => {
      for (let i = 0; i < piece.height; i++) {
        for (let j = 0; j < piece.width; j++) {
          board[piece.y + i][piece.x + j] = piece.name;
        }
      }
    })
    this._board.set(board);
  }

  updateBoard(board: string[][]) {
    this._board.set(this.tools.deepClone(board));
  }
  updatePiece(piece: Piece) {
    const pieces = this.pieces();
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].id == piece.id) {
        pieces[i].x = piece.x;
        pieces[i].y = piece.y;
      }
    }

    this._pieces.set(this.tools.deepClone(pieces));
  }


  setDarkMode(isDarkMode: boolean) {
    this._isDarkMode.set(isDarkMode);
    // 同时更新settings对象
    const currentSettings = this._settings();
    this._settings.set({
      ...currentSettings,
      isDarkMode
    });
  }

  // 设置相关方法
  updateSettings(settings: UserSettings) {
    this._settings.set(settings);
    // 同时更新isDarkMode信号，保持向后兼容
    this._isDarkMode.set(settings.isDarkMode);
  }

  updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    const currentSettings = this._settings();
    const updatedSettings = {
      ...currentSettings,
      [key]: value
    } as UserSettings;

    this._settings.set(updatedSettings);

    // 如果是isDarkMode设置，也更新对应的信号，保持向后兼容
    if (key === 'isDarkMode') {
      this._isDarkMode.set(value as boolean);
    }
  }

  changeDataSet(dataSetName: string) {
    const levelPieces = dataSet[dataSetName];
    
    if (levelPieces) {
      const processedPieces = this.tools.deepClone(levelPieces).map((p: Piece) => {
        // Dynamically set the image path for rectangular pieces based on their dimensions.
        if (p.width !== p.height) {
          const baseName = p.name.replace(/\d+$/, '');
          p.img = `assets/img/chinese-puzzle/${baseName}${p.width}${p.height}.png`;
        }
        return p;
      });

      this._dataSetName.set(dataSetName);
      this._pieces.set(processedPieces);
      this.initBoard();
    } else {
      console.error(`[ChinesePuzzleStore] Error: Level data for "${dataSetName}" not found in dataSet. Falling back to default level.`);
      // Fallback to the default level to prevent crashing
      if (this._dataSetName() !== dataSetNames[0]) {
        this.changeDataSet(dataSetNames[0]);
      }
    }
  }

}
