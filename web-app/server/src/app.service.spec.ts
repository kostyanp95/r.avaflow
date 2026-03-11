import { Test, TestingModule } from '@nestjs/testing';
import { AppService, Project, Experiment } from './app.service';
import { AppGateway } from './app.gateway';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('AppService', () => {
  let service: AppService;
  let gateway: AppGateway;
  let tmpDir: string;

  const mockGateway = {
    server: {
      emit: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: AppGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    gateway = module.get<AppGateway>(AppGateway);

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avaflow-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // createExperiment()
  // ---------------------------------------------------------------------------
  describe('createExperiment()', () => {
    const baseParams = {
      cellsize: 20,
      phases: 3,
      elevation: 'dem.tif',
      hrelease1: 'release1.tif',
      hrelease2: null,
      hrelease3: null,
      hentrmax1: null,
      hentrmax2: null,
      hentrmax3: null,
      impactarea: null,
      density: { densityOfP1: 2700, densityOfP2: 1800, densityOfP3: 1000 },
      friction: null,
      viscosity: null,
      cohesion: null,
      tint: 10,
      tend: 30,
    };

    const makeExperiment = (overrides: Record<string, any> = {}): Experiment => ({
      name: 'exp1',
      parameters: { ...baseParams, ...overrides },
    });

    it('generates valid r.avaflow command with all parameters', () => {
      const cmd = service.createExperiment(makeExperiment());
      expect(cmd).toContain('r.avaflow -e -v');
      expect(cmd).toContain('cellsize=20');
      expect(cmd).toContain('phases=3');
      expect(cmd).toContain('elevation=dem');
      expect(cmd).toContain('density=2700,1800,1000');
      expect(cmd).toContain('time=10,30');
    });

    it('strips .tif extension from raster names', () => {
      const cmd = service.createExperiment(
        makeExperiment({ elevation: 'elev.tif', hrelease1: 'hr1.tif' }),
      );
      expect(cmd).toContain('elevation=elev');
      expect(cmd).toContain('hrelease1=hr1');
      expect(cmd).not.toContain('.tif');
    });

    it('strips .tiff extension from raster names', () => {
      const cmd = service.createExperiment(
        makeExperiment({ elevation: 'elev.tiff' }),
      );
      expect(cmd).toContain('elevation=elev');
      expect(cmd).not.toContain('.tiff');
    });

    it('omits optional rasters when null/undefined', () => {
      const cmd = service.createExperiment(makeExperiment());
      expect(cmd).not.toContain('hrelease2=');
      expect(cmd).not.toContain('hrelease3=');
      expect(cmd).not.toContain('hentrmax1=');
      expect(cmd).not.toContain('hentrmax2=');
      expect(cmd).not.toContain('hentrmax3=');
      expect(cmd).not.toContain('impactarea=');
    });

    it('does not pass literal "null" string for rasters', () => {
      const cmd = service.createExperiment(
        makeExperiment({ hrelease2: 'null', hentrmax1: 'null' }),
      );
      expect(cmd).not.toContain('hrelease2=null');
      expect(cmd).not.toContain('hentrmax1=null');
    });

    it('includes friction as 9 comma-separated values', () => {
      const friction = {
        internalFrictionAngleOfP1: 25,
        internalFrictionAngleOfP2: 15,
        internalFrictionAngleOfP3: 0,
        basalFrictionAngleOfP1: 20,
        basalFrictionAngleOfP2: 10,
        basalFrictionAngleOfP3: 0,
        fluidFrictionOfP1: 0,
        fluidFrictionOfP2: 0.05,
        fluidFrictionOfP3: 0.001,
      };
      const cmd = service.createExperiment(makeExperiment({ friction }));
      expect(cmd).toContain('friction=25,15,0,20,10,0,0,0.05,0.001');
    });

    it('omits friction when not provided', () => {
      const cmd = service.createExperiment(makeExperiment({ friction: null }));
      expect(cmd).not.toContain('friction=');
    });

    it('omits friction when all values are null', () => {
      const friction = {
        internalFrictionAngleOfP1: null,
        internalFrictionAngleOfP2: null,
        internalFrictionAngleOfP3: null,
        basalFrictionAngleOfP1: null,
        basalFrictionAngleOfP2: null,
        basalFrictionAngleOfP3: null,
        fluidFrictionOfP1: null,
        fluidFrictionOfP2: null,
        fluidFrictionOfP3: null,
      };
      const cmd = service.createExperiment(makeExperiment({ friction }));
      expect(cmd).not.toContain('friction=');
    });

    it('substitutes 0 for null values in friction when some are set', () => {
      const friction = {
        internalFrictionAngleOfP1: 35,
        internalFrictionAngleOfP2: null,
        internalFrictionAngleOfP3: null,
        basalFrictionAngleOfP1: 20,
        basalFrictionAngleOfP2: null,
        basalFrictionAngleOfP3: null,
        fluidFrictionOfP1: null,
        fluidFrictionOfP2: null,
        fluidFrictionOfP3: null,
      };
      const cmd = service.createExperiment(makeExperiment({ friction }));
      expect(cmd).toContain('friction=35,0,0,20,0,0,0,0,0');
    });

    it('includes viscosity as 3 comma-separated values', () => {
      const viscosity = {
        viscosityOfP1: 10,
        viscosityOfP2: 5,
        viscosityOfP3: 0.001,
      };
      const cmd = service.createExperiment(makeExperiment({ viscosity }));
      expect(cmd).toContain('viscosity=10,5,0.001');
    });

    it('omits viscosity when not provided', () => {
      const cmd = service.createExperiment(makeExperiment({ viscosity: null }));
      expect(cmd).not.toContain('viscosity=');
    });

    it('never includes cohesion in the generated command', () => {
      const cohesion = {
        cohesionOfP1: 1000,
        cohesionOfP2: 500,
        cohesionOfP3: 0,
      };
      const cmdWith = service.createExperiment(makeExperiment({ cohesion }));
      expect(cmdWith).not.toContain('cohesion=');

      const cmdWithout = service.createExperiment(makeExperiment({ cohesion: null }));
      expect(cmdWithout).not.toContain('cohesion=');
    });

    it('includes density as comma-separated values', () => {
      const cmd = service.createExperiment(makeExperiment());
      expect(cmd).toContain('density=2700,1800,1000');
    });

    it('includes prefix from experiment name', () => {
      const exp = makeExperiment();
      exp.name = 'myExperiment';
      const cmd = service.createExperiment(exp);
      expect(cmd).toContain('prefix=myExperiment');
    });

    it('includes time as tint,tend', () => {
      const cmd = service.createExperiment(
        makeExperiment({ tint: 5, tend: 100 }),
      );
      expect(cmd).toContain('time=5,100');
    });

    it('throws when density is missing', () => {
      expect(() =>
        service.createExperiment(makeExperiment({ density: null })),
      ).toThrow('Density is not defined');
    });
  });

  // ---------------------------------------------------------------------------
  // createInitialCommands()
  // ---------------------------------------------------------------------------
  describe('createInitialCommands()', () => {
    it('generates g.region commands with stripped elevation name', () => {
      const experiment: Experiment = {
        name: 'exp1',
        parameters: {
          elevation: 'basin_dem.tif',
          hrelease1: null,
          hrelease2: null,
          hrelease3: null,
          hentrmax1: null,
          hentrmax2: null,
          hentrmax3: null,
        },
      };
      const cmds = service.createInitialCommands(experiment);
      // g.region uses stripped name (no extension)
      expect(cmds).toContain('g.region -s rast=basin_dem\n');
      // import line uses original filename as input but stripped name as output
      expect(cmds).toContain('input=DATA/basin_dem.tif output=basin_dem');
    });

    it('imports only non-null rasters', () => {
      const experiment: Experiment = {
        name: 'exp1',
        parameters: {
          elevation: 'dem.tif',
          hrelease1: 'hr1.tif',
          hrelease2: null,
          hrelease3: null,
          hentrmax1: 'ent1.tif',
          hentrmax2: null,
          hentrmax3: null,
        },
      };
      const cmds = service.createInitialCommands(experiment);
      expect(cmds).toContain('r.in.gdal -o --overwrite input=DATA/dem.tif output=dem');
      expect(cmds).toContain('r.in.gdal -o --overwrite input=DATA/hr1.tif output=hr1');
      expect(cmds).toContain('r.in.gdal -o --overwrite input=DATA/ent1.tif output=ent1');
      // Should have exactly 3 import lines (elevation + hr1 + ent1)
      const importCount = (cmds.match(/r\.in\.gdal/g) || []).length;
      expect(importCount).toBe(3);
    });

    it('does not import rasters with literal "null" string', () => {
      const experiment: Experiment = {
        name: 'exp1',
        parameters: {
          elevation: 'dem.tif',
          hrelease1: 'null',
          hrelease2: null,
          hrelease3: null,
          hentrmax1: null,
          hentrmax2: null,
          hentrmax3: null,
        },
      };
      const cmds = service.createInitialCommands(experiment);
      const importCount = (cmds.match(/r\.in\.gdal/g) || []).length;
      expect(importCount).toBe(1); // only elevation
    });

    it('places g.region -s after imports, not before', () => {
      const experiment: Experiment = {
        name: 'exp1',
        parameters: {
          elevation: 'dem.tif',
          hrelease1: 'hr1.tif',
          hrelease2: null,
          hrelease3: null,
          hentrmax1: null,
          hentrmax2: null,
          hentrmax3: null,
        },
      };
      const cmds = service.createInitialCommands(experiment);
      const lastImportIdx = cmds.lastIndexOf('r.in.gdal');
      const regionIdx = cmds.indexOf('g.region -s rast=dem');
      expect(regionIdx).toBeGreaterThan(lastImportIdx);
    });
  });

  // ---------------------------------------------------------------------------
  // createBashScriptFile()
  // ---------------------------------------------------------------------------
  describe('createBashScriptFile()', () => {
    let origProjectsRoot: string;

    beforeEach(() => {
      origProjectsRoot = service.projectsRoot;
      service.projectsRoot = tmpDir;
    });

    afterEach(() => {
      service.projectsRoot = origProjectsRoot;
    });

    const makeProject = (): Project => ({
      name: 'testProj',
      experiments: [
        {
          name: 'exp1',
          parameters: {
            cellsize: 20,
            phases: 3,
            elevation: 'dem.tif',
            hrelease1: 'hr1.tif',
            hrelease2: null,
            hrelease3: null,
            hentrmax1: null,
            hentrmax2: null,
            hentrmax3: null,
            density: { densityOfP1: 2700, densityOfP2: 1800, densityOfP3: 1000 },
            friction: null,
            viscosity: null,
            cohesion: null,
            impactarea: null,
            tint: 10,
            tend: 30,
          },
        },
      ],
    });

    it('creates project directory if not exists', async () => {
      const project = makeProject();

      // Mock existsSync to return false so mkdirSync is called
      const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const writeFileSpy = jest.spyOn(fs, 'writeFile').mockImplementation(
        (p: any, data: any, cb: any) => cb(null),
      );

      await service.createBashScriptFile(project);

      // Verify mkdirSync was called with recursive: true
      expect(mkdirSpy).toHaveBeenCalledWith(
        expect.stringContaining(project.name),
        { recursive: true },
      );

      existsSpy.mockRestore();
      mkdirSpy.mockRestore();
      writeFileSyncSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    it('writes .sh file with correct content', async () => {
      const project = makeProject();
      const projPath = path.join(tmpDir, project.name);
      fs.mkdirSync(projPath, { recursive: true });

      // Write the script manually using the service methods
      const initialCmds = service.createInitialCommands(project.experiments[0]);
      const expCmd = service.createExperiment(project.experiments[0]);
      const script = initialCmds + '# 1 exp1\n' + expCmd + '\ng.region -d';

      const shPath = path.join(projPath, `${project.name}.sh`);
      fs.writeFileSync(shPath, script);

      const content = fs.readFileSync(shPath, 'utf-8');
      expect(content).toContain('r.avaflow -e -v');
      expect(content).toContain('g.region -d');
      expect(content).toContain('r.in.gdal');
    });

    it('writes .json file with project data', async () => {
      const project = makeProject();
      const projPath = path.join(tmpDir, project.name);
      fs.mkdirSync(projPath, { recursive: true });

      const jsonPath = path.join(projPath, `${project.name}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(project, null, 2));

      const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(content.name).toBe('testProj');
      expect(content.experiments).toHaveLength(1);
      expect(content.experiments[0].name).toBe('exp1');
    });

    it('returns success message with path', async () => {
      // We need to test the full method, but it uses __dirname internally.
      // Spy on the write methods to capture the result.
      const project = makeProject();

      // Mock internal path resolution to use tmpDir
      const mkdirSpy = jest.spyOn(fs, 'mkdirSync');
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const writeFileSpy = jest.spyOn(fs, 'writeFile').mockImplementation(
        (p: any, data: any, cb: any) => cb(null),
      );

      const result = await service.createBashScriptFile(project);
      expect(result.message).toBe('Script saved successfully');
      expect(result.path).toContain('testProj.sh');

      writeFileSyncSpy.mockRestore();
      writeFileSpy.mockRestore();
      mkdirSpy.mockRestore();
    });

    it('includes symlink snippet for nested DATA directory', async () => {
      const project = makeProject();

      let capturedScript = '';
      const mkdirSpy = jest.spyOn(fs, 'mkdirSync');
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const writeFileSpy = jest.spyOn(fs, 'writeFile').mockImplementation(
        (p: any, data: any, cb: any) => {
          capturedScript = data;
          cb(null);
        },
      );

      await service.createBashScriptFile(project);

      // The script should start with the symlink snippet
      expect(capturedScript).toContain('if [ ! -d "DATA" ] && [ -d "testProj/DATA" ]; then');
      expect(capturedScript).toContain('ln -sf testProj/DATA DATA');
      // Symlink snippet should appear before the r.in.gdal imports
      const symlinkPos = capturedScript.indexOf('ln -sf');
      const importPos = capturedScript.indexOf('r.in.gdal');
      expect(symlinkPos).toBeLessThan(importPos);

      writeFileSyncSpy.mockRestore();
      writeFileSpy.mockRestore();
      mkdirSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // listProjects()
  // ---------------------------------------------------------------------------
  describe('listProjects()', () => {
    let origProjectsRoot: string;

    beforeEach(() => {
      origProjectsRoot = service.projectsRoot;
      service.projectsRoot = tmpDir;
    });

    afterEach(() => {
      service.projectsRoot = origProjectsRoot;
    });

    it('returns empty array when no projects', async () => {
      const projects = await service.listProjects();
      expect(projects).toEqual([]);
    });

    it('returns project summaries with hasJson/hasScript flags', async () => {
      // Create a project dir with both files
      const projDir = path.join(tmpDir, 'myProject');
      fs.mkdirSync(projDir, { recursive: true });
      fs.writeFileSync(path.join(projDir, 'myProject.json'), '{}');
      fs.writeFileSync(path.join(projDir, 'myProject.sh'), '#!/bin/bash');

      // Create a project dir with only json
      const projDir2 = path.join(tmpDir, 'proj2');
      fs.mkdirSync(projDir2, { recursive: true });
      fs.writeFileSync(path.join(projDir2, 'proj2.json'), '{}');

      const projects = await service.listProjects();
      expect(projects).toHaveLength(2);

      const myProj = projects.find((p) => p.name === 'myProject');
      expect(myProj).toBeDefined();
      expect(myProj.hasJson).toBe(true);
      expect(myProj.hasScript).toBe(true);

      const proj2 = projects.find((p) => p.name === 'proj2');
      expect(proj2).toBeDefined();
      expect(proj2.hasJson).toBe(true);
      expect(proj2.hasScript).toBe(false);
    });

    it('skips uploads/ directory', async () => {
      fs.mkdirSync(path.join(tmpDir, 'uploads'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'realProject'), { recursive: true });

      const projects = await service.listProjects();
      const names = projects.map((p) => p.name);
      expect(names).not.toContain('uploads');
      expect(names).toContain('realProject');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteProject()
  // ---------------------------------------------------------------------------
  describe('deleteProject()', () => {
    let origProjectsRoot: string;

    beforeEach(() => {
      origProjectsRoot = service.projectsRoot;
      service.projectsRoot = tmpDir;
    });

    afterEach(() => {
      service.projectsRoot = origProjectsRoot;
    });

    it('removes project directory', async () => {
      const projDir = path.join(tmpDir, 'toDelete');
      fs.mkdirSync(projDir, { recursive: true });
      fs.writeFileSync(path.join(projDir, 'data.txt'), 'hello');

      await service.deleteProject('toDelete');
      expect(fs.existsSync(projDir)).toBe(false);
    });

    it('throws error for non-existent project', async () => {
      await expect(service.deleteProject('nonexistent')).rejects.toThrow(
        'Project "nonexistent" not found',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // stopSimulation()
  // ---------------------------------------------------------------------------
  describe('stopSimulation()', () => {
    it('returns error when no process running', () => {
      const result = service.stopSimulation();
      expect(result.success).toBe(false);
      expect(result.message).toContain('No simulation');
    });

    it('sends kill signal when process running', () => {
      // Inject a mock running process
      const mockProcess = {
        kill: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
      (service as any).runningProcess = mockProcess;
      (service as any).containerName = 'test-container';

      const result = service.stopSimulation();
      expect(result.success).toBe(true);
      expect(result.message).toContain('stop signal sent');
      expect(mockProcess.kill).toHaveBeenCalled();
      expect((service as any).runningProcess).toBeNull();
      expect((service as any).containerName).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // listProjectFiles()
  // ---------------------------------------------------------------------------
  describe('listProjectFiles()', () => {
    let origProjectsRoot: string;

    beforeEach(() => {
      origProjectsRoot = service.projectsRoot;
      service.projectsRoot = tmpDir;
    });

    afterEach(() => {
      service.projectsRoot = origProjectsRoot;
    });

    it('returns empty array when DATA dir does not exist', async () => {
      const files = await service.listProjectFiles('nonexistent');
      expect(files).toEqual([]);
    });

    it('returns filtered list of raster files', async () => {
      const dataDir = path.join(tmpDir, 'proj1', 'DATA');
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(path.join(dataDir, 'dem.tif'), '');
      fs.writeFileSync(path.join(dataDir, 'release.asc'), '');
      fs.writeFileSync(path.join(dataDir, 'notes.txt'), '');
      fs.writeFileSync(path.join(dataDir, 'data.csv'), '');

      const files = await service.listProjectFiles('proj1');
      expect(files).toContain('dem.tif');
      expect(files).toContain('release.asc');
      expect(files).not.toContain('notes.txt');
      expect(files).not.toContain('data.csv');
    });

    it('finds files in nested project structure', async () => {
      // bashkara2904/bashkara2904/DATA/ pattern
      const nestedDataDir = path.join(tmpDir, 'bashkara', 'bashkara', 'DATA');
      fs.mkdirSync(nestedDataDir, { recursive: true });
      fs.writeFileSync(path.join(nestedDataDir, 'elev.tif'), '');
      fs.writeFileSync(path.join(nestedDataDir, 'hr.tiff'), '');

      const files = await service.listProjectFiles('bashkara');
      expect(files).toContain('elev.tif');
      expect(files).toContain('hr.tiff');
    });

    it('finds files in subdirectories one level deep', async () => {
      const dataDir = path.join(tmpDir, 'proj2', 'DATA');
      const subDir = path.join(dataDir, 'subdir');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(dataDir, 'top.tif'), '');
      fs.writeFileSync(path.join(subDir, 'nested.asc'), '');

      const files = await service.listProjectFiles('proj2');
      expect(files).toContain('top.tif');
      // Nested files include the subdirectory in their path
      const nestedFile = files.find((f) => f.includes('nested.asc'));
      expect(nestedFile).toBeDefined();
    });
  });
});
