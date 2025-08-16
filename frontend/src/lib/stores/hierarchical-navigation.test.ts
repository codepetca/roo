/**
 * Tests for hierarchical navigation enhancements to data store
 * Location: frontend/src/lib/stores/hierarchical-navigation.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { dataStore } from './data-store.svelte';
import type { Classroom, Assignment } from '@shared/schemas/core';

describe('Hierarchical Navigation Data Store', () => {
	let mockClassrooms: Classroom[];
	let mockAssignments: Assignment[];

	beforeEach(() => {
		// Create test data that follows the schema structure
		mockClassrooms = [
			{
				id: 'classroom-1',
				teacherId: 'test-teacher',
				name: 'Computer Science P1',
				section: '01',
				studentCount: 25,
				assignmentCount: 3,
				activeSubmissions: 10,
				ungradedSubmissions: 2,
				courseState: 'ACTIVE',
				studentIds: ['student-1', 'student-2'],
				assignmentIds: ['assignment-1', 'assignment-2'],
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'classroom-2',
				teacherId: 'test-teacher',
				name: 'Computer Science P2',
				section: '02',
				studentCount: 20,
				assignmentCount: 2,
				activeSubmissions: 8,
				ungradedSubmissions: 1,
				courseState: 'ACTIVE',
				studentIds: ['student-3', 'student-4'],
				assignmentIds: ['assignment-3'],
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		mockAssignments = [
			{
				id: 'assignment-1',
				classroomId: 'classroom-1',
				title: 'Karel the Dog - Basics',
				name: 'Karel the Dog - Basics',
				description: 'Introduction to programming',
				maxScore: 100,
				type: 'coding',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'assignment-2',
				classroomId: 'classroom-1',
				title: 'Programming Quiz 1',
				name: 'Programming Quiz 1',
				description: 'Basic concepts quiz',
				maxScore: 50,
				type: 'quiz',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'assignment-3',
				classroomId: 'classroom-2',
				title: 'Advanced Karel',
				name: 'Advanced Karel',
				description: 'Advanced programming concepts',
				maxScore: 150,
				type: 'coding',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];

		// Reset the data store state
		dataStore.classrooms = mockClassrooms;
		dataStore.assignments = mockAssignments;
		dataStore.selectedClassroomId = null;
		dataStore.selectedAssignmentId = null;
	});

	describe('Assignment Grouping by Classroom', () => {
		it('should group assignments by classroom correctly', () => {
			// Access the computed value function and call it
			const grouped = typeof dataStore.assignmentsByClassroom === 'function' 
				? dataStore.assignmentsByClassroom() 
				: dataStore.assignmentsByClassroom;
			
			expect(grouped.get('classroom-1')).toHaveLength(2);
			expect(grouped.get('classroom-2')).toHaveLength(1);
			
			// Check that assignments are grouped correctly by classroom
			const classroom1Assignments = grouped.get('classroom-1');
			const assignmentTitles = classroom1Assignments?.map(a => a.title) || [];
			expect(assignmentTitles).toContain('Programming Quiz 1');
			expect(assignmentTitles).toContain('Karel the Dog - Basics');
		});

		it('should handle classrooms with no assignments', () => {
			// Add a classroom with no assignments
			const emptyClassroom: Classroom = {
				id: 'classroom-empty',
				teacherId: 'test-teacher',
				name: 'Empty Classroom',
				section: '03',
				studentCount: 0,
				assignmentCount: 0,
				activeSubmissions: 0,
				ungradedSubmissions: 0,
				courseState: 'ACTIVE',
				studentIds: [],
				assignmentIds: [],
				createdAt: new Date(),
				updatedAt: new Date()
			};
			
			dataStore.classrooms = [...mockClassrooms, emptyClassroom];
			
			const grouped = typeof dataStore.assignmentsByClassroom === 'function' 
				? dataStore.assignmentsByClassroom() 
				: dataStore.assignmentsByClassroom;
			expect(grouped.get('classroom-empty')).toEqual([]);
		});
	});

	describe('Hierarchical Selection Methods', () => {
		it('should select classroom and clear assignment selection', () => {
			// Set initial state with assignment selected
			dataStore.selectedAssignmentId = 'assignment-1';
			
			// Select classroom
			dataStore.selectClassroom('classroom-2');
			
			expect(dataStore.selectedClassroomId).toBe('classroom-2');
			expect(dataStore.selectedAssignmentId).toBeNull();
		});

		it('should auto-select classroom when selecting assignment', () => {
			// Select assignment from different classroom
			dataStore.selectAssignment('assignment-3');
			
			expect(dataStore.selectedClassroomId).toBe('classroom-2');
			expect(dataStore.selectedAssignmentId).toBe('assignment-3');
		});

		it('should handle assignment selection in specific classroom', () => {
			dataStore.selectAssignmentInClassroom('assignment-1', 'classroom-1');
			
			expect(dataStore.selectedClassroomId).toBe('classroom-1');
			expect(dataStore.selectedAssignmentId).toBe('assignment-1');
		});

		it('should clear assignment selection when passing empty string', () => {
			dataStore.selectedAssignmentId = 'assignment-1';
			
			dataStore.selectAssignment('');
			
			expect(dataStore.selectedAssignmentId).toBeNull();
		});

		it('should clear all selections', () => {
			dataStore.selectedClassroomId = 'classroom-1';
			dataStore.selectedAssignmentId = 'assignment-1';
			
			dataStore.clearSelection();
			
			expect(dataStore.selectedClassroomId).toBeNull();
			expect(dataStore.selectedAssignmentId).toBeNull();
		});
	});

	describe('Computed Selected Data', () => {
		it('should return correct selected classroom object', () => {
			dataStore.selectClassroom('classroom-1');
			
			const selectedClassroom = dataStore.selectedClassroom;
			expect(selectedClassroom?.id).toBe('classroom-1');
			expect(selectedClassroom?.name).toBe('Computer Science P1');
		});

		it('should return correct selected assignment object', () => {
			dataStore.selectAssignment('assignment-2');
			
			const selectedAssignment = dataStore.selectedAssignment;
			expect(selectedAssignment?.id).toBe('assignment-2');
			expect(selectedAssignment?.title).toBe('Programming Quiz 1');
		});

		it('should return assignments for selected classroom', () => {
			dataStore.selectClassroom('classroom-1');
			
			const classroomAssignments = typeof dataStore.selectedClassroomAssignments === 'function' 
				? dataStore.selectedClassroomAssignments() 
				: dataStore.selectedClassroomAssignments;
			expect(classroomAssignments).toHaveLength(2);
			expect(classroomAssignments.every(a => a.classroomId === 'classroom-1')).toBe(true);
		});

		it('should return empty array when no classroom selected', () => {
			const classroomAssignments = typeof dataStore.selectedClassroomAssignments === 'function' 
				? dataStore.selectedClassroomAssignments() 
				: dataStore.selectedClassroomAssignments;
			expect(classroomAssignments).toEqual([]);
		});
	});

	describe('Error Handling', () => {
		it('should handle selecting non-existent classroom gracefully', () => {
			dataStore.selectClassroom('non-existent');
			
			// Should not crash and should not change selection
			expect(dataStore.selectedClassroomId).toBeNull();
		});

		it('should handle selecting non-existent assignment gracefully', () => {
			dataStore.selectAssignment('non-existent');
			
			// Should not crash and should not change selection
			expect(dataStore.selectedAssignmentId).toBeNull();
		});
	});

	describe('Utility Methods', () => {
		it('should get correct assignment display title', () => {
			const assignment = mockAssignments[0];
			const title = dataStore.getAssignmentDisplayTitle(assignment);
			expect(title).toBe('Karel the Dog - Basics');
		});

		it('should handle assignment without title field', () => {
			const assignment = { ...mockAssignments[0], title: undefined };
			const title = dataStore.getAssignmentDisplayTitle(assignment);
			expect(title).toBe('Karel the Dog - Basics'); // Falls back to name
		});

		it('should format dates correctly', () => {
			const testDate = new Date('2024-01-15');
			const formatted = dataStore.formatDate(testDate);
			expect(formatted).toMatch(/Jan/); // Should contain month abbreviation
		});

		it('should get correct assignment type labels', () => {
			expect(dataStore.getAssignmentTypeLabel(mockAssignments[0])).toBe('Coding');
			expect(dataStore.getAssignmentTypeLabel(mockAssignments[1])).toBe('Quiz');
		});

		it('should identify auto-gradable assignments', () => {
			expect(dataStore.isAssignmentAutoGradable(mockAssignments[0])).toBe(false); // coding
			expect(dataStore.isAssignmentAutoGradable(mockAssignments[1])).toBe(true);  // quiz
		});
	});
});