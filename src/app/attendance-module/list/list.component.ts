import { Component, AfterViewInit } from '@angular/core';
import { IAttendanceList, IAttendanceListRes } from '../../types/index';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiCallingService } from '../../shared/Services/api-calling.service';
import { LocalStorageManagerService } from '../../shared/Services/local-storage-manager.service';
import { ExportService } from '../../shared/Services/export.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import * as bootstrap from 'bootstrap';
import { ConvertTimePipe } from "../../shared/pipes/convert-time.pipe";
import { DpDatePickerModule } from 'ng2-date-picker';
import { environment } from "../../../environments/environment.prod"
import { HighlightPipe } from '../../shared/pipes/highlight.pipe';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, TranslateModule, DpDatePickerModule, ConvertTimePipe,HighlightPipe],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css'],
})
export class ListComponent implements AfterViewInit {

  datePickerConfig = {
    format: environment.dateTimePatterns.date,
  };

  private ngUnsubscribe = new Subject<void>();
  private searchSubject = new Subject<string>();

  dataList: IAttendanceList[] = [];
  dropDownList = [10, 50, 75, 100];
  searchTerm = '';
  selectedStatus: number | string = 1;
  totalCount = 0;
  pageSize = 10;
  pageNo = 1;
  totalPages = 0;

  isSubmitted = false;
  empId: string;


  submitForm!: FormGroup;

  selectedEmpId: string;

  msg: string = '';

  startDate = '';
  endDate = new Date().toISOString();

  userReporting: {
    employeeId: string;
    fullName: string;
  }[] = []




  permissions: { isAssign: boolean; permission: string }[] = [];
  isEdit: boolean = false;
  isCreate: boolean = false;
  isDelete: boolean = false;
  isApproval: boolean = false;

  constructor(
    private apiService: ApiCallingService,
    private exportService: ExportService,
    private _localStorage: LocalStorageManagerService,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute
  ) {



    this.loadPermissions();
    this.empId = this._localStorage.getEmployeeDetail()[0].employeeId;
    this.selectedEmpId = this._localStorage.getEmployeeDetail()[0].employeeId;

    this.getUserReporting()

    // Set default dates for Month to Date (MTD)
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];

    this.initializeSearch();
    this.getData();


    this.submitForm = this.fb.group({
      attendanceStatus: [0],
      comment: ['', Validators.required ],
    });
  }

  setStatus(status: number): void {
    this.submitForm.patchValue({ attendanceStatus: status });
  }




  private loadPermissions(): void {
    this.activatedRoute.data.subscribe(data => {
      const permissionsData = data['permission'];
      console.log(permissionsData);

      if (Array.isArray(permissionsData)) {
        this.permissions = permissionsData;
        this.isEdit = this.permissions.some(p => p.permission === "Edit_Attendance" && p.isAssign);
        this.isCreate = this.permissions.some(p => p.permission === "Apply_Attendance" && p.isAssign);
        this.isDelete = this.permissions.some(p => p.permission === "Delete_Attendance" && p.isAssign);
        this.isApproval = this.permissions.some(p => p.permission === "Attendance_Approval" && p.isAssign);
      } else {
        console.error("Invalid permissions format:", permissionsData);
      }
    });
  }


  ngAfterViewInit(): void {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  getAttendanceStatusText(status: number): string {
    switch (status) {
      case 0:
        return 'Pending';
      case 1:
        return 'Approved';
      case 2:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  onUserSelect(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedEmpId = selectElement.value;
  }

  search(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm = term; // Update the bound search term for highlight pipe
    this.searchSubject.next(term); // Debounce the API call
  }

  getUserReporting(): void {
    this.apiService
      .getData('Attendance', 'getUserReportings', true, {
        employeeId: this.empId
      })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (response: any) => {
          if (response?.success) {
            this.userReporting = response.data;
          } else {
            this.userReporting = []; // Handle case when response is not successful
          }
        },
        error: () => {
          this.userReporting = []; // Handle error scenario
        },
      });
  }


  setFilter(option: string): void {
    const today = new Date();
    switch (option) {
      case 'YTD': // Year to Date
        this.startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      case 'MTD': // Month to Date
        this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      case 'QTD': // Quarter to Date
        const currentQuarter = Math.floor(today.getMonth() / 3);
        this.startDate = new Date(today.getFullYear(), currentQuarter * 3, 1).toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      case 'PreviousYear':
        const lastYear = today.getFullYear() - 1;
        this.startDate = new Date(lastYear, 0, 1).toISOString().split('T')[0];
        this.endDate = new Date(lastYear, 11, 31).toISOString().split('T')[0];
        break;
      case 'PreviousMonth':
        const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        this.startDate = firstDayPrevMonth.toISOString().split('T')[0];
        this.endDate = lastDayPrevMonth.toISOString().split('T')[0];
        break;
      case 'Last7Days':
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 6); // Go back 6 days from today
        this.startDate = lastWeek.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      default:
        break;
    }
  }


  onStartDateChange(event: Event): void {
    const selectedDate = (event.target as HTMLInputElement).value;
    this.startDate = selectedDate; // Update local state
  }

  onEndDateChange(event: Event): void {
    const selectedDate = (event.target as HTMLInputElement).value;
    this.endDate = selectedDate; // Update local state
  }

  applyDateFilter(): void {
    if (this.startDate && this.endDate) {
      this.msg = ''
      const params = {
        searchQuery: this.searchTerm,
        employeeId: this.selectedEmpId,
        startDate: this.startDate,
        endDate: this.endDate,
      };
      this.apiService
        .getData('Attendance', 'getAttendanceByDateRange', true, params)
        .pipe(takeUntil(this.ngUnsubscribe))
        .subscribe({
          next: (res: IAttendanceListRes) => this.handleResponse(res),
          error: () => (this.dataList = []),
        });
    } else {
      this.msg = "Both start Date and end Date must be selected before applying the filter."
    }
  }
  private initializeSearch(): void {
    this.searchSubject
      .pipe(debounceTime(500), takeUntil(this.ngUnsubscribe))
      .subscribe((term) => this.getData(term));
  }


  private getData(searchTerm = ''): void {
    const params = {
      searchQuery: searchTerm,
      employeeId: this.selectedEmpId,
      startDate: this.startDate,
      endDate: this.endDate,
    };

    this.apiService
      .getData('Attendance', 'getAttendanceByDateRange', true, params)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (res: IAttendanceListRes) => this.handleResponse(res),
        error: () => (this.dataList = []),
      });
  }

  private handleResponse(response: IAttendanceListRes): void {
    if (response?.success) {
      const { attendances, pagination } = response.data;
      Object.assign(this, {
        dataList: attendances,
        pageNo: pagination.pageNo,
        pageSize: pagination.pageSize,
        totalCount: pagination.totalCount,
        totalPages: Math.ceil(pagination.totalCount / pagination.pageSize),
      });
    } else {
      this.dataList = [];
    }
  }


  onSubmit(id:string){
    this.isSubmitted = true;
    if (!this.submitForm.valid) {
      return;
    }

    this.apiService
    .patchData('Attendance', `processAttendance/${id}`,this.submitForm.value, true)
    .pipe(takeUntil(this.ngUnsubscribe))
    .subscribe({
      next: (response: any) => {
        if (response?.success) {
          this.getData()

        }
      },
      error: () => {
        this.userReporting = []; // Handle error scenario
      },
    });

  }


  changePage(newPage: number): void {
    if (newPage > 0 && newPage <= this.totalPages) {
      this.pageNo = newPage;
      this.getPaginatedData();
    }
  }

  changePageSize(size: number): void {
    Object.assign(this, { pageSize: size, pageNo: 1 });
    this.getPaginatedData();
  }


  private getPaginatedData(): void {
    const params = {
      searchQuery: this.searchTerm,
      pageNo: this.pageNo,
      pageSize: this.pageSize,
      employeeId: this.selectedEmpId,
      endDate: this.endDate,
    };

    this.apiService
      .getData('Attendance', 'getAttendanceByDateRange', true, params)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (res) => this.handleResponse(res),
        error: (err) => console.error('Error fetching data:', err),
      });
  }


  exportData(format: string): void {
    this.exportService.exportData(format, this.dataList);
  }
}
