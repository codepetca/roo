/**
 * Component tests for ClassroomSnapshotUploader with Svelte 5 runes
 * Location: frontend/src/lib/components/snapshot/ClassroomSnapshotUploader.svelte.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@vitest/browser/context';
import { 
  mockData, 
  createMockFile, 
  createInvalidMockFile, 
  createMockDragEvent,
  createMockClassroomSnapshot,
  resetAllMocks 
} from '../../test-utils/mock-data';
import ClassroomSnapshotUploader from './ClassroomSnapshotUploader.svelte';
import type { ClassroomSnapshot } from '@shared/schemas/classroom-snapshot';

// Mock the snapshot store
const mockSnapshotStore = {
  importFile: null as File | null,
  currentSnapshot: null as ClassroomSnapshot | null,
  validating: false,
  error: null as string | null,
  uploadProgress: 0,
  setImportFile: vi.fn(),
  validateImportFile: vi.fn(),
  clearImport: vi.fn(),
  clearError: vi.fn()
};

vi.mock('$lib/stores', () => ({
  snapshotStore: mockSnapshotStore
}));

// Mock UI components
vi.mock('$lib/components/ui', () => ({
  Card: vi.fn(({ children }: { children: any }) => children()),
  Button: vi.fn(({ children, onclick, variant, size }: any) => {
    const handleClick = (e: Event) => {
      e.preventDefault();
      onclick?.();
    };
    return `<button data-variant="${variant}" data-size="${size}" onclick="${handleClick}">${children()}</button>`;
  }),
  Badge: vi.fn(({ children }: { children: any }) => children())
}));

describe('ClassroomSnapshotUploader Component', () => {
  let mockOnValidated: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetAllMocks();
    mockOnValidated = vi.fn();
    
    // Reset store state
    mockSnapshotStore.importFile = null;
    mockSnapshotStore.currentSnapshot = null;
    mockSnapshotStore.validating = false;
    mockSnapshotStore.error = null;
    mockSnapshotStore.uploadProgress = 0;
    mockSnapshotStore.setImportFile.mockReset();
    mockSnapshotStore.validateImportFile.mockReset();
    mockSnapshotStore.clearImport.mockReset();
    mockSnapshotStore.clearError.mockReset();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with default upload state', async () => {
      render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });

      expect(screen.getByText('Upload Classroom Snapshot')).toBeInTheDocument();
      expect(screen.getByText('Select a JSON file containing your classroom snapshot data')).toBeInTheDocument();
      expect(screen.getByText('Upload JSON Snapshot')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop or click to select a JSON file')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
    });

    it('should render file requirements section', async () => {
      render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });

      expect(screen.getByText('File Requirements')).toBeInTheDocument();
      expect(screen.getByText('JSON format (.json file extension)')).toBeInTheDocument();
      expect(screen.getByText('Valid classroom snapshot schema structure')).toBeInTheDocument();
      expect(screen.getByText('Maximum file size: 10MB')).toBeInTheDocument();
      expect(screen.getByText('Contains teacher, classrooms, assignments, and student data')).toBeInTheDocument();
    });

    it('should render hidden file input with correct attributes', async () => {
      render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.json,application/json');
      expect(fileInput).toHaveClass('hidden');
    });
  });

  describe('File Upload States', () => {
    it('should show validating state when validating is true', async () => {
      mockSnapshotStore.validating = true;
      mockSnapshotStore.importFile = createMockFile();

      render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });

      expect(screen.getByText('Validating File...')).toBeInTheDocument();
      expect(screen.getByText('Checking format and structure')).toBeInTheDocument();
      
      // Check for spinner animation
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('border-4', 'border-blue-600', 'border-r-transparent');
    });

    it('should show successful validation state', async () => {
      const testFile = createMockFile();
      const testSnapshot = createMockClassroomSnapshot();
      
      mockSnapshotStore.importFile = testFile;
      mockSnapshotStore.currentSnapshot = testSnapshot;
      mockSnapshotStore.validating = false;
      mockSnapshotStore.error = null;

      render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });

      expect(screen.getByText('File Validated Successfully')).toBeInTheDocument();
      expect(screen.getByText(testFile.name)).toBeInTheDocument();
      expect(screen.getByText(`${Math.round(testFile.size / 1024)} KB`)).toBeInTheDocument();
      expect(screen.getByText(`${testSnapshot.classrooms.length} classrooms`)).toBeInTheDocument();
      expect(screen.getByText(`${testSnapshot.globalStats.totalStudents} students`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /choose different file/i })).toBeInTheDocument();
    });

    it('should show validation error state', async () => {
      const testFile = createMockFile();
      const errorMessage = 'Invalid JSON file format';
      
      mockSnapshotStore.importFile = testFile;
      mockSnapshotStore.currentSnapshot = null;
      mockSnapshotStore.validating = false;
      mockSnapshotStore.error = errorMessage;

      render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });

      expect(screen.getByText('Validation Failed')).toBeInTheDocument();
      expect(screen.getByText(testFile.name)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('should handle drag enter events', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondragenter]') as HTMLElement;
      expect(dropZone).toBeInTheDocument();

      // Create drag event
      const dragEvent = new DragEvent('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(dragEvent, 'preventDefault', { value: vi.fn() });

      await fireEvent(dropZone, dragEvent);

      // Should show dragging state
      expect(screen.getByText('Drop your file here')).toBeInTheDocument();
      expect(screen.getByText('Release to upload')).toBeInTheDocument();
      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50');
    });

    it('should handle drag leave events', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondragenter]') as HTMLElement;
      
      // Enter drag state first
      const dragEnterEvent = new DragEvent('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(dragEnterEvent, 'preventDefault', { value: vi.fn() });
      await fireEvent(dropZone, dragEnterEvent);

      // Then leave
      const dragLeaveEvent = new DragEvent('dragleave', { bubbles: true, cancelable: true });
      Object.defineProperty(dragLeaveEvent, 'preventDefault', { value: vi.fn() });
      await fireEvent(dropZone, dragLeaveEvent);

      // Should return to normal state
      expect(screen.getByText('Upload JSON Snapshot')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop or click to select a JSON file')).toBeInTheDocument();
    });

    it('should handle drag over events', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondragover]') as HTMLElement;
      const dragOverEvent = new DragEvent('dragover', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.fn();
      Object.defineProperty(dragOverEvent, 'preventDefault', { value: preventDefaultSpy });

      await fireEvent(dropZone, dragOverEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should handle file drop with valid JSON file', async () => {
      const testFile = createMockFile();
      mockSnapshotStore.validateImportFile.mockResolvedValue(true);

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondrop]') as HTMLElement;
      const dropEvent = createMockDragEvent([testFile]);

      await fireEvent(dropZone, dropEvent);

      expect(mockSnapshotStore.setImportFile).toHaveBeenCalledWith(testFile);
      expect(mockSnapshotStore.validateImportFile).toHaveBeenCalled();
      
      // Wait for validation to complete
      await waitFor(() => {
        expect(mockOnValidated).toHaveBeenCalled();
      });
    });

    it('should handle file drop with multiple files (take first)', async () => {
      const testFiles = [createMockFile(), createMockFile()];
      mockSnapshotStore.validateImportFile.mockResolvedValue(true);

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondrop]') as HTMLElement;
      const dropEvent = createMockDragEvent(testFiles);

      await fireEvent(dropZone, dropEvent);

      expect(mockSnapshotStore.setImportFile).toHaveBeenCalledWith(testFiles[0]);
    });

    it('should ignore non-JSON files on drop', async () => {
      const textFile = new File(['text content'], 'document.txt', { type: 'text/plain' });

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondrop]') as HTMLElement;
      const dropEvent = createMockDragEvent([textFile]);

      await fireEvent(dropZone, dropEvent);

      expect(mockSnapshotStore.clearError).toHaveBeenCalled();
      expect(mockSnapshotStore.setImportFile).not.toHaveBeenCalled();
      expect(mockSnapshotStore.validateImportFile).not.toHaveBeenCalled();
    });
  });

  describe('File Input Functionality', () => {
    it('should open file dialog when Select File button is clicked', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      // Mock the file input click method
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});

      const selectButton = screen.getByRole('button', { name: /select file/i });
      await fireEvent.click(selectButton);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('should handle file input change with valid file', async () => {
      const testFile = createMockFile();
      mockSnapshotStore.validateImportFile.mockResolvedValue(true);

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a change event with the file
      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        writable: false,
      });

      await fireEvent.change(fileInput);

      expect(mockSnapshotStore.setImportFile).toHaveBeenCalledWith(testFile);
      expect(mockSnapshotStore.validateImportFile).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(mockOnValidated).toHaveBeenCalled();
      });
    });

    it('should handle file input change with no file selected', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a change event with no files
      Object.defineProperty(fileInput, 'files', {
        value: [],
        writable: false,
      });

      await fireEvent.change(fileInput);

      expect(mockSnapshotStore.setImportFile).not.toHaveBeenCalled();
      expect(mockSnapshotStore.validateImportFile).not.toHaveBeenCalled();
      expect(mockOnValidated).not.toHaveBeenCalled();
    });
  });

  describe('File Validation', () => {
    it('should call onValidated when file validation succeeds', async () => {
      const testFile = createMockFile();
      mockSnapshotStore.validateImportFile.mockResolvedValue(true);

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondrop]') as HTMLElement;
      const dropEvent = createMockDragEvent([testFile]);

      await fireEvent(dropZone, dropEvent);

      await waitFor(() => {
        expect(mockOnValidated).toHaveBeenCalled();
      });
    });

    it('should not call onValidated when file validation fails', async () => {
      const testFile = createMockFile();
      mockSnapshotStore.validateImportFile.mockResolvedValue(false);

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondrop]') as HTMLElement;
      const dropEvent = createMockDragEvent([testFile]);

      await fireEvent(dropZone, dropEvent);

      await waitFor(() => {
        expect(mockSnapshotStore.validateImportFile).toHaveBeenCalled();
      });

      expect(mockOnValidated).not.toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      const testFile = createMockFile();
      mockSnapshotStore.validateImportFile.mockRejectedValue(new Error('Validation failed'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondrop]') as HTMLElement;
      const dropEvent = createMockDragEvent([testFile]);

      await fireEvent(dropZone, dropEvent);

      await waitFor(() => {
        expect(mockSnapshotStore.validateImportFile).toHaveBeenCalled();
      });

      expect(mockOnValidated).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('File Management', () => {
    it('should clear file when Clear File button is clicked', async () => {
      const testFile = createMockFile();
      mockSnapshotStore.importFile = testFile;
      mockSnapshotStore.currentSnapshot = createMockClassroomSnapshot();

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const clearButton = screen.getByRole('button', { name: /choose different file/i });
      await fireEvent.click(clearButton);

      expect(mockSnapshotStore.clearImport).toHaveBeenCalled();
      
      // Check that file input value is cleared
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.value).toBe('');
    });

    it('should clear file when Try Again button is clicked after error', async () => {
      const testFile = createMockFile();
      mockSnapshotStore.importFile = testFile;
      mockSnapshotStore.error = 'Validation failed';

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await fireEvent.click(tryAgainButton);

      expect(mockSnapshotStore.clearImport).toHaveBeenCalled();
      
      // Check that file input value is cleared
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.value).toBe('');
    });
  });

  describe('Visual States', () => {
    it('should apply correct CSS classes for default state', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('.rounded-lg.border-2.border-dashed');
      expect(dropZone).toHaveClass('border-gray-300', 'bg-gray-50');
    });

    it('should apply correct CSS classes for dragging state', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondragenter]') as HTMLElement;
      
      const dragEvent = new DragEvent('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(dragEvent, 'preventDefault', { value: vi.fn() });
      await fireEvent(dropZone, dragEvent);

      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50');
    });

    it('should apply correct CSS classes for successful upload state', async () => {
      mockSnapshotStore.importFile = createMockFile();
      mockSnapshotStore.currentSnapshot = createMockClassroomSnapshot();

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('.rounded-lg.border-2.border-dashed');
      expect(dropZone).toHaveClass('border-green-300', 'bg-green-50');
    });

    it('should show correct file size in KB', async () => {
      const testFile = createMockFile(JSON.stringify(mockData.snapshot), 'test.json');
      mockSnapshotStore.importFile = testFile;
      mockSnapshotStore.currentSnapshot = mockData.snapshot;

      render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const expectedSizeKB = Math.round(testFile.size / 1024);
      expect(screen.getByText(`${expectedSizeKB} KB`)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle component without onValidated callback', async () => {
      const testFile = createMockFile();
      mockSnapshotStore.validateImportFile.mockResolvedValue(true);

      const { container } = render(ClassroomSnapshotUploader, { props: {} });
      
      const dropZone = container.querySelector('[ondrop]') as HTMLElement;
      const dropEvent = createMockDragEvent([testFile]);

      await fireEvent(dropZone, dropEvent);

      expect(mockSnapshotStore.setImportFile).toHaveBeenCalledWith(testFile);
      expect(mockSnapshotStore.validateImportFile).toHaveBeenCalled();
      
      // Should not throw error when onValidated is undefined
      await waitFor(() => {
        expect(mockSnapshotStore.validateImportFile).toHaveBeenCalled();
      });
    });

    it('should handle empty file drop', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondrop]') as HTMLElement;
      const dropEvent = createMockDragEvent([]);

      await fireEvent(dropZone, dropEvent);

      expect(mockSnapshotStore.setImportFile).not.toHaveBeenCalled();
      expect(mockSnapshotStore.validateImportFile).not.toHaveBeenCalled();
    });

    it('should handle file with .json extension but wrong MIME type', async () => {
      const testFile = new File(['{}'], 'test.json', { type: 'text/plain' });
      mockSnapshotStore.validateImportFile.mockResolvedValue(true);

      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondrop]') as HTMLElement;
      const dropEvent = createMockDragEvent([testFile]);

      await fireEvent(dropZone, dropEvent);

      // Should still process files with .json extension even with wrong MIME type
      expect(mockSnapshotStore.setImportFile).toHaveBeenCalledWith(testFile);
      expect(mockSnapshotStore.validateImportFile).toHaveBeenCalled();
    });

    it('should handle drag counter correctly with multiple drag enter/leave events', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const dropZone = container.querySelector('[ondragenter]') as HTMLElement;
      
      // Multiple drag enters
      const dragEnterEvent = new DragEvent('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(dragEnterEvent, 'preventDefault', { value: vi.fn() });
      
      await fireEvent(dropZone, dragEnterEvent);
      await fireEvent(dropZone, dragEnterEvent);
      
      expect(screen.getByText('Drop your file here')).toBeInTheDocument();
      
      // One drag leave - should still be dragging
      const dragLeaveEvent = new DragEvent('dragleave', { bubbles: true, cancelable: true });
      Object.defineProperty(dragLeaveEvent, 'preventDefault', { value: vi.fn() });
      await fireEvent(dropZone, dragLeaveEvent);
      
      expect(screen.getByText('Drop your file here')).toBeInTheDocument();
      
      // Second drag leave - should not be dragging anymore
      await fireEvent(dropZone, dragLeaveEvent);
      
      expect(screen.getByText('Upload JSON Snapshot')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const { container } = render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', '.json,application/json');
      
      // Check for SVG aria-hidden attributes
      const iconSvg = container.querySelector('svg[aria-hidden]');
      expect(iconSvg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should support keyboard navigation', async () => {
      render(ClassroomSnapshotUploader, { props: { onValidated: mockOnValidated } });
      
      const selectButton = screen.getByRole('button', { name: /select file/i });
      selectButton.focus();
      
      expect(document.activeElement).toBe(selectButton);
    });
  });
});