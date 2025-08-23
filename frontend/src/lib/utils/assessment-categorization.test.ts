import { describe, it, expect } from 'vitest';
import { isQuiz, isAssignment, getAssessmentCategory, groupAssignments } from './assessment-categorization';
import type { Assignment } from '@shared/schemas/core';

describe('Assessment Categorization', () => {
	// Mock assignments with different classification types
	const mockAssignments: Assignment[] = [
		{
			id: '1',
			classroomId: 'classroom1',
			title: 'Multiple Choice Quiz',
			type: 'quiz',
			classification: {
				platform: 'google_form',
				contentType: 'choice',
				gradingApproach: 'auto_grade'
			},
			maxScore: 100,
			createdAt: new Date(),
			updatedAt: new Date()
		} as Assignment,
		{
			id: '1a',
			classroomId: 'classroom1',
			title: 'Coding Google Form Quiz',
			type: 'coding',
			classification: {
				platform: 'google_form',
				contentType: 'code',
				gradingApproach: 'generous_code'
			},
			maxScore: 100,
			createdAt: new Date(),
			updatedAt: new Date()
		} as Assignment,
		{
			id: '2',
			classroomId: 'classroom1',
			title: 'Coding Assignment',
			type: 'coding',
			classification: {
				platform: 'google_docs',
				contentType: 'code',
				gradingApproach: 'generous_code'
			},
			maxScore: 100,
			createdAt: new Date(),
			updatedAt: new Date()
		} as Assignment,
		{
			id: '3',
			classroomId: 'classroom1',
			title: 'Essay Assignment',
			type: 'written',
			classification: {
				platform: 'google_docs',
				contentType: 'text',
				gradingApproach: 'essay_rubric'
			},
			maxScore: 100,
			createdAt: new Date(),
			updatedAt: new Date()
		} as Assignment,
		{
			id: '4',
			classroomId: 'classroom1',
			title: 'Short Answer Quiz',
			type: 'quiz',
			classification: {
				platform: 'google_form',
				contentType: 'short_answer',
				gradingApproach: 'standard_quiz'
			},
			maxScore: 50,
			createdAt: new Date(),
			updatedAt: new Date()
		} as Assignment,
		{
			id: '5',
			classroomId: 'classroom1',
			title: 'Legacy Quiz (no classification)',
			type: 'quiz',
			maxScore: 100,
			createdAt: new Date(),
			updatedAt: new Date()
		} as Assignment,
		{
			id: '6',
			classroomId: 'classroom1',
			title: 'Legacy Assignment (no classification)',
			type: 'written',
			maxScore: 100,
			createdAt: new Date(),
			updatedAt: new Date()
		} as Assignment
	];

	describe('isQuiz', () => {
		it('should identify Google Form assignments as quizzes', () => {
			expect(isQuiz(mockAssignments[0])).toBe(true); // Google Form with choice
		});

		it('should identify coding Google Forms as quizzes', () => {
			expect(isQuiz(mockAssignments[1])).toBe(true); // Coding Google Form
		});

		it('should identify choice content as quizzes', () => {
			expect(isQuiz(mockAssignments[0])).toBe(true); // Multiple choice
		});

		it('should identify short answer with standard quiz grading as quizzes', () => {
			expect(isQuiz(mockAssignments[4])).toBe(true); // Short answer quiz (index shifted)
		});

		it('should not identify non-Google Form coding assignments as quizzes', () => {
			expect(isQuiz(mockAssignments[2])).toBe(false); // Coding assignment (Google Docs)
		});

		it('should not identify essay assignments as quizzes', () => {
			expect(isQuiz(mockAssignments[3])).toBe(false); // Essay assignment
		});

		it('should fallback to type field when no classification', () => {
			expect(isQuiz(mockAssignments[5])).toBe(true); // Legacy quiz
			expect(isQuiz(mockAssignments[6])).toBe(false); // Legacy assignment
		});
	});

	describe('isAssignment', () => {
		it('should return opposite of isQuiz', () => {
			mockAssignments.forEach(assignment => {
				expect(isAssignment(assignment)).toBe(!isQuiz(assignment));
			});
		});
	});

	describe('getAssessmentCategory', () => {
		it('should return "Quiz" for quiz assignments', () => {
			expect(getAssessmentCategory(mockAssignments[0])).toBe('Quiz'); // Google Form choice
			expect(getAssessmentCategory(mockAssignments[1])).toBe('Quiz'); // Google Form coding
			expect(getAssessmentCategory(mockAssignments[4])).toBe('Quiz'); // Short answer quiz
			expect(getAssessmentCategory(mockAssignments[5])).toBe('Quiz'); // Legacy quiz
		});

		it('should return "Assignment" for non-quiz assignments', () => {
			expect(getAssessmentCategory(mockAssignments[2])).toBe('Assignment'); // Coding (non-Google Form)
			expect(getAssessmentCategory(mockAssignments[3])).toBe('Assignment'); // Essay assignment
			expect(getAssessmentCategory(mockAssignments[6])).toBe('Assignment'); // Legacy assignment
		});
	});

	describe('groupAssignments', () => {
		it('should group assignments correctly', () => {
			const grouped = groupAssignments(mockAssignments);
			
			expect(grouped.quizzes).toHaveLength(4); // Now includes coding Google Form
			expect(grouped.assignments).toHaveLength(3);
			
			// Check quiz IDs (includes Google Form coding)
			expect(grouped.quizzes.map(q => q.id)).toEqual(['1', '1a', '4', '5']);
			
			// Check assignment IDs (only non-Google Form assignments)
			expect(grouped.assignments.map(a => a.id)).toEqual(['2', '3', '6']);
		});

		it('should handle empty array', () => {
			const grouped = groupAssignments([]);
			expect(grouped.quizzes).toHaveLength(0);
			expect(grouped.assignments).toHaveLength(0);
		});
	});
});