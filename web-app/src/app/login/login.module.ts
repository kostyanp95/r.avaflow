import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { LoginComponent } from './login.component';
import { TgCallbackComponent } from './tg-callback.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'tg-callback', component: TgCallbackComponent }
];

@NgModule({
  declarations: [LoginComponent, TgCallbackComponent],
  imports: [CommonModule, FormsModule, TranslateModule, RouterModule.forChild(routes)]
})
export class LoginModule {}
