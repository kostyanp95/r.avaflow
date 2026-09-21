import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
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
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import { AuthService, AuthUser } from './auth/auth.service';
import { AdminOnly, Public } from './auth/auth.decorators';
import { authConfig } from './auth/auth.config';
import { authStore } from './auth/auth-store';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly appGateway: AppGateway,
    private readonly authService: AuthService,
  ) {
    this.appService.checkProjectDataDirectory();
  }

  @Public()
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
    @Req() req: Request,
  ): Promise<Project | null> {
    const user = (req as any).user as AuthUser | undefined;
    this.authService.assertProjectAccess(user ?? null, projectName);
    try {
      const jsonData: Project = await this.appService.getProjectByName(projectName);
      this.appGateway.emitToUser(user?.id ?? null, 'projectData', jsonData);
      return jsonData;
    } catch (error) {
      console.error('Error getting project data:', error);
      return null;
    }
  }

  @Get('projects')
  listProjects(@Req() req: Request): Promise<ProjectSummary[]> {
    return this.appService.listProjects((req as any).user as AuthUser | undefined);
  }

  @Delete('project/:name')
  async deleteProject(
    @Param('name') name: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const user = (req as any).user as AuthUser | undefined;
    this.authService.assertProjectAccess(user ?? null, name);
    await this.appService.deleteProject(name);
    if (authConfig.enabled) {
      authStore.removeOwner(name);
    }
    return { message: `Project "${name}" deleted` };
  }

  @Get('rasters')
  getProjectRaster(): void {
    this.appService.checkProjectDataDirectory();
  }

  @Post('experiment')
  createExperiment(@Body() projectData: Project, @Req() req: Request) {
    const user = (req as any).user as AuthUser | undefined;
    if (authConfig.enabled && user) {
      const existingOwner = authStore.getOwner(projectData?.name);
      if (existingOwner !== null && existingOwner !== user.id) {
        throw new BadRequestException(
          `Project "${projectData.name}" already belongs to another user`,
        );
      }
    }
    const result = this.appService.createBashScriptFile(projectData);
    if (authConfig.enabled && user) {
      // Claim ownership on creation (or keep own/absent ownership).
      if (authStore.getOwner(projectData.name) == null) {
        authStore.setOwner(projectData.name, user.id);
      }
    }
    return result;
  }

  @Post('run')
  runSimulation(@Body() body: { projectName: string }, @Req() req: Request) {
    const user = (req as any).user as AuthUser | undefined;
    this.authService.assertProjectAccess(user ?? null, body?.projectName);
    return this.appService.runSimulation(
      body.projectName,
      authConfig.enabled ? user?.id ?? null : null,
    );
  }

  @Post('run/stop')
  stopSimulation(@Req() req: Request) {
    const user = (req as any).user as AuthUser | undefined;
    return this.appService.stopSimulation(
      authConfig.enabled ? user ?? null : null,
    );
  }

  @Get('run/cpus')
  getCpuCores() {
    return { cpus: parseInt(process.env.OMP_NUM_THREADS || '8', 10) };
  }

  @Put('run/cpus')
  @AdminOnly()
  updateCpus(@Body() body: { cpus: number }) {
    return this.appService.updateCpuLimit(body.cpus);
  }

  @Get('run/stats')
  getStats() {
    return this.appService.getSimulationStats();
  }

  @Get('project/:name/files')
  listProjectFiles(@Param('name') name: string, @Req() req: Request) {
    const user = (req as any).user as AuthUser | undefined;
    this.authService.assertProjectAccess(user ?? null, name);
    return this.appService.listProjectFiles(name);
  }

  @Get('project/:name/results')
  async listResults(@Param('name') name: string, @Req() req: Request): Promise<ResultFile[]> {
    const user = (req as any).user as AuthUser | undefined;
    this.authService.assertProjectAccess(user ?? null, name);
    try {
      return await this.appService.listResultFiles(name);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Get('project/:name/results/download')
  async downloadResults(
    @Param('name') name: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const user = (req as any).user as AuthUser | undefined;
    this.authService.assertProjectAccess(user ?? null, name);

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
    @Req() req: Request,
  ): Promise<StreamableFile> {
    const user = (req as any).user as AuthUser | undefined;
    this.authService.assertProjectAccess(user ?? null, name);

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
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const user = (req as any).user as AuthUser | undefined;
    return this.appService.saveFiles(files, authConfig.enabled ? user?.id ?? null : null);
  }
}
