import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChinesePuzzleBoardComponent } from './chinese-puzzle-board/chinese-puzzle-board.component';
import { GameBoardCanvasComponent } from './game-board-canvas/game-board-canvas.component';

const routes: Routes = [
  { path: '', component: ChinesePuzzleBoardComponent },
  { path: 'canvas', component: GameBoardCanvasComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChinesePuzzleRoutingModule { }
