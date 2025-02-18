import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BisesComponent } from './bises/bises.component';
import { MainComponent } from './main/main.component';

const routes: Routes = [
  { path: '', component: MainComponent }, 
  { path: 'bises', component: BisesComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
