/**
 * Base Collection Class for Managing Groups of Models
 * Provides CRUD operations and reactive queries
 * Location: frontend/src/lib/models/base.collection.ts
 */

import type { BaseModel } from './base.model';

/**
 * Generic collection class for managing groups of models
 * Uses Map for O(1) lookups and provides reactive derived values
 */
export class BaseCollection<T extends BaseModel> {
	// Core storage using Map for efficient lookups
	protected items = $state<Map<string, T>>(new Map());

	// Loading and error states
	loading = $state<boolean>(false);
	error = $state<string | null>(null);
	lastUpdated = $state<Date | null>(null);

	// Derived reactive values
	all = $derived(Array.from(this.items.values()));
	count = $derived(this.items.size);
	isEmpty = $derived(this.items.size === 0);

	// Get IDs for efficient checks
	ids = $derived(Array.from(this.items.keys()));

	/**
	 * Add or update an item in the collection
	 * @param item - Model to add/update
	 */
	add(item: T): void {
		this.items.set(item.id, item);
		this.lastUpdated = new Date();
	}

	/**
	 * Add multiple items at once
	 * @param items - Array of models to add
	 */
	addMany(items: T[]): void {
		items.forEach((item) => this.items.set(item.id, item));
		this.lastUpdated = new Date();
	}

	/**
	 * Get an item by ID
	 * @param id - Item ID
	 * @returns Model instance or undefined
	 */
	get(id: string): T | undefined {
		return this.items.get(id);
	}

	/**
	 * Check if an item exists
	 * @param id - Item ID
	 */
	has(id: string): boolean {
		return this.items.has(id);
	}

	/**
	 * Update an existing item
	 * @param id - Item ID
	 * @param updates - Partial updates to apply
	 */
	update(id: string, updates: Partial<T>): void {
		const item = this.items.get(id);
		if (item) {
			item.update(updates);
			this.lastUpdated = new Date();
		} else {
			console.warn(`Item with id ${id} not found in collection`);
		}
	}

	/**
	 * Remove an item from the collection
	 * @param id - Item ID
	 */
	remove(id: string): void {
		const deleted = this.items.delete(id);
		if (deleted) {
			this.lastUpdated = new Date();
		}
	}

	/**
	 * Remove multiple items
	 * @param ids - Array of IDs to remove
	 */
	removeMany(ids: string[]): void {
		ids.forEach((id) => this.items.delete(id));
		this.lastUpdated = new Date();
	}

	/**
	 * Clear all items from the collection
	 */
	clear(): void {
		this.items.clear();
		this.lastUpdated = new Date();
	}

	/**
	 * Replace all items in the collection
	 * @param items - New items to set
	 */
	setAll(items: T[]): void {
		this.items.clear();
		items.forEach((item) => this.items.set(item.id, item));
		this.lastUpdated = new Date();
	}

	/**
	 * Find items matching a predicate
	 * @param predicate - Filter function
	 */
	filter(predicate: (item: T) => boolean): T[] {
		return this.all.filter(predicate);
	}

	/**
	 * Find first item matching a predicate
	 * @param predicate - Filter function
	 */
	find(predicate: (item: T) => boolean): T | undefined {
		return this.all.find(predicate);
	}

	/**
	 * Sort items by a comparator
	 * @param compareFn - Comparison function
	 */
	sorted(compareFn: (a: T, b: T) => number): T[] {
		return [...this.all].sort(compareFn);
	}

	/**
	 * Get items sorted by creation date (newest first)
	 */
	get newest(): T[] {
		return this.sorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	}

	/**
	 * Get items sorted by update date (most recent first)
	 */
	get recentlyUpdated(): T[] {
		return this.sorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	}

	/**
	 * Handle real-time updates from Firestore
	 * @param change - Firestore document change
	 * @param createModel - Function to create model from data
	 */
	handleRealtimeChange(
		change: { type: 'added' | 'modified' | 'removed'; id: string; data?: any },
		createModel: (data: any) => T
	): void {
		switch (change.type) {
			case 'added':
			case 'modified':
				try {
					const model = createModel({ id: change.id, ...change.data });
					this.add(model);
				} catch (error) {
					console.error(`Failed to process ${change.type} for ${change.id}:`, error);
					this.error = `Failed to process ${change.type}`;
				}
				break;

			case 'removed':
				this.remove(change.id);
				break;
		}
	}

	/**
	 * Set loading state
	 */
	setLoading(loading: boolean): void {
		this.loading = loading;
		if (loading) {
			this.error = null;
		}
	}

	/**
	 * Set error state
	 */
	setError(error: string | null): void {
		this.error = error;
		this.loading = false;
	}

	/**
	 * Get collection statistics
	 */
	get stats() {
		return $derived({
			total: this.count,
			lastUpdated: this.lastUpdated,
			hasError: this.error !== null,
			isLoading: this.loading
		});
	}
}
