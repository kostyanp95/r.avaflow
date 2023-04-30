export interface ExperimentFormItem {
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

export interface ExperimentFormRadio extends ExperimentFormItem {
  type: 'radio';
  value: MaterialOfPhase;
}

export type ExperimentFormItemType = 'file' | 'number' | 'text' | 'checkbox' | 'radio' | 'group';

export interface ExperimentFormGroup extends ExperimentFormItem {
  type: 'group';
  fields: Array<ExperimentFormItem>;
}

export type MaterialOfPhase = 's' | 'fs' | 'f';

export interface RasterFromServer {
  name: string;
  path?: string;
  values?: Array<string>;
}

export interface RastersFromServer {
  filesUploaded: Array<RasterFromServer>;
}
