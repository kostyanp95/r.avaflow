import { Injectable } from '@nestjs/common';
import { writeFile } from 'fs';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async saveFile(file) {
    console.log(file);
    const { originalname, buffer } = file;
    await writeFile(`./uploads/${originalname}`, buffer, (err) => {
      if (err) {
        console.error(err);
        throw new Error('Error writing file to disk');
      }
    });
  }
}
