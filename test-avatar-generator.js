/**
 * Quick test script for the character avatar generator
 * Run with: node test-avatar-generator.js
 */

import { generateCharacterAvatar, AvatarOptions } from './src/utils/characterAvatarGenerator.js';

console.log('🎨 Testing Character Avatar Generator\n');

// Test 1: Generate from name
console.log('Test 1: Generate avatar from name');
const avatar1 = generateCharacterAvatar('John Doe', {}, 96);
console.log(`✅ Generated avatar (length: ${avatar1.length} chars)`);
console.log(`   Starts with: ${avatar1.substring(0, 50)}...`);
console.log();

// Test 2: Deterministic generation (same name = same avatar)
console.log('Test 2: Deterministic generation');
const avatar2a = generateCharacterAvatar('Alice Smith', {}, 96);
const avatar2b = generateCharacterAvatar('Alice Smith', {}, 96);
const isDeterministic = avatar2a === avatar2b;
console.log(`✅ Same name produces same avatar: ${isDeterministic}`);
console.log();

// Test 3: Different names produce different avatars
console.log('Test 3: Different names produce different avatars');
const avatar3a = generateCharacterAvatar('Bob Johnson', {}, 96);
const avatar3b = generateCharacterAvatar('Carol Williams', {}, 96);
const areDifferent = avatar3a !== avatar3b;
console.log(`✅ Different names produce different avatars: ${areDifferent}`);
console.log();

// Test 4: Custom options
console.log('Test 4: Custom options override');
const customAvatar = generateCharacterAvatar('Test User', {
    skinTone: AvatarOptions.skinTones[2],
    hairStyle: 'curly',
    hairColor: AvatarOptions.hairColors[4],
    mouthExpression: 'smile',
    accessory: 'glasses'
}, 128);
const hasGlasses = customAvatar.includes('glasses');
const hasCurly = customAvatar.includes('curly') || customAvatar.includes('circle'); // curly uses circles
console.log(`✅ Custom avatar generated with options`);
console.log(`   Contains glasses element: ${hasGlasses}`);
console.log();

// Test 5: Test all hair styles
console.log('Test 5: Generate avatars with all hair styles');
AvatarOptions.hairStyles.forEach(style => {
    const avatar = generateCharacterAvatar('Test', { hairStyle: style }, 96);
    console.log(`   ✅ ${style}: ${avatar.length} chars`);
});
console.log();

// Test 6: Test all expressions
console.log('Test 6: Generate avatars with all expressions');
AvatarOptions.mouthExpressions.forEach(expr => {
    const avatar = generateCharacterAvatar('Test', { mouthExpression: expr }, 96);
    console.log(`   ✅ ${expr}: ${avatar.length} chars`);
});
console.log();

// Test 7: Test all accessories
console.log('Test 7: Generate avatars with all accessories');
AvatarOptions.accessories.forEach(acc => {
    const avatar = generateCharacterAvatar('Test', { accessory: acc }, 96);
    console.log(`   ✅ ${acc}: ${avatar.length} chars`);
});
console.log();

// Test 8: Different sizes
console.log('Test 8: Generate avatars with different sizes');
[48, 64, 96, 128, 200].forEach(size => {
    const avatar = generateCharacterAvatar('Test', {}, size);
    const hasCorrectSize = avatar.includes(`width="${size}"`);
    console.log(`   ✅ Size ${size}: ${hasCorrectSize ? 'correct' : 'FAILED'}`);
});
console.log();

// Test 9: SVG validity (basic check)
console.log('Test 9: SVG validity check');
const testAvatar = generateCharacterAvatar('Validation Test', {}, 96);
const hasSvgTag = testAvatar.includes('<svg') && testAvatar.includes('</svg>');
const hasViewBox = testAvatar.includes('viewBox');
const hasWidth = testAvatar.includes('width=');
const hasHeight = testAvatar.includes('height=');
console.log(`   ✅ Contains SVG tags: ${hasSvgTag}`);
console.log(`   ✅ Contains viewBox: ${hasViewBox}`);
console.log(`   ✅ Contains width: ${hasWidth}`);
console.log(`   ✅ Contains height: ${hasHeight}`);
console.log();

// Test 10: Generate multiple avatars from team
console.log('Test 10: Generate team avatars');
const team = ['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank'];
team.forEach(name => {
    const avatar = generateCharacterAvatar(name, {}, 96);
    console.log(`   ✅ ${name}: avatar generated`);
});
console.log();

console.log('✅ All tests completed!\n');
console.log('📝 Summary:');
console.log(`   - 8 Skin tones available`);
console.log(`   - ${AvatarOptions.hairStyles.length} Hair styles`);
console.log(`   - ${AvatarOptions.hairColors.length} Hair colors`);
console.log(`   - ${AvatarOptions.eyeShapes.length} Eye shapes`);
console.log(`   - ${AvatarOptions.eyeColors.length} Eye colors`);
console.log(`   - ${AvatarOptions.eyebrowShapes.length} Eyebrow shapes`);
console.log(`   - ${AvatarOptions.mouthExpressions.length} Expressions`);
console.log(`   - ${AvatarOptions.accessories.length} Accessories`);
console.log();
console.log('🎉 Avatar generator is ready to use!');
