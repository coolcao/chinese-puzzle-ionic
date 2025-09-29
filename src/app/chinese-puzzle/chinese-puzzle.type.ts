export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  id: number;
  name: string;
  width: number; // 宽度（占用列数）
  height: number; // 高度（占用行数）
  x: number; // 起始列
  y: number; // 起始行
  img?: string;
}

export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

