import { computed, inject, signal } from "@angular/core";
import { ToolsService } from "../common/tools.service";
import { Piece } from "./chinese-puzzle.type";

import { dataSet } from './data-set';

const dataSetNames = Object.keys(dataSet);

export class ChinesePuzzleStore {
  private tools = inject(ToolsService);
  private _boardWidth = signal(4);
  private _boardHeight = signal(5);

  private _dataSetName = signal(dataSetNames[0]);

  private _pieces = signal(this.tools.deepClone(dataSet[this._dataSetName()]));
  private _board = signal<string[][]>([]);


  readonly dataSetNames = signal(dataSetNames);
  readonly dataSetName = this._dataSetName.asReadonly();
  readonly pieces = this._pieces.asReadonly();
  readonly board = this._board.asReadonly();
  readonly boardWidth = this._boardWidth.asReadonly();
  readonly boardHeight = this._boardHeight.asReadonly();

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

  changeDataSet(dataSetName: string) {
    this._dataSetName.set(dataSetName);
    this._pieces.set(this.tools.deepClone(dataSet[dataSetName]));
    this.initBoard();
  }




}
