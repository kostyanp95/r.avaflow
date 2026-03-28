import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  UploadedFiles,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { AppService, Project, ProjectSummary } from './app.service';
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

  @Get('health')
  getHealth(): { status: string; timestamp: number } {
    return { status: 'ok', timestamp: Date.now() };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('project')
  async getProject(
    @Query('projectName') projectName: string,
  ): Promise<Project | null> {
    try {
      const jsonData: Project = await this.appService.getProjectByName(projectName);
      this.appGateway.server.emit('projectData', jsonData);
      return jsonData;
    } catch (error) {
      console.error('Error getting project data:', error);
      return null;
    }
  }

  @Get('projects')
  listProjects(): Promise<ProjectSummary[]> {
    return this.appService.listProjects();
  }

  @Delete('project/:name')
  async deleteProject(@Param('name') name: string): Promise<{ message: string }> {
    await this.appService.deleteProject(name);
    return { message: `Project "${name}" deleted` };
  }

  @Get('rasters')
  getProjectRaster(): void {
    this.appService.checkProjectDataDirectory();
  }

  @Post('experiment')
  createExperiment(@Body() projectData: Project) {
    return this.appService.createBashScriptFile(projectData);
  }

  @Post('run')
  runSimulation(@Body() body: { projectName: string }) {
    return this.appService.runSimulation(body.projectName);
  }

  @Post('run/stop')
  stopSimulation() {
    return this.appService.stopSimulation();
  }

  @Get('project/:name/files')
  listProjectFiles(@Param('name') name: string) {
    return this.appService.listProjectFiles(name);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('file', null, { storage: storageOptions }))
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return this.appService.saveFiles(files);
  }
}
