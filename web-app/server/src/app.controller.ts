import {
  Controller,
  Get,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { AppService, Project } from './app.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { storageOptions } from './storage-options';
import { AppGateway } from './app.gateway';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly appGateway: AppGateway,
  ) {
    this.appService.checkProjectDataDirectory();
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('project')
  async getProjectRasters(
    @Query('projectName') projectName: string,
  ): Promise<void> {
    try {
      const jsonData: Project = await this.appService.readJsonFile(projectName);
      this.appGateway.server.emit('projectData', jsonData);
    } catch (error) {
      console.error('Error getting project data:', error);
    }
  }

  @Get('rasters')
  getProjectRaster(): void {
    this.appService.checkProjectDataDirectory();
  }

  @Post('experiment')
  createExperiment(@Body() projectData: Project) {
    return this.appService.createBashScriptFile(projectData);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('file', null, { storage: storageOptions }))
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return this.appService.saveFiles(files);
  }
}
