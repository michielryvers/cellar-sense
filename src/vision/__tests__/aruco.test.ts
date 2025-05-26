/**
 * ArUco detection tests
 * Tests the ArUco marker detection utility with a sample image
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { detectTags, DetectedTag } from '../aruco';
import path from 'path';
import fs from 'fs';

// Mock OpenCV.js to avoid loading the WASM module during tests
vi.mock('../opencv-loader', () => {
  // Sample data representing 4 ArUco markers with IDs 0, 1, 2, 3
  const mockDetectedMarkers = [
    {
      id: 0,
      corners: [
        [50, 50],
        [100, 50],
        [100, 100],
        [50, 100]
      ]
    },
    {
      id: 1,
      corners: [
        [150, 50],
        [200, 50],
        [200, 100],
        [150, 100]
      ]
    },
    {
      id: 2,
      corners: [
        [50, 150],
        [100, 150],
        [100, 200],
        [50, 200]
      ]
    },
    {
      id: 3,
      corners: [
        [150, 150],
        [200, 150],
        [200, 200],
        [150, 200]
      ]
    }
  ];
  // Mock the entire OpenCV implementation needed for ArUco detection
  const mockCV = {
    matFromImageData: vi.fn().mockReturnValue({ 
      data: new Uint8Array(),
      delete: vi.fn()
    }),
    cvtColor: vi.fn(),
    aruco_Dictionary: vi.fn().mockImplementation(() => ({
      delete: vi.fn()
    })),
    aruco_DetectorParameters: vi.fn().mockImplementation(() => ({
      delete: vi.fn()
    })),
    aruco_getPredefinedDictionary: vi.fn(),
    aruco_detectMarkers: vi.fn().mockImplementation((src, dict, corners, ids) => {
      // Simulate detection by setting mock data
      ids.rows = mockDetectedMarkers.length;
      ids.data32S = mockDetectedMarkers.map(marker => marker.id);
        // Mock corners.get() to return formatted corner data
      corners.get = vi.fn().mockImplementation((index) => {        const marker = mockDetectedMarkers[index];
        // Create a flattened array in the format OpenCV would provide: [x1,y1,x2,y2,x3,y3,x4,y4]
        const flatCorners: number[] = [];
        marker.corners.forEach(corner => {
          flatCorners.push(corner[0], corner[1]);
        });
        return {
          data32F: flatCorners,
          delete: vi.fn()
        };
      });
    }),
    MatVector: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      delete: vi.fn()
    })),
    Mat: vi.fn().mockImplementation(() => ({
      data32S: [],
      data32F: [],
      rows: 0,
      delete: vi.fn()
    })),
    COLOR_RGBA2GRAY: 'COLOR_RGBA2GRAY'
  };

  return {
    loadOpenCV: vi.fn().mockResolvedValue(mockCV)
  };
});

describe('ArUco detection', () => {
  // Create a mock ImageData object for testing
  const createMockImageData = (): ImageData => {
    return {
      width: 300,
      height: 300,
      data: new Uint8ClampedArray(300 * 300 * 4), // RGBA data
      colorSpace: 'srgb'
    };
  };

  it('detects ArUco markers in an image', async () => {
    // Use mock image data
    const imageData = createMockImageData();
    
    // Call the detection function
    const tags = await detectTags(imageData);
    
    // Assert on the results
    expect(tags).toHaveLength(4);
    
    // Check if all expected IDs are present
    const detectedIds = tags.map(tag => tag.id);
    expect(detectedIds).toContain(0);
    expect(detectedIds).toContain(1);
    expect(detectedIds).toContain(2);
    expect(detectedIds).toContain(3);
    
    // Verify that each tag has 4 corners
    tags.forEach(tag => {
      expect(tag.corners).toHaveLength(4);
      tag.corners.forEach(corner => {
        expect(corner).toHaveLength(2); // [x, y]
        expect(typeof corner[0]).toBe('number');
        expect(typeof corner[1]).toBe('number');
      });
    });
  });
});
