import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';

import { ChinesePuzzleRoutingModule } from './chinese-puzzle-routing.module';
import { ChinesePuzzleBoardComponent } from './chinese-puzzle-board/chinese-puzzle-board.component';
import { ScatterFlowersComponent } from './scatter-flowers/scatter-flowers.component';
import { GameBoardFabricComponent } from './game-board-fabric/game-board-fabric.component';
import { HomeComponent } from './home/home.component';
import { LevelSelectComponent } from './level-select/level-select.component';
import { LevelPreviewComponent } from './level-preview/level-preview.component';
import { LevelGeneratorComponent } from './level-generator/level-generator.component';

@NgModule({
  declarations: [
    HomeComponent,
    LevelSelectComponent,
    LevelPreviewComponent,
    ChinesePuzzleBoardComponent,
    ScatterFlowersComponent,
    GameBoardFabricComponent,
    LevelGeneratorComponent,
  ],
  imports: [
    CommonModule,
    ChinesePuzzleRoutingModule,
    DragDropModule,
    FormsModule,
  ],
  providers: [],
})
export class ChinesePuzzleModule { }
