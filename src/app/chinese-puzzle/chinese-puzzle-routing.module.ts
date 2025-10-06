import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChinesePuzzleBoardComponent } from './chinese-puzzle-board/chinese-puzzle-board.component';
import { GameBoardCanvasComponent } from './game-board-canvas/game-board-canvas.component';
import { GameBoardFabricComponent } from './game-board-fabric/game-board-fabric.component';
import { HomeComponent } from './home/home.component';
import { LevelSelectComponent } from './level-select/level-select.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'level-select', component: LevelSelectComponent },
  { path: 'board', component: ChinesePuzzleBoardComponent },
  { path: 'canvas', component: GameBoardCanvasComponent },
  { path: 'fabric', component: GameBoardFabricComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChinesePuzzleRoutingModule { }
