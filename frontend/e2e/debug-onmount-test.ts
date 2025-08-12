// Debug test to check onMount behavior
import { test } from '@playwright/test';
import { signInAsTeacher } from './test-helpers.ts';

test('debug onMount console messages', async ({ page }) => {
	// Capture all console messages
	const consoleMessages = [];
	page.on('console', (msg) => {
		const text = msg.text();
		console.log(`CONSOLE: ${msg.type()}: ${text}`);
		consoleMessages.push(text);
	});

	// Sign in and navigate to dashboard
	await signInAsTeacher(page);
	await page.goto('/dashboard/teacher');

	// Wait for component to mount
	await page.waitForTimeout(5000);

	// Print all captured console messages
	console.log('\n=== ALL CONSOLE MESSAGES ===');
	consoleMessages.forEach((msg, i) => {
		console.log(`${i + 1}. ${msg}`);
	});

	// Look for specific onMount messages
	const onMountMessages = consoleMessages.filter((msg) => msg.includes('onMount'));
	console.log('\n=== ONMOUNT MESSAGES ===');
	if (onMountMessages.length === 0) {
		console.log('❌ NO onMount messages found!');
	} else {
		onMountMessages.forEach((msg) => console.log(`✅ ${msg}`));
	}

	// Look for store loading messages
	const storeMessages = consoleMessages.filter(
		(msg) => msg.includes('Starting dashboard load') || msg.includes('API returned result')
	);
	console.log('\n=== STORE LOADING MESSAGES ===');
	if (storeMessages.length === 0) {
		console.log('❌ NO store loading messages found!');
	} else {
		storeMessages.forEach((msg) => console.log(`✅ ${msg}`));
	}
});
