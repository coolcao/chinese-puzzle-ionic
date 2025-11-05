import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';

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
import { ProfileComponent } from './pages/profile/profile.component';
import { ReplayComponent } from './pages/replay/replay.component';
import { DebugPanelComponent } from './components/debug-panel/debug-panel.component';

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
    ProfileComponent,
    GameHeaderComponent,
    ReplayComponent,
  ],
  imports: [
    CommonModule,
    ChinesePuzzleRoutingModule,
    DragDropModule,
    FormsModule,
    TranslateModule,
    IonicModule,
    DebugPanelComponent,
  ],
})
export class ChinesePuzzleModule { }
