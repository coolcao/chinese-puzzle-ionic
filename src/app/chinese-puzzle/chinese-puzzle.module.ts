import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ChinesePuzzleRoutingModule } from './chinese-puzzle-routing.module';
import { ChinesePuzzleBoardComponent } from './pages/chinese-puzzle-board/chinese-puzzle-board.component';
import { ScatterFlowersComponent } from './components/scatter-flowers/scatter-flowers.component';
import { GameBoardFabricComponent } from './pages/game-board-fabric/game-board-fabric.component';
import { HomeComponent } from './pages/home/home.component';
import { LevelSelectComponent } from './pages/level-select/level-select.component';
import { LevelPreviewComponent } from './components/level-preview/level-preview.component';
import { LevelGeneratorComponent } from './pages/level-generator/level-generator.component';
import { ClickSoundDirective } from './directives/click-sound.directive';
import { TutorialComponent } from './pages/tutorial/tutorial.component';
import { GameHeaderComponent } from './components/game-header/game-header.component';

@NgModule({
  declarations: [
    HomeComponent,
    LevelSelectComponent,
    LevelPreviewComponent,
    ChinesePuzzleBoardComponent,
    ScatterFlowersComponent,
    GameBoardFabricComponent,
    LevelGeneratorComponent,
    ClickSoundDirective,
    TutorialComponent,
    GameHeaderComponent,
  ],
  imports: [
    CommonModule,
    ChinesePuzzleRoutingModule,
    DragDropModule,
    FormsModule,
    TranslateModule,
  ],
  providers: [],
})
export class ChinesePuzzleModule { }
