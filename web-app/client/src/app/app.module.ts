import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {en_US, NZ_I18N} from 'ng-zorro-antd/i18n';
import {registerLocaleData} from '@angular/common';
import en from '@angular/common/locales/en';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {IconsProviderModule} from './icons-provider.module';
import {NzLayoutModule} from 'ng-zorro-antd/layout';
import {NzFormModule} from 'ng-zorro-antd/form';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzMenuModule} from 'ng-zorro-antd/menu';
import {NzUploadModule} from 'ng-zorro-antd/upload';
import {NzModalModule} from 'ng-zorro-antd/modal';
import {NzStepsModule} from 'ng-zorro-antd/steps';
import {NzTabsModule} from 'ng-zorro-antd/tabs';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzToolTipModule} from 'ng-zorro-antd/tooltip';
import {NzCheckboxModule} from 'ng-zorro-antd/checkbox';
import {NzRadioModule} from "ng-zorro-antd/radio";
import {NzSwitchModule} from "ng-zorro-antd/switch";
import {ProjectFormComponent} from "./project-form/project-form.component";
import {NzCollapseModule} from "ng-zorro-antd/collapse";
import {NzTypographyModule} from "ng-zorro-antd/typography";


registerLocaleData(en);

@NgModule({
  declarations: [AppComponent, ProjectFormComponent],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    IconsProviderModule,
    NzLayoutModule,
    NzMenuModule,
    NzFormModule,
    ReactiveFormsModule,
    NzInputModule,
    NzButtonModule,
    NzUploadModule,
    NzModalModule,
    NzStepsModule,
    NzTabsModule,
    NzSelectModule,
    NzToolTipModule,
    NzCheckboxModule,
    NzRadioModule,
    NzSwitchModule,
    NzCollapseModule,
    NzTypographyModule,
  ],
  providers: [
    {
      provide: NZ_I18N,
      useValue: en_US
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
