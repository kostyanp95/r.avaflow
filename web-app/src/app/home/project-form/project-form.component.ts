import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormGroup, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, } from '@angular/forms';
import { BehaviorSubject, Subject, takeUntil, tap } from 'rxjs';
import { NzFormTooltipIcon } from 'ng-zorro-antd/form';
import { NzUploadChangeParam, NzUploadFile } from 'ng-zorro-antd/upload';
import { WebSocketService } from '../../web-socket.service';
import {
  ExperimentFormGroup,
  ExperimentFormItem,
  ExperimentFormRadio,
  RasterFromServer,
  RastersFromServer
} from '../models/models';

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss'],
})
export class ProjectFormComponent implements OnInit {
  form!: UntypedFormGroup;
  tooltipIcon: NzFormTooltipIcon = {
    type: 'info-circle',
    theme: 'twotone'
  };
  formControls: BehaviorSubject<Array<ExperimentFormItem | ExperimentFormRadio | ExperimentFormGroup>> = new BehaviorSubject<Array<ExperimentFormItem | ExperimentFormRadio | ExperimentFormGroup>>([]);
  previousSelectedValues: Map<string, any> = new Map();
  expandIconPosition: 'left' | 'right' = 'left';
  fileList: NzUploadFile[] = [];

  panels = [
    {
      active: true,
      name: 'This is panel header 1',
      disabled: false
    },
    {
      active: false,
      disabled: false,
      name: 'This is panel header 2'
    },
    {
      active: false,
      disabled: true,
      name: 'This is panel header 3'
    }
  ];
  experiment = 'Experiment: 1';

  formControlItems: Array<ExperimentFormItem | ExperimentFormGroup> = [];
  rasters: Array<RasterFromServer> = [];

  private unsubscribe$: Subject<void> = new Subject<void>();


  constructor(private fb: UntypedFormBuilder,
              private http: HttpClient,
              private ws: WebSocketService) {
  }

  ngOnInit(): void {
    this.getFormControlsParams();
    this.afterUploadedFilesToApp();
  }

  getProjectRasters(): void {
    this.http.get('http://localhost:3000/rasters').subscribe();
  }

  afterUploadedFilesToApp(): void {
    this.ws.socket$.on('filesUploaded', (data: RastersFromServer) => {
      this.checkRastersNames(data.filesUploaded);
    });
  }

  checkRastersNames(rasters: Array<RasterFromServer>): void {
    rasters.forEach((file) => {
      this.addRaster(file.name);
    });
  }

  handleChange(info: NzUploadChangeParam): void {
    if (info.file.status !== 'uploading') {
      // console.log(info.file, info.fileList);
    }
    if (info.file.status === 'done') {
      // console.info('File uploaded successfully');
    } else if (info.file.status === 'error') {
      // console.error('File upload failed');
    }
  }

  addRaster(fileName: string): void {
    const isHrelease = fileName.includes('hrelease');
    const isHentrmax = fileName.includes('hentrmax');

    if (isHrelease || isHentrmax) {
      this.addOptionToSelects(fileName, isHrelease ? 'hrelease' : 'hentrmax');
    } else {
      const raster = this.rasters.find((r) => fileName.includes(r.name));

      if (!raster.values) {
        raster.values = [];
      }
      if (!raster.values.includes(fileName)) {
        raster.values.push(fileName);
      }
    }
  }

  addOptionToSelects(fileName: string, keyword: string): void {
    this.rasters.forEach((raster) => {
      if (raster.name.includes(keyword)) {
        if (!raster.values) {
          raster.values = [];
        }
        if (!raster.values.includes(fileName)) {
          raster.values.push(fileName);
        }
      }
    });
  }

  isSelectDisabled(controlName: string): boolean {
    if (!this.rasters) {
      return;
    }
    const raster = this.rasters.find((r) => r.name === controlName);
    return !raster || !raster.values || raster.values.length === 0;
  }

  showTooltipIfRasterNoLoaded(control: string): string {
    return this.isSelectDisabled(control) ?
      `To make the selection of the raster available, upload a file whose name contains ${control}.` :
      null;
  }

  getFormControlsParams(): void {
    this.http.get<Array<ExperimentFormItem | ExperimentFormGroup>>('assets/formControls.json')
      .pipe(
        tap((formControls) => {
          this.formControlItems = formControls;
          this.rasters = formControls.filter(control => control.type === 'file');
          this.formControls.next(formControls);
          this.form = this.initProjectForm(formControls);
          this.getProjectRasters();
        })
      )
      .subscribe();
  }

  initProjectForm(controls: Array<ExperimentFormItem | ExperimentFormGroup>): FormGroup {
    const formGroup = new UntypedFormGroup({});
    const radioControls: Array<ExperimentFormItem> = [];

    for (const control of controls) {
      if (control.type === 'group') {
        const groupControl = this.initProjectForm((control as ExperimentFormGroup).fields!);
        formGroup.addControl(control?.shortName ? control.shortName : control.name, groupControl);
      } else {
        const formControl = new UntypedFormControl(control?.defaultValue);
        formGroup.addControl(
          control?.shortName ? control.shortName : control.name,
          formControl
        );
        if (control.type === 'radio') {
          radioControls.push(control);
        }
      }
    }
    this.subscribeToRadioGroups(formGroup, radioControls);
    return formGroup;
  }

  subscribeToRadioGroups(formGroup: FormGroup, radioControls: Array<ExperimentFormItem>): void {
    radioControls.forEach((control) => {
      const formControl = formGroup.get(this.getFormControlName(control));
      if (formControl) {
        formControl.valueChanges
          .pipe(takeUntil(this.unsubscribe$))
          .subscribe((value) => this.onRadioChange(control, value));
      }
    });
  }

  onRadioChange(control: ExperimentFormItem, event: any): void {
    const selectedValue = event;
    const radioGroups = this.getAllRadioGroups();

    radioGroups.forEach((group) => {
      if (group !== control) {
        this.unselectPreviousGroupWithValue(group, selectedValue);
      }
    });

    this.setPreviousSelectedValue(control.name, selectedValue);
  }

  unselectPreviousGroupWithValue(group: ExperimentFormItem, selectedValue: string): void {
    const formControlName = this.getFormControlName(group);
    if (this.form.get(formControlName)?.value === selectedValue) {
      this.unsubscribe$.next();
      this.form.patchValue({[formControlName]: null});
      this.unsubscribe$ = new Subject<void>();
      this.subscribeToRadioGroups(this.form, this.getAllRadioGroups());
    }
  }

  getAllRadioGroups(): Array<ExperimentFormItem> {
    return this.formControls.getValue().filter((item) => item.type === 'radio');
  }

  setPreviousSelectedValue(groupName: string, selectedValue: any): void {
    this.previousSelectedValues.set(groupName, selectedValue);
  }

  formatDescriptionForTooltip(description: string): string {
    return description.replace(/\n/g, '<br>');
  }

  getFormControlName(control: ExperimentFormItem): string {
    return control?.shortName ? control.shortName : control.name;
  }

  saveExperimentForm(): void {
    const formData = this.form.getRawValue();
    formData.experiment = this.experiment;
    console.log(formData);

    this.http.post('http://localhost:3000/experiment', formData)
      .pipe(
        tap((data) => console.log(data))
      )
      .subscribe();
  }
}
