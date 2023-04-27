import {HttpClient} from '@angular/common/http';
import {Component, OnInit} from '@angular/core';
import {FormGroup, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup,} from '@angular/forms';
import {BehaviorSubject, tap} from 'rxjs';
import {NzFormTooltipIcon} from "ng-zorro-antd/form";

interface ExperimentFormItem {
  name: string;
  shortName?: string;
  type: ExperimentFormItemType;
  value?: string | number | boolean;
  fields?: Array<ExperimentFormItem>;
  labels?: Array<ExperimentFormRadio>;
  placeholder?: string;
  description?: string;
  defaultValue?: string | number | boolean;
}

interface ExperimentFormRadio extends ExperimentFormItem {
  type: 'radio';
  value: MaterialOfPhase;
}

type ExperimentFormItemType = 'file' | 'number' | 'text' | 'checkbox' | 'radio' | 'group';

interface ExperimentFormGroup extends ExperimentFormItem {
  type: 'group';
  fields: Array<ExperimentFormItem>;
}

type MaterialOfPhase = 's' | 'fs' | 'f';

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
  experiment: string = 'Experiment: 1';


  constructor(private fb: UntypedFormBuilder, private http: HttpClient) {
  }

  ngOnInit(): void {
    this.getFormControlsParams();
  }

  getFormControlsParams(): void {
    this.http.get<Array<ExperimentFormItem | ExperimentFormGroup>>('assets/formControls.json')
      .pipe(
        tap((formControls) => {
          this.formControls.next(formControls)
          this.form = this.initProjectForm(formControls)
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
        formControl.valueChanges.subscribe((value) => this.onRadioChange(control, value));
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
      this.form.patchValue({[formControlName]: null});
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
    console.log(this.form.getRawValue());
  }
}
