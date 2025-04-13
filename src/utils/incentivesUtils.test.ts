/**
 * Tests for incentives utilities
 * 
 * This file provides example usage of the incentives API
 * and can be used to verify the system is working correctly.
 */

import { getUserPoints, getPointTransactions, getUserAchievements, getUserAchievementSummary, updateUserLoginStreak } from './incentivesUtils';

// Example user ID - replace with a real one when testing
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Test fetching user points
 */
async function testGetUserPoints() {
  console.log('Testing getUserPoints...');
  try {
    const result = await getUserPoints(TEST_USER_ID);
    console.log('User points:', result);
    return result;
  } catch (error) {
    console.error('Error in getUserPoints:', error);
    throw error;
  }
}

/**
 * Test fetching user transactions
 */
async function testGetPointTransactions() {
  console.log('Testing getPointTransactions...');
  try {
    const result = await getPointTransactions(TEST_USER_ID, 5);
    console.log('User transactions:', result);
    return result;
  } catch (error) {
    console.error('Error in getPointTransactions:', error);
    throw error;
  }
}

/**
 * Test fetching user achievements
 */
async function testGetUserAchievements() {
  console.log('Testing getUserAchievements...');
  try {
    const result = await getUserAchievements(TEST_USER_ID);
    console.log('User achievements:', result);
    return result;
  } catch (error) {
    console.error('Error in getUserAchievements:', error);
    throw error;
  }
}

/**
 * Test fetching user achievement summary
 */
async function testGetUserAchievementSummary() {
  console.log('Testing getUserAchievementSummary...');
  try {
    const result = await getUserAchievementSummary(TEST_USER_ID);
    console.log('User achievement summary:', result);
    return result;
  } catch (error) {
    console.error('Error in getUserAchievementSummary:', error);
    throw error;
  }
}

/**
 * Test updating user login streak
 */
async function testUpdateUserLoginStreak() {
  console.log('Testing updateUserLoginStreak...');
  try {
    const result = await updateUserLoginStreak(TEST_USER_ID);
    console.log('Login streak update result:', result);
    return result;
  } catch (error) {
    console.error('Error in updateUserLoginStreak:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  try {
    console.log('Running all incentives tests...');
    
    // Run tests sequentially
    await testGetUserPoints();
    await testGetPointTransactions();
    await testGetUserAchievements();
    await testGetUserAchievementSummary();
    await testUpdateUserLoginStreak();
    
    console.log('All tests completed!');
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Uncomment the line below to run all tests
// runAllTests();

// Export functions for individual testing
export const tests = {
  testGetUserPoints,
  testGetPointTransactions,
  testGetUserAchievements,
  testGetUserAchievementSummary,
  testUpdateUserLoginStreak,
  runAllTests
}; 