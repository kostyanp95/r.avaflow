import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppGateway } from './app.gateway';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  const mockGateway = {
    server: {
      emit: jest.fn(),
    },
  };

  const mockService = {
    getHello: jest.fn().mockReturnValue('Hello World!'),
    checkProjectDataDirectory: jest.fn().mockResolvedValue(undefined),
    listProjects: jest.fn().mockResolvedValue([]),
    getProjectByName: jest.fn(),
    createBashScriptFile: jest.fn(),
    runSimulation: jest.fn(),
    stopSimulation: jest.fn(),
    deleteProject: jest.fn(),
    listProjectFiles: jest.fn(),
    saveFiles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockService },
        { provide: AppGateway, useValue: mockGateway },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHello()', () => {
    it('should return "Hello World!"', () => {
      expect(controller.getHello()).toBe('Hello World!');
    });
  });

  describe('listProjects()', () => {
    it('should return project summaries from service', async () => {
      const mockProjects = [
        { name: 'proj1', hasJson: true, hasScript: true },
        { name: 'proj2', hasJson: true, hasScript: false },
      ];
      mockService.listProjects.mockResolvedValue(mockProjects);

      const result = await controller.listProjects();
      expect(result).toEqual(mockProjects);
      expect(mockService.listProjects).toHaveBeenCalled();
    });
  });

  describe('getProject()', () => {
    it('should return project data and emit via gateway', async () => {
      const mockProject = { name: 'test', experiments: [] };
      mockService.getProjectByName.mockResolvedValue(mockProject);

      const result = await controller.getProject('test');
      expect(result).toEqual(mockProject);
      expect(mockGateway.server.emit).toHaveBeenCalledWith('projectData', mockProject);
    });

    it('should return null on error', async () => {
      mockService.getProjectByName.mockRejectedValue(new Error('not found'));
      const result = await controller.getProject('missing');
      expect(result).toBeNull();
    });
  });

  describe('createExperiment()', () => {
    it('should call createBashScriptFile with project data', async () => {
      const projectData = { name: 'proj', experiments: [] };
      const expected = { message: 'Script saved', path: '/tmp/proj.sh' };
      mockService.createBashScriptFile.mockResolvedValue(expected);

      const result = await controller.createExperiment(projectData);
      expect(result).toEqual(expected);
      expect(mockService.createBashScriptFile).toHaveBeenCalledWith(projectData);
    });
  });

  describe('runSimulation()', () => {
    it('should call runSimulation on service', () => {
      const expected = { success: true, message: 'started' };
      mockService.runSimulation.mockReturnValue(expected);

      const result = controller.runSimulation({ projectName: 'test' });
      expect(result).toEqual(expected);
      expect(mockService.runSimulation).toHaveBeenCalledWith('test');
    });
  });

  describe('stopSimulation()', () => {
    it('should call stopSimulation on service', () => {
      const expected = { success: false, message: 'No simulation is currently running' };
      mockService.stopSimulation.mockReturnValue(expected);

      const result = controller.stopSimulation();
      expect(result).toEqual(expected);
      expect(mockService.stopSimulation).toHaveBeenCalled();
    });
  });

  describe('deleteProject()', () => {
    it('should call deleteProject and return message', async () => {
      mockService.deleteProject.mockResolvedValue(undefined);

      const result = await controller.deleteProject('proj1');
      expect(result).toEqual({ message: 'Project "proj1" deleted' });
      expect(mockService.deleteProject).toHaveBeenCalledWith('proj1');
    });
  });

  describe('listProjectFiles()', () => {
    it('should return file list from service', async () => {
      const files = ['dem.tif', 'release.asc'];
      mockService.listProjectFiles.mockResolvedValue(files);

      const result = await controller.listProjectFiles('proj1');
      expect(result).toEqual(files);
      expect(mockService.listProjectFiles).toHaveBeenCalledWith('proj1');
    });
  });
});
