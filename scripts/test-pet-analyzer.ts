// scripts/test-pet-analyzer.ts
// Test script for the updated pet analyzer

import { analyzePet } from '../src/lib/server/petAnalyzer';

console.log('🧪 Testing Pet Analyzer\n');

// Test Case 1: Korean breed name (골든리트리버)
console.log('Test 1: Korean breed name - 골든리트리버, 6 months, 20kg');
const test1 = analyzePet('골든리트리버', 6, 20);
console.log('Result:', JSON.stringify(test1, null, 2));
console.log('Expected: age_fit=puppy, jaw_hardness_fit based on BiteForce\n');

// Test Case 2: English breed name
console.log('Test 2: English breed name - Golden Retriever, 24 months, 30kg');
const test2 = analyzePet('Golden Retriever', 24, 30);
console.log('Result:', JSON.stringify(test2, null, 2));
console.log('Expected: age_fit=adult\n');

// Test Case 3: No weight provided
console.log('Test 3: No weight - Beagle, 12 months');
const test3 = analyzePet('비글', 12);
console.log('Result:', JSON.stringify(test3, null, 2));
console.log('Expected: weight_status=null\n');

// Test Case 4: Unknown breed
console.log('Test 4: Unknown breed - 믹스견, 6 months');
const test4 = analyzePet('믹스견', 6);
console.log('Result:', test4);
console.log('Expected: null (breed not found)\n');

// Test Case 5: Edge case - month > 120
console.log('Test 5: Edge case - Pomeranian, 150 months');
const test5 = analyzePet('포메라니안', 150);
console.log('Result:', JSON.stringify(test5, null, 2));
console.log('Expected: Fallback to approximate age_fit\n');

// Test Case 6: Bite force thresholds
console.log('Test 6: BiteForce threshold test - Chihuahua (low), Beagle (medium), Akita (high)');
const chihuahua = analyzePet('치와와', 12);
const beagle = analyzePet('비글', 12);
const akita = analyzePet('Akita', 12);

console.log('Chihuahua:', chihuahua?.jaw_hardness_fit, '(expected: low)');
console.log('Beagle:', beagle?.jaw_hardness_fit, '(expected: medium)');
console.log('Akita:', akita?.jaw_hardness_fit, '(expected: high)');
console.log('\n✅ All tests completed');
