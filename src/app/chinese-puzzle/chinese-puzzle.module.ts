import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';

import { ChinesePuzzleRoutingModule } from './chinese-puzzle-routing.module';
import { ChinesePuzzleBoardComponent } from './chinese-puzzle-board/chinese-puzzle-board.component';
import { ChinesePuzzleStore } from './chinese-puzzle.store';
import { ScatterFlowersComponent } from './scatter-flowers/scatter-flowers.component';


@NgModule({
  declarations: [
    ChinesePuzzleBoardComponent,
    ScatterFlowersComponent,
  ],
  imports: [
    CommonModule,
    ChinesePuzzleRoutingModule,
    DragDropModule,
    FormsModule,
  ],
  providers: [
    ChinesePuzzleStore
  ],
})
export class ChinesePuzzleModule { }
