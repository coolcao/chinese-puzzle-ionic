import { Injectable } from '@angular/core';
import { Piece, Direction } from '../chinese-puzzle.type';
import { ToolsService } from '../../common/tools.service';

@Injectable({
  providedIn: 'root'
})
export class PieceMovementService {

  constructor(private tools: ToolsService) { }

  // 根据坐标查找棋子
  getPieceAtPosition(x: number, y: number, pieces: Piece[], cellSize: number): Piece | null {
    // 考虑CanvasDrawingService中的gap
    const gap = 1.5;

    // 调整坐标以考虑gap（不需要考虑devicePixelRatio，因为touch事件坐标已经是正确的）
    const adjustedX = x - gap;
    const adjustedY = y - gap;

    // 将像素坐标转换为棋盘坐标
    const boardX = Math.floor(adjustedX / cellSize);
    const boardY = Math.floor(adjustedY / cellSize);

    // 查找对应位置的棋子
    for (const piece of pieces) {
      if (boardX >= piece.x && boardX < piece.x + piece.width &&
        boardY >= piece.y && boardY < piece.y + piece.height) {
        return piece;
      }
    }

    return null;
  }

  // 检查是否可以移动棋子
  canMove(piece: Piece, direction: Direction, boardState: string[][], boardWidth: number, boardHeight: number): boolean {
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
      targetX + piece.width > boardWidth ||
      targetY + piece.height > boardHeight
    ) {
      return false;
    }

    // 检查目标位置是否被其他棋子占用
    for (let i = 0; i < piece.height; i++) {
      for (let j = 0; j < piece.width; j++) {
        const cellY = targetY + i;
        const cellX = targetX + j;

        if (boardState[cellY][cellX] !== '' && boardState[cellY][cellX] !== piece.name) {
          return false;
        }
      }
    }

    return true;
  }

  // 移动棋子
  movePiece(piece: Piece, direction: Direction, boardState: string[][], boardWidth: number, boardHeight: number): { updatedPiece: Piece, updatedBoardState: string[][] } | null {
    if (this.canMove(piece, direction, boardState, boardWidth, boardHeight)) {
      const newBoardState = this.tools.deepClone(boardState);
      // 清空棋子原位置
      for (let i = 0; i < piece.height; i++) {
        for (let j = 0; j < piece.width; j++) {
          newBoardState[piece.y + i][piece.x + j] = '';
        }
      }

      // 更新棋子位置
      const updatedPiece = { ...piece };
      if (direction === Direction.Up) updatedPiece.y -= 1;
      if (direction === Direction.Down) updatedPiece.y += 1;
      if (direction === Direction.Left) updatedPiece.x -= 1;
      if (direction === Direction.Right) updatedPiece.x += 1;

      // 填充棋子新位置
      for (let i = 0; i < updatedPiece.height; i++) {
        for (let j = 0; j < updatedPiece.width; j++) {
          newBoardState[updatedPiece.y + i][updatedPiece.x + j] = updatedPiece.name;
        }
      }

      return { updatedPiece, updatedBoardState: newBoardState };
    }

    return null;
  }

  // 确定拖拽方向
  determineDirection(startPosition: { x: number, y: number }, endPosition: { x: number, y: number }): Direction | null {
    const deltaX = endPosition.x - startPosition.x;
    const deltaY = endPosition.y - startPosition.y;

    let direction: Direction | null = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? Direction.Right : Direction.Left;
    } else {
      direction = deltaY > 0 ? Direction.Down : Direction.Up;
    }

    return direction;
  }

  // 计算拖拽步数
  calculateDragSteps(startPosition: { x: number, y: number }, endPosition: { x: number, y: number }, cellSize: number): number {
    const deltaX = endPosition.x - startPosition.x;
    const deltaY = endPosition.y - startPosition.y;
    const dragDistance = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    const dragSteps = Math.floor(dragDistance / cellSize);
    return dragSteps;
  }
}
