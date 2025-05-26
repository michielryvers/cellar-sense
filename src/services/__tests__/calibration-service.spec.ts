import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CalibrationService } from '../calibration-service'
import { createPinia, setActivePinia } from 'pinia'

// Mock the vision store
vi.mock('../stores/vision', () => ({
  useVisionStore: () => ({
    markersInView: [],
    update: vi.fn()
  })
}))

// Mock the detectTags function
vi.mock('../vision/aruco', () => ({
  detectTags: vi.fn().mockResolvedValue([])
}))

// Mock the database
vi.mock('../services/dexie-db', () => ({
  db: {
    cellarVisionDefinition: {
      put: vi.fn().mockResolvedValue(undefined)
    }
  }
}))

describe('CalibrationService', () => {
  let service: CalibrationService
  
  beforeEach(() => {
    // Create and set a fresh Pinia instance for each test
    setActivePinia(createPinia())
    
    service = new CalibrationService()
    // Reset mocks
    vi.clearAllMocks()
  })

  describe('computeHomography', () => {
    it('should return null if less than 4 markers are provided', () => {
      // @ts-ignore - Private method access for testing
      const result = service.computeHomography([])
      expect(result).toBeNull()
    })

    it('should compute homography matrix from 4 markers', () => {
      // Create mock marker data
      const mockMarkers = [
        {
          id: 0,
          corners: [[0, 0], [10, 0], [10, 10], [0, 10]] // top-left
        },
        {
          id: 1,
          corners: [[90, 0], [100, 0], [100, 10], [90, 10]] // top-right
        },
        {
          id: 2,
          corners: [[0, 90], [10, 90], [10, 100], [0, 100]] // bottom-left
        },
        {
          id: 3,
          corners: [[90, 90], [100, 90], [100, 100], [90, 100]] // bottom-right
        }
      ]

      // @ts-ignore - Private method access for testing
      const result = service.computeHomography(mockMarkers)
      
      // Basic validation - just ensure we get a 9-element array (3x3 matrix)
      expect(result).not.toBeNull()
      expect(Array.isArray(result)).toBe(true)
      expect(result?.length).toBe(9)
    })
  })

  describe('calculateRackCorners', () => {
    it('should return null if less than 4 markers are provided', () => {
      // @ts-ignore - Private method access for testing
      const result = service.calculateRackCorners([])
      expect(result).toBeNull()
    })

    it('should calculate corners of the rack based on marker positions', () => {
      // Create mock marker data with 4 markers at the corners of a square
      const mockMarkers = [
        {
          id: 0,
          corners: [[0, 0], [10, 0], [10, 10], [0, 10]] // top-left
        },
        {
          id: 1,
          corners: [[90, 0], [100, 0], [100, 10], [90, 10]] // top-right
        },
        {
          id: 2,
          corners: [[0, 90], [10, 90], [10, 100], [0, 100]] // bottom-left
        },
        {
          id: 3,
          corners: [[90, 90], [100, 90], [100, 100], [90, 100]] // bottom-right
        }
      ]

      // @ts-ignore - Private method access for testing
      const result = service.calculateRackCorners(mockMarkers)
      
      // Validate
      expect(result).not.toBeNull()
      expect(result?.length).toBe(4)
      
      // Should have x,y properties for each corner
      result?.forEach((corner: { x: number; y: number }) => {
        expect(corner).toHaveProperty('x')
        expect(corner).toHaveProperty('y')
      })
    })
  })

  describe('startCalibration', () => {
    it('should initialize video element and return preview object', () => {
      // Mock video element
      const mockVideo = document.createElement('video')
      
      // Start calibration
      const preview = service.startCalibration(mockVideo)
      
      // Verify preview is returned with initial state
      expect(preview.value).toEqual({
        markersVisible: 0,
        homographyReady: false,
        homography: null,
        rackCorners: null
      })
    })
  })

  describe('saveRack', () => {
    it('should throw error if calibration is not ready', async () => {
      // Mock canvas
      const canvas = document.createElement('canvas')
      
      // Set preview state to not ready
      service.preview.value.homographyReady = false
      
      // Expect saveRack to throw
      await expect(service.saveRack('Test Rack', canvas))
        .rejects.toThrow('Calibration not ready')
    })
  })
})
