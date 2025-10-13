import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChinesePuzzleBoardComponent } from './chinese-puzzle-board/chinese-puzzle-board.component';
import { GameBoardFabricComponent } from './game-board-fabric/game-board-fabric.component';
import { HomeComponent } from './home/home.component';
import { LevelSelectComponent } from './level-select/level-select.component';
import { LevelGeneratorComponent } from './level-generator/level-generator.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'levels', component: LevelSelectComponent },
  { path: 'board', component: ChinesePuzzleBoardComponent },
  { path: 'fabric', component: GameBoardFabricComponent },
  { path: 'generator', component: LevelGeneratorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChinesePuzzleRoutingModule { }
