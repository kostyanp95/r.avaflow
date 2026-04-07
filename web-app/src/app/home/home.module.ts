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
import {SimulationWizardComponent} from './simulation-wizard/simulation-wizard.component';
import {SimulationStatusComponent} from './simulation-status/simulation-status.component';
import {SimulationResultsComponent} from './simulation-results/simulation-results.component';
import {NzAffixModule} from "ng-zorro-antd/affix";
import {NzUploadModule} from "ng-zorro-antd/upload";
import {NzStepsModule} from 'ng-zorro-antd/steps';
import {NzInputNumberModule} from 'ng-zorro-antd/input-number';
import {NzDescriptionsModule} from 'ng-zorro-antd/descriptions';
import {NzBadgeModule} from 'ng-zorro-antd/badge';
import {NzTagModule} from 'ng-zorro-antd/tag';
import {NzMessageModule} from 'ng-zorro-antd/message';
import {NzTableModule} from 'ng-zorro-antd/table';
import {NzPopconfirmModule} from 'ng-zorro-antd/popconfirm';
import {NzProgressModule} from 'ng-zorro-antd/progress';
import {NzModalModule} from 'ng-zorro-antd/modal';
import {HttpClientModule} from '@angular/common/http';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [HomeComponent, ProjectFormComponent, SimulationWizardComponent, SimulationStatusComponent, SimulationResultsComponent],
    imports: [CommonModule, BrowserAnimationsModule, SharedModule, HomeRoutingModule, HttpClientModule, TranslateModule, NzButtonModule, NzIconModule, NzLayoutModule, NzMenuModule, NzTabsModule, NzWaveModule, NzTypographyModule, NzCollapseModule, ReactiveFormsModule, NzFormModule, NzSwitchModule, NzRadioModule, NzSelectModule, NzToolTipModule, NzInputModule, NzAffixModule, NzUploadModule, NzStepsModule, NzInputNumberModule, NzDescriptionsModule, NzBadgeModule, NzTagModule, NzMessageModule, NzTableModule, NzPopconfirmModule, NzProgressModule, NzModalModule]
})
export class HomeModule {
}
