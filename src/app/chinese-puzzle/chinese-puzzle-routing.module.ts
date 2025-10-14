import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChinesePuzzleBoardComponent } from './pages/chinese-puzzle-board/chinese-puzzle-board.component';
import { GameBoardFabricComponent } from './pages/game-board-fabric/game-board-fabric.component';
import { HomeComponent } from './pages/home/home.component';
import { LevelSelectComponent } from './pages/level-select/level-select.component';
import { LevelGeneratorComponent } from './pages/level-generator/level-generator.component';
import { TutorialComponent } from './pages/tutorial/tutorial.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'levels', component: LevelSelectComponent },
  { path: 'board', component: ChinesePuzzleBoardComponent },
  { path: 'fabric', component: GameBoardFabricComponent },
  { path: 'tutorial', component: TutorialComponent },
  { path: 'generator', component: LevelGeneratorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChinesePuzzleRoutingModule { }
