import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChinesePuzzleBoardComponent } from './chinese-puzzle-board/chinese-puzzle-board.component';

const routes: Routes = [
  { path: '', component: ChinesePuzzleBoardComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChinesePuzzleRoutingModule { }
