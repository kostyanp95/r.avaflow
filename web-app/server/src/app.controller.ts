import {
  Controller,
  Get,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { storageOptions } from './storage-options';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
    this.appService.checkUploadsDirectory();
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('rasters')
  getProjectRasters(): void {
    this.appService.checkUploadsDirectory();
  }

  @Post('experiment')
  createExperiment(@Body() object: any) {
    return this.appService.createBashScriptFile(object);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('file', null, { storage: storageOptions }))
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return this.appService.saveFiles(files);
  }
}
