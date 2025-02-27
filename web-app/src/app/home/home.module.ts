import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzLayoutModule} from 'ng-zorro-antd/layout';
import {NzMenuModule} from 'ng-zorro-antd/menu';
import {NzTabsModule} from 'ng-zorro-antd/tabs';
import {NzWaveModule} from 'ng-zorro-antd/core/wave';
import {NzTypographyModule} from 'ng-zorro-antd/typography';
import {NzCollapseModule} from 'ng-zorro-antd/collapse';
import {ReactiveFormsModule} from '@angular/forms';
import {NzFormModule} from 'ng-zorro-antd/form';
import {NzSwitchModule} from 'ng-zorro-antd/switch';
import {NzRadioModule} from 'ng-zorro-antd/radio';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzToolTipModule} from 'ng-zorro-antd/tooltip';
import {NzInputModule} from 'ng-zorro-antd/input';

import {HomeRoutingModule} from './home-routing.module';
import {HomeComponent} from './home.component';
import {SharedModule} from '../shared/shared.module';
import {ProjectFormComponent} from './project-form/project-form.component';
import {NzAffixModule} from "ng-zorro-antd/affix";
import { NzUploadModule } from "ng-zorro-antd/upload";

@NgModule({
  declarations: [HomeComponent, ProjectFormComponent],
    imports: [CommonModule, BrowserAnimationsModule, SharedModule, HomeRoutingModule, NzButtonModule, NzIconModule, NzLayoutModule, NzMenuModule, NzTabsModule, NzWaveModule, NzTypographyModule, NzCollapseModule, ReactiveFormsModule, NzFormModule, NzSwitchModule, NzRadioModule, NzSelectModule, NzToolTipModule, NzInputModule, NzAffixModule, NzUploadModule]
})
export class HomeModule {
}
