/**
 * Firestore Real-time Service
 * Manages real-time listeners and data synchronization
 * Location: frontend/src/lib/services/firestore-realtime.ts
 */

import {
	collection,
	doc,
	onSnapshot,
	query,
	where,
	orderBy,
	type Unsubscribe,
	type QueryConstraint,
	type DocumentChange,
	type QuerySnapshot
} from 'firebase/firestore';
import { firestore } from '$lib/firebase';
import type { ClassroomCollection } from '$lib/models/classroom.collection';
import type { AssignmentCollection } from '$lib/models/assignment.collection';
import { ClassroomModel } from '$lib/models/classroom.model';
import { AssignmentModel } from '$lib/models/assignment.model';

/**
 * Service for managing Firestore real-time listeners
 */
export class FirestoreRealtimeService {
	private unsubscribers: Map<string, Unsubscribe> = new Map();
	private isListening = false;

	/**
	 * Start listening to classrooms for a teacher
	 */
	subscribeToClassrooms(teacherEmail: string, classroomCollection: ClassroomCollection): void {
		// Unsubscribe from existing listener if any
		this.unsubscribe('classrooms');

		console.log('🔊 Starting real-time listener for classrooms', { teacherEmail });

		const q = query(
			collection(firestore, 'classrooms'),
			where('teacherId', '==', teacherEmail),
			orderBy('name')
		);

		const unsubscribe = onSnapshot(
			q,
			(snapshot: QuerySnapshot) => {
				console.log('📨 Classroom snapshot received', {
					size: snapshot.size,
					changes: snapshot.docChanges().length
				});

				snapshot.docChanges().forEach((change: DocumentChange) => {
					const data = { id: change.doc.id, ...change.doc.data() };

					console.log(`🔄 Classroom ${change.type}:`, {
						id: change.doc.id,
						type: change.type
					});

					classroomCollection.handleRealtimeChange(
						{
							type: change.type,
							id: change.doc.id,
							data: change.doc.data()
						},
						(data) => ClassroomModel.fromFirestore(data)
					);
				});
			},
			(error) => {
				console.error('❌ Classroom listener error:', error);
				classroomCollection.setError('Failed to sync classrooms');
			}
		);

		this.unsubscribers.set('classrooms', unsubscribe);
		this.isListening = true;
	}

	/**
	 * Start listening to assignments for specific classrooms
	 */
	subscribeToAssignments(classroomIds: string[], assignmentCollection: AssignmentCollection): void {
		// Unsubscribe from existing listener if any
		this.unsubscribe('assignments');

		if (classroomIds.length === 0) {
			console.log('⚠️ No classrooms to subscribe to for assignments');
			return;
		}

		console.log('🔊 Starting real-time listener for assignments', {
			classroomCount: classroomIds.length
		});

		// Firestore 'in' query supports max 10 items
		// For more classrooms, we'd need multiple queries
		const classroomBatch = classroomIds.slice(0, 10);

		const q = query(
			collection(firestore, 'assignments'),
			where('classroomId', 'in', classroomBatch),
			orderBy('createdAt', 'desc')
		);

		const unsubscribe = onSnapshot(
			q,
			(snapshot: QuerySnapshot) => {
				console.log('📨 Assignment snapshot received', {
					size: snapshot.size,
					changes: snapshot.docChanges().length
				});

				snapshot.docChanges().forEach((change: DocumentChange) => {
					const data = { id: change.doc.id, ...change.doc.data() };

					console.log(`🔄 Assignment ${change.type}:`, {
						id: change.doc.id,
						type: change.type,
						title: data.title || data.name
					});

					assignmentCollection.handleRealtimeChange(
						{
							type: change.type,
							id: change.doc.id,
							data: change.doc.data()
						},
						(data) => AssignmentModel.fromFirestore(data)
					);
				});
			},
			(error) => {
				console.error('❌ Assignment listener error:', error);
				assignmentCollection.setError('Failed to sync assignments');
			}
		);

		this.unsubscribers.set('assignments', unsubscribe);
	}

	/**
	 * Subscribe to a specific document
	 */
	subscribeToDocument<T>(
		collectionName: string,
		documentId: string,
		onUpdate: (data: T | null) => void
	): void {
		const key = `${collectionName}/${documentId}`;
		this.unsubscribe(key);

		console.log('🔊 Starting document listener', { collectionName, documentId });

		const docRef = doc(firestore, collectionName, documentId);

		const unsubscribe = onSnapshot(
			docRef,
			(snapshot) => {
				if (snapshot.exists()) {
					const data = { id: snapshot.id, ...snapshot.data() } as T;
					console.log('📨 Document update:', { id: snapshot.id });
					onUpdate(data);
				} else {
					console.log('⚠️ Document does not exist:', { id: documentId });
					onUpdate(null);
				}
			},
			(error) => {
				console.error('❌ Document listener error:', error);
			}
		);

		this.unsubscribers.set(key, unsubscribe);
	}

	/**
	 * Subscribe to real-time updates for grades in a classroom
	 */
	subscribeToGrades(classroomId: string, onUpdate: (changes: DocumentChange[]) => void): void {
		const key = `grades/${classroomId}`;
		this.unsubscribe(key);

		console.log('🔊 Starting grades listener', { classroomId });

		const q = query(
			collection(firestore, 'grades'),
			where('classroomId', '==', classroomId),
			orderBy('gradedAt', 'desc')
		);

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const changes = snapshot.docChanges();
				if (changes.length > 0) {
					console.log('📨 Grade changes:', { count: changes.length });
					onUpdate(changes);
				}
			},
			(error) => {
				console.error('❌ Grades listener error:', error);
			}
		);

		this.unsubscribers.set(key, unsubscribe);
	}

	/**
	 * Unsubscribe from a specific listener
	 */
	unsubscribe(key: string): void {
		const unsubscribe = this.unsubscribers.get(key);
		if (unsubscribe) {
			console.log('🔇 Unsubscribing from:', key);
			unsubscribe();
			this.unsubscribers.delete(key);
		}
	}

	/**
	 * Unsubscribe from all listeners
	 */
	unsubscribeAll(): void {
		console.log('🔇 Unsubscribing from all listeners', {
			count: this.unsubscribers.size
		});

		this.unsubscribers.forEach((unsubscribe, key) => {
			console.log('🔇 Unsubscribing:', key);
			unsubscribe();
		});

		this.unsubscribers.clear();
		this.isListening = false;
	}

	/**
	 * Check if service is currently listening
	 */
	isActive(): boolean {
		return this.isListening && this.unsubscribers.size > 0;
	}

	/**
	 * Get list of active listeners
	 */
	getActiveListeners(): string[] {
		return Array.from(this.unsubscribers.keys());
	}
}

// Export singleton instance
export const realtimeService = new FirestoreRealtimeService();
