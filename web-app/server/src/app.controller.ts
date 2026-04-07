import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  Res,
  UploadedFiles,
  UseInterceptors,
  Query,
  StreamableFile,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppService, Project, ProjectSummary, ResultFile } from './app.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { storageOptions } from './storage-options';
import { AppGateway } from './app.gateway';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';

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

  @Get('project/:name/results')
  async listResults(@Param('name') name: string): Promise<ResultFile[]> {
    try {
      return await this.appService.listResultFiles(name);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Get('project/:name/results/download')
  async downloadResults(
    @Param('name') name: string,
    @Res() res: Response,
  ): Promise<void> {
    let projectPath: string;
    try {
      projectPath = this.appService.getProjectPath(name);
    } catch (error) {
      throw new NotFoundException(error.message);
    }

    const resultFiles = await this.appService.listResultFiles(name);
    if (resultFiles.length === 0) {
      throw new NotFoundException('No result files found');
    }

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${name}_results.zip"`,
    });

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    for (const file of resultFiles) {
      const fullPath = path.join(projectPath, file.path);
      archive.file(fullPath, { name: file.path });
    }

    await archive.finalize();
  }

  @Get('project/:name/results/*')
  async getResultFile(
    @Param('name') name: string,
    @Param() params: Record<string, string>,
  ): Promise<StreamableFile> {
    // NestJS wildcard params come as params['0']
    const filepath = params['0'];
    if (!filepath) {
      throw new BadRequestException('File path is required');
    }

    let fullPath: string;
    try {
      fullPath = this.appService.getResultFilePath(name, filepath);
    } catch (error) {
      throw new NotFoundException(error.message);
    }

    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.asc': 'text/plain',
      '.tif': 'image/tiff',
      '.tiff': 'image/tiff',
    };

    const stream = fs.createReadStream(fullPath);
    return new StreamableFile(stream, {
      type: mimeTypes[ext] || 'application/octet-stream',
      disposition: `inline; filename="${path.basename(fullPath)}"`,
    });
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('file', null, { storage: storageOptions }))
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return this.appService.saveFiles(files);
  }
}
