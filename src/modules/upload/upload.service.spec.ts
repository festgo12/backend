import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  const originalEnv = process.env.PUBLIC_API_URL;

  beforeEach(() => {
    service = new UploadService();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PUBLIC_API_URL;
    } else {
      process.env.PUBLIC_API_URL = originalEnv;
    }
  });

  it('returns a disputes path by default', () => {
    expect(service.getUploadPath('a.jpg')).toContain('uploads');
    expect(service.getUploadPath('a.jpg').split('uploads')[1]).toContain(
      'disputes',
    );
  });

  it('builds an absolute URL for the given subdir', () => {
    expect(service.getFileUrl('abc.png')).toBe(
      'http://localhost:3000/uploads/disputes/abc.png',
    );
    expect(service.getFileUrl('abc.png', 'cards')).toBe(
      'http://localhost:3000/uploads/cards/abc.png',
    );
  });

  it('uses PUBLIC_API_URL when set and strips trailing slashes', () => {
    process.env.PUBLIC_API_URL = 'https://api.example.com/';
    expect(service.getFileUrl('abc.png', 'cards')).toBe(
      'https://api.example.com/uploads/cards/abc.png',
    );
  });
});
