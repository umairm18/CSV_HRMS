import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


const routes: Routes = [
    {
        path: 'leave-employee',
        loadComponent: () => import(`./leave/list/list.component`).then(c => c.ListComponent),
        data: { breadcrumb: 'Attendances Employee List' },
        title: 'Attendances Employee List',
    },
    {
        path: 'leave-list',
        loadComponent: () => import(`./leave/leave/leave.component`).then(c => c.LeaveComponent),
        data: { breadcrumb: 'Leave List' },
        title: 'Leave List',
    },
    {
        path: 'leave/:action',
        loadComponent: () => import(`./leave/add-edit/add-edit.component`).then(c => c.AddEditComponent),
        data: { breadcrumb: 'Leave Detail' },
        title: 'Leave',
    },
    {
        path: 'leave-type-list',
        loadComponent: () => import(`./leave-type/list/list.component`).then(c => c.ListComponent),
        data: { breadcrumb: 'Attendances Detail' },
        title: 'Leave Type List',
    },
    {
        path: 'leave-type/:action',
        loadComponent: () => import(`./leave-type/add-edit/add-edit.component`).then(c => c.AddEditComponent),
        data: { breadcrumb: 'Attendances Detail' },
        title: 'Leave Type Detail',
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AttendanceRoutingModule { }