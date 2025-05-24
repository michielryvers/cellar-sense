import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveCellarPhoto,
  getAllCellarPhotos,
  getCellarPhoto,
  deleteCellarPhoto,
  createCellarPhotoUrl,
} from '../cellar-photo-storage';
import { resizeImageToBlob } from '../../utils/imageHelpers';
import type { CellarPhoto } from '../../shared/types';

// Mock dependencies
vi.mock('../dexie-db', () => ({
  db: {
    cellarPhotos: {
      add: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
      get: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../utils/imageHelpers', () => ({
  resizeImageToBlob: vi.fn(),
}));

// Cast the mocked function
const mockResizeImageToBlob = resizeImageToBlob as any;

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
});

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('cellar-photo-storage', () => {
  const mockBlob = new Blob(['test image data'], { type: 'image/jpeg' });
  const mockResizedBlob = new Blob(['resized image data'], { type: 'image/jpeg' });
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockResizeImageToBlob.mockResolvedValue(mockResizedBlob);
    
    // Mock Image constructor for dimension reading
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 1920;
      naturalHeight = 1080;
      
      set src(value: string) {
        // Simulate successful image load
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveCellarPhoto', () => {
    it('should save a cellar photo with correct data', async () => {
      const { db } = await import('../dexie-db');
      (db.cellarPhotos.add as any).mockResolvedValue('mock-uuid-123');

      const detectedTags = [
        { id: 1, x: 100, y: 100 },
        { id: 2, x: 200, y: 200 },
      ];

      const result = await saveCellarPhoto(mockBlob, detectedTags);

      expect(mockResizeImageToBlob).toHaveBeenCalledWith(mockBlob, 1920);
      expect(db.cellarPhotos.add).toHaveBeenCalledWith({
        id: 'mock-uuid-123',
        blob: mockResizedBlob,
        width: 1920,
        height: 1080,
        createdAt: expect.any(Number),
      });
      expect(result).toEqual({
        id: 'mock-uuid-123',
        blob: mockResizedBlob,
        width: 1920,
        height: 1080,
        createdAt: expect.any(Number),
      });
    });

    it('should resize image to max 1920px', async () => {
      const { db } = await import('../dexie-db');
      (db.cellarPhotos.add as any).mockResolvedValue('mock-uuid-123');

      await saveCellarPhoto(mockBlob, []);

      expect(mockResizeImageToBlob).toHaveBeenCalledWith(mockBlob, 1920);
    });

    it('should handle empty detected tags array', async () => {
      const { db } = await import('../dexie-db');
      (db.cellarPhotos.add as any).mockResolvedValue('mock-uuid-123');

      const result = await saveCellarPhoto(mockBlob, []);

      expect(result).toBeDefined();
      expect(db.cellarPhotos.add).toHaveBeenCalled();
    });    it('should throw error if database save fails', async () => {
      const { db } = await import('../dexie-db');
      (db.cellarPhotos.add as any).mockRejectedValue(new Error('Database error'));

      await expect(saveCellarPhoto(mockBlob, [])).rejects.toThrow('Failed to save cellar photo');
    });
  });
  describe('getAllCellarPhotos', () => {
    it('should retrieve all photos sorted by creation date', async () => {
      const mockPhotos: CellarPhoto[] = [
        {
          id: 'photo-1',
          blob: mockBlob,
          width: 1920,
          height: 1080,
          createdAt: Date.now() - 1000,
        },
        {
          id: 'photo-2',
          blob: mockBlob,
          width: 1920,
          height: 1080,
          createdAt: Date.now(),
        },
      ];

      const { db } = await import('../dexie-db');
      const mockToArray = vi.fn().mockResolvedValue(mockPhotos);
      const mockReverse = vi.fn().mockReturnValue({ toArray: mockToArray });
      (db.cellarPhotos.orderBy as any).mockReturnValue({ reverse: mockReverse });

      const result = await getAllCellarPhotos();

      expect(result).toEqual(mockPhotos);
      expect(db.cellarPhotos.orderBy).toHaveBeenCalledWith('createdAt');
      expect(mockReverse).toHaveBeenCalled();
      expect(mockToArray).toHaveBeenCalled();
    });

    it('should throw error if database retrieval fails', async () => {
      const { db } = await import('../dexie-db');
      const mockToArray = vi.fn().mockRejectedValue(new Error('Database error'));
      const mockReverse = vi.fn().mockReturnValue({ toArray: mockToArray });
      (db.cellarPhotos.orderBy as any).mockReturnValue({ reverse: mockReverse });

      await expect(getAllCellarPhotos()).rejects.toThrow('Failed to retrieve cellar photos');
    });
  });

  describe('getCellarPhoto', () => {
    it('should retrieve a specific photo by ID', async () => {
      const mockPhoto: CellarPhoto = {
        id: 'photo-1',
        blob: mockBlob,
        width: 1920,
        height: 1080,
        createdAt: Date.now(),
      };

      const { db } = await import('../dexie-db');
      (db.cellarPhotos.get as any).mockResolvedValue(mockPhoto);

      const result = await getCellarPhoto('photo-1');

      expect(result).toEqual(mockPhoto);
      expect(db.cellarPhotos.get).toHaveBeenCalledWith('photo-1');
    });

    it('should return undefined if photo not found', async () => {
      const { db } = await import('../dexie-db');
      (db.cellarPhotos.get as any).mockResolvedValue(undefined);

      const result = await getCellarPhoto('non-existent');

      expect(result).toBeUndefined();
      expect(db.cellarPhotos.get).toHaveBeenCalledWith('non-existent');
    });    it('should throw error if database retrieval fails', async () => {
      const { db } = await import('../dexie-db');
      (db.cellarPhotos.get as any).mockRejectedValue(new Error('Database error'));

      await expect(getCellarPhoto('photo-1')).rejects.toThrow('Failed to retrieve cellar photo');
    });
  });

  describe('deleteCellarPhoto', () => {
    it('should delete a photo by ID', async () => {
      const { db } = await import('../dexie-db');
      (db.cellarPhotos.delete as any).mockResolvedValue(undefined);

      await deleteCellarPhoto('photo-1');

      expect(db.cellarPhotos.delete).toHaveBeenCalledWith('photo-1');
    });    it('should throw error if database deletion fails', async () => {
      const { db } = await import('../dexie-db');
      (db.cellarPhotos.delete as any).mockRejectedValue(new Error('Database error'));

      await expect(deleteCellarPhoto('photo-1')).rejects.toThrow('Failed to delete cellar photo');
    });
  });

  describe('createCellarPhotoUrl', () => {
    it('should create a blob URL for a cellar photo', () => {
      const mockPhoto: CellarPhoto = {
        id: 'photo-1',
        blob: mockBlob,
        width: 1920,
        height: 1080,
        createdAt: Date.now(),
      };

      const result = createCellarPhotoUrl(mockPhoto);

      expect(result).toBe('blob:mock-url');
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });
  });
});
