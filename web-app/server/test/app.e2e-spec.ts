import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppGateway } from '../src/app.gateway';
import { AppService } from '../src/app.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let service: AppService;
  let tmpDir: string;

  const mockGateway = {
    server: {
      emit: jest.fn(),
    },
  };

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avaflow-e2e-'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppGateway)
      .useValue(mockGateway)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<AppService>(AppService);
    service.projectsRoot = tmpDir;
    service.uploadsPath = path.join(tmpDir, 'uploads');
    fs.mkdirSync(service.uploadsPath, { recursive: true });
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('GET /projects', () => {
    it('returns array', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /experiment', () => {
    it('creates project, returns success', async () => {
      const projectData = {
        name: 'testProject',
        experiments: [
          {
            name: 'exp1',
            parameters: {
              cellsize: 20,
              phases: 3,
              elevation: 'dem.tif',
              hrelease1: 'release.tif',
              hrelease2: null,
              hrelease3: null,
              hentrmax1: null,
              hentrmax2: null,
              hentrmax3: null,
              density: {
                densityOfP1: 2700,
                densityOfP2: 1800,
                densityOfP3: 1000,
              },
              friction: null,
              viscosity: null,
              cohesion: null,
              impactarea: null,
              tint: 10,
              tend: 30,
            },
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/experiment')
        .send(projectData)
        .expect(201);

      expect(res.body.message).toBe('Script saved successfully');
      expect(res.body.path).toBeDefined();
    });
  });

  describe('GET /project', () => {
    it('returns project data for existing project', async () => {
      // First create a project
      const projDir = path.join(tmpDir, 'testGet');
      fs.mkdirSync(projDir, { recursive: true });
      const projectData = {
        name: 'testGet',
        experiments: [{ name: 'exp1', parameters: {} }],
      };
      fs.writeFileSync(
        path.join(projDir, 'testGet.json'),
        JSON.stringify(projectData),
      );

      const res = await request(app.getHttpServer())
        .get('/project')
        .query({ projectName: 'testGet' })
        .expect(200);

      expect(res.body.name).toBe('testGet');
      expect(res.body.experiments).toHaveLength(1);
    });
  });

  describe('GET /project/:name/files', () => {
    it('returns file list', async () => {
      const dataDir = path.join(tmpDir, 'fileProj', 'DATA');
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(path.join(dataDir, 'dem.tif'), '');
      fs.writeFileSync(path.join(dataDir, 'notes.txt'), '');

      const res = await request(app.getHttpServer())
        .get('/project/fileProj/files')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toContain('dem.tif');
      expect(res.body).not.toContain('notes.txt');
    });

    it('returns empty array for non-existent project', async () => {
      const res = await request(app.getHttpServer())
        .get('/project/nonexistent/files')
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('DELETE /project/:name', () => {
    it('removes project', async () => {
      const projDir = path.join(tmpDir, 'toDelete');
      fs.mkdirSync(projDir, { recursive: true });
      fs.writeFileSync(path.join(projDir, 'toDelete.json'), '{}');

      await request(app.getHttpServer())
        .delete('/project/toDelete')
        .expect(200);

      expect(fs.existsSync(projDir)).toBe(false);
    });
  });

  describe('POST /run/stop', () => {
    it('returns error when no simulation running', async () => {
      const res = await request(app.getHttpServer())
        .post('/run/stop')
        .expect(201);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No simulation');
    });
  });
});
