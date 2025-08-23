import type { Assignment } from '@shared/schemas/core';

/**
 * Assessment Categorization Helper
 * Location: frontend/src/lib/utils/assessment-categorization.ts
 *
 * Determines whether an assessment should be categorized as a "Quiz" or "Assignment"
 * using the sophisticated classification schema instead of the simple type field.
 */

/**
 * Determines if an assessment should be categorized as a Quiz
 *
 * Considers as "Quiz" when:
 * - Platform is Google Forms (ALL Google Forms are quizzes, including coding exercises)
 * - Content is multiple choice questions (in non-Google Form platforms)
 * - Content is short answer with standard quiz grading (in non-Google Form platforms)
 * - Uses auto-grading approach (in non-Google Form platforms)
 *
 * @param assignment - The assignment to categorize
 * @returns true if should be categorized as a quiz, false for assignment
 */
export function isQuiz(assignment: Assignment): boolean {
	const c = assignment.classification;

	// Fallback to old logic if classification is not available
	if (!c) {
		return assignment.type === 'quiz';
	}

	// Check classification criteria for quiz categorization
	return (
		c.platform === 'google_form' ||
		c.contentType === 'choice' ||
		(c.contentType === 'short_answer' && c.gradingApproach === 'standard_quiz') ||
		c.gradingApproach === 'auto_grade'
	);
}

/**
 * Determines if an assessment should be categorized as an Assignment
 *
 * @param assignment - The assignment to categorize
 * @returns true if should be categorized as an assignment, false for quiz
 */
export function isAssignment(assignment: Assignment): boolean {
	return !isQuiz(assignment);
}

/**
 * Gets the display category name for an assessment
 *
 * @param assignment - The assignment to categorize
 * @returns 'Quiz' or 'Assignment'
 */
export function getAssessmentCategory(assignment: Assignment): 'Quiz' | 'Assignment' {
	return isQuiz(assignment) ? 'Quiz' : 'Assignment';
}

/**
 * Groups assignments into quizzes and assignments using proper classification
 *
 * @param assignments - Array of assignments to group
 * @returns Object with quizzes and assignments arrays
 */
export function groupAssignments(assignments: Assignment[]): {
	quizzes: Assignment[];
	assignments: Assignment[];
} {
	const quizzes = assignments.filter(isQuiz);
	const regularAssignments = assignments.filter(isAssignment);

	return {
		quizzes,
		assignments: regularAssignments
	};
}
