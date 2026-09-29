import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  const originalPublicApiUrl = process.env.PUBLIC_API_URL;
  const originalAppUrl = process.env.APP_URL;

  beforeEach(() => {
    delete process.env.PUBLIC_API_URL;
    delete process.env.APP_URL;
    service = new UploadService();
  });

  afterEach(() => {
    if (originalPublicApiUrl === undefined) {
      delete process.env.PUBLIC_API_URL;
    } else {
      process.env.PUBLIC_API_URL = originalPublicApiUrl;
    }
    if (originalAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = originalAppUrl;
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

  it('falls back to APP_URL when PUBLIC_API_URL is unset', () => {
    process.env.APP_URL = 'https://p2p.example.com';
    expect(service.getFileUrl('abc.png', 'cards')).toBe(
      'https://p2p.example.com/uploads/cards/abc.png',
    );
  });

  it('prefers PUBLIC_API_URL over APP_URL', () => {
    process.env.PUBLIC_API_URL = 'https://api.example.com/';
    process.env.APP_URL = 'https://app.example.com';
    expect(service.getFileUrl('abc.png', 'cards')).toBe(
      'https://api.example.com/uploads/cards/abc.png',
    );
  });

  it('uses PUBLIC_API_URL when set and strips trailing slashes', () => {
    process.env.PUBLIC_API_URL = 'https://api.example.com/';
    expect(service.getFileUrl('abc.png', 'cards')).toBe(
      'https://api.example.com/uploads/cards/abc.png',
    );
  });

  describe('normalizeStoredFileUrl', () => {
    it('returns empty string for nullish input', () => {
      expect(service.normalizeStoredFileUrl(null)).toBe('');
      expect(service.normalizeStoredFileUrl(undefined)).toBe('');
      expect(service.normalizeStoredFileUrl('')).toBe('');
    });

    it('prefixes relative /uploads paths with the configured base', () => {
      process.env.APP_URL = 'https://p2p.example.com';
      expect(service.normalizeStoredFileUrl('/uploads/cards/abc.png')).toBe(
        'https://p2p.example.com/uploads/cards/abc.png',
      );
    });

    it('rewrites stale localhost origins onto the configured base', () => {
      process.env.APP_URL = 'https://p2p.example.com';
      expect(
        service.normalizeStoredFileUrl(
          'http://localhost:3000/uploads/cards/abc.png',
        ),
      ).toBe('https://p2p.example.com/uploads/cards/abc.png');
      expect(
        service.normalizeStoredFileUrl('http://localhost/uploads/cards/x.jpg'),
      ).toBe('https://p2p.example.com/uploads/cards/x.jpg');
      expect(
        service.normalizeStoredFileUrl(
          'https://localhost:8080/uploads/disputes/y.png',
        ),
      ).toBe('https://p2p.example.com/uploads/disputes/y.png');
    });

    it('leaves already-correct and external absolute URLs untouched', () => {
      process.env.APP_URL = 'https://p2p.example.com';
      expect(
        service.normalizeStoredFileUrl(
          'https://p2p.example.com/uploads/cards/abc.png',
        ),
      ).toBe('https://p2p.example.com/uploads/cards/abc.png');
      expect(
        service.normalizeStoredFileUrl('https://cdn.example.com/img.png'),
      ).toBe('https://cdn.example.com/img.png');
    });

    it('does not rewrite localhost URLs outside /uploads', () => {
      process.env.APP_URL = 'https://p2p.example.com';
      expect(
        service.normalizeStoredFileUrl('http://localhost:3000/other/path.png'),
      ).toBe('http://localhost:3000/other/path.png');
    });
  });

  describe('toRelativeStoredUrl', () => {
    it('returns empty string for nullish input', () => {
      expect(service.toRelativeStoredUrl(null)).toBe('');
      expect(service.toRelativeStoredUrl(undefined)).toBe('');
      expect(service.toRelativeStoredUrl('')).toBe('');
    });

    it('strips stale localhost origins down to the relative path', () => {
      expect(
        service.toRelativeStoredUrl(
          'http://localhost:3000/uploads/avatars/pic.png',
        ),
      ).toBe('/uploads/avatars/pic.png');
      expect(
        service.toRelativeStoredUrl('http://localhost/uploads/cards/x.jpg'),
      ).toBe('/uploads/cards/x.jpg');
    });

    it('strips the configured public base down to the relative path', () => {
      process.env.APP_URL = 'https://p2p.example.com';
      expect(
        service.toRelativeStoredUrl(
          'https://p2p.example.com/uploads/avatars/pic.png',
        ),
      ).toBe('/uploads/avatars/pic.png');
    });

    it('leaves relative paths and external absolute URLs untouched', () => {
      expect(service.toRelativeStoredUrl('/uploads/avatars/pic.png')).toBe(
        '/uploads/avatars/pic.png',
      );
      expect(
        service.toRelativeStoredUrl('https://cdn.example.com/img.png'),
      ).toBe('https://cdn.example.com/img.png');
    });
  });
});
