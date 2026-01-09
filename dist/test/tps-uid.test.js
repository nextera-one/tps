/**
 * TPS-UID v1 Tests
 * Tests for the TPSUID7RB (Binary Reversible) identifier format.
 * @version 1.0
 */
import { TPSUID7RB } from '../src/index';
console.log('=== TPS-UID v1 Test Suite ===\n');
let passed = 0;
let failed = 0;
function test(name, fn) {
    try {
        const result = fn();
        if (result) {
            console.log(`✅ ${name}`);
            passed++;
        }
        else {
            console.log(`❌ ${name} - assertion failed`);
            failed++;
        }
    }
    catch (error) {
        console.log(`❌ ${name} - ${error.message}`);
        failed++;
    }
}
// ============================================================================
// PART 1: Basic Encode/Decode Roundtrip
// ============================================================================
console.log('--- Part 1: Basic Encode/Decode ---\n');
test('Base64url encode/decode roundtrip', () => {
    const tps = 'tps://31.95,35.91,800m@T:greg.m3.c1.y26.M01.d09.h14.n30.s25';
    const encoded = TPSUID7RB.encodeBinaryB64(tps);
    const decoded = TPSUID7RB.decodeBinaryB64(encoded);
    return decoded.tps === tps;
});
test('Binary encode/decode roundtrip', () => {
    const tps = 'tps://32,35@T:greg.m3.c1.y26.M01.d09';
    const bytes = TPSUID7RB.encodeBinary(tps);
    const decoded = TPSUID7RB.decodeBinary(bytes);
    return decoded.tps === tps;
});
test('Prefix is correct', () => {
    const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
    const encoded = TPSUID7RB.encodeBinaryB64(tps);
    return encoded.startsWith('tpsuid7rb_');
});
test('Magic bytes are TPU7', () => {
    const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
    const bytes = TPSUID7RB.encodeBinary(tps);
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    return magic === 'TPU7';
});
test('Version byte is 0x01', () => {
    const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
    const bytes = TPSUID7RB.encodeBinary(tps);
    return bytes[4] === 0x01;
});
console.log();
// ============================================================================
// PART 2: Compression
// ============================================================================
console.log('--- Part 2: Compression ---\n');
test('Compressed encode/decode roundtrip', () => {
    const tps = 'tps://31.95,35.91,800m@T:greg.m3.c1.y26.M01.d09.h14.n30.s25';
    const encoded = TPSUID7RB.encodeBinaryB64(tps, { compress: true });
    const decoded = TPSUID7RB.decodeBinaryB64(encoded);
    return decoded.tps === tps && decoded.compressed === true;
});
test('Uncompressed flag is false', () => {
    const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
    const encoded = TPSUID7RB.encodeBinaryB64(tps, { compress: false });
    const decoded = TPSUID7RB.decodeBinaryB64(encoded);
    return decoded.compressed === false;
});
test('Compression flag bit is set correctly', () => {
    const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
    const compressed = TPSUID7RB.encodeBinary(tps, { compress: true });
    const uncompressed = TPSUID7RB.encodeBinary(tps, { compress: false });
    return (compressed[5] & 0x01) === 0x01 && (uncompressed[5] & 0x01) === 0x00;
});
console.log();
// ============================================================================
// PART 3: Epoch Time
// ============================================================================
console.log('--- Part 3: Epoch Time ---\n');
test('Epoch time is extracted correctly', () => {
    const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09.h14.n30.s25';
    const decoded = TPSUID7RB.decodeBinaryB64(TPSUID7RB.encodeBinaryB64(tps));
    const expectedEpoch = Date.UTC(2026, 0, 9, 14, 30, 25);
    return decoded.epochMs === expectedEpoch;
});
test('Custom epochMs override works', () => {
    const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
    const customEpoch = 1700000000000;
    const encoded = TPSUID7RB.encodeBinaryB64(tps, { epochMs: customEpoch });
    const decoded = TPSUID7RB.decodeBinaryB64(encoded);
    return decoded.epochMs === customEpoch;
});
test('Epoch parsing from TPS with time-only format', () => {
    const tps = 'tps://32,35@T:greg.m3.c1.y26.M06.d15.h10.n00.s00';
    const encoded = TPSUID7RB.encodeBinaryB64(tps);
    const decoded = TPSUID7RB.decodeBinaryB64(encoded);
    const expected = Date.UTC(2026, 5, 15, 10, 0, 0);
    return decoded.epochMs === expected;
});
console.log();
// ============================================================================
// PART 4: Validation
// ============================================================================
console.log('--- Part 4: Validation ---\n');
test('Valid TPS-UID passes validation', () => {
    const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
    const encoded = TPSUID7RB.encodeBinaryB64(tps);
    return TPSUID7RB.validateBinaryB64(encoded);
});
test('Invalid prefix fails validation', () => {
    return !TPSUID7RB.validateBinaryB64('invalid_abc123');
});
test('Empty string fails validation', () => {
    return !TPSUID7RB.validateBinaryB64('');
});
test('Wrong prefix fails validation', () => {
    return !TPSUID7RB.validateBinaryB64('tpsuid7r_abc123');
});
console.log();
// ============================================================================
// PART 5: Error Handling
// ============================================================================
console.log('--- Part 5: Error Handling ---\n');
test('Missing prefix throws error', () => {
    try {
        TPSUID7RB.decodeBinaryB64('abc123');
        return false;
    }
    catch (e) {
        return e.message.includes('missing prefix');
    }
});
test('Bad magic throws error', () => {
    try {
        const badBytes = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x01, 0x00]);
        TPSUID7RB.decodeBinary(badBytes);
        return false;
    }
    catch (e) {
        return e.message.includes('bad magic');
    }
});
test('Too short throws error', () => {
    try {
        const shortBytes = new Uint8Array([0x54, 0x50, 0x55, 0x37]);
        TPSUID7RB.decodeBinary(shortBytes);
        return false;
    }
    catch (e) {
        return e.message.includes('too short');
    }
});
test('Unsupported version throws error', () => {
    try {
        const badVersion = new Uint8Array(20);
        badVersion.set([0x54, 0x50, 0x55, 0x37, 0x99], 0); // TPU7 with bad version
        TPSUID7RB.decodeBinary(badVersion);
        return false;
    }
    catch (e) {
        return e.message.includes('unsupported version');
    }
});
console.log();
// ============================================================================
// PART 6: Generate
// ============================================================================
console.log('--- Part 6: Generate ---\n');
test('Generate creates valid TPS-UID', () => {
    const generated = TPSUID7RB.generate();
    return TPSUID7RB.validateBinaryB64(generated);
});
test('Generate with location includes coordinates', () => {
    const generated = TPSUID7RB.generate({ latitude: 32.5, longitude: 35.5 });
    const decoded = TPSUID7RB.decodeBinaryB64(generated);
    return decoded.tps.includes('32.5,35.5');
});
test('Generate with altitude includes altitude', () => {
    const generated = TPSUID7RB.generate({
        latitude: 32.5,
        longitude: 35.5,
        altitude: 100,
    });
    const decoded = TPSUID7RB.decodeBinaryB64(generated);
    return decoded.tps.includes('100m');
});
test('Generate without location uses unknown', () => {
    const generated = TPSUID7RB.generate();
    const decoded = TPSUID7RB.decodeBinaryB64(generated);
    return decoded.tps.includes('unknown@');
});
console.log();
// ============================================================================
// PART 7: Edge Cases
// ============================================================================
console.log('--- Part 7: Edge Cases ---\n');
test('Long TPS string roundtrip', () => {
    const tps = 'tps://31.9523456,35.9123456,1234.56m@T:greg.m3.c1.y26.M12.d31.h23.n59.s59;extension1;extension2;extension3';
    const encoded = TPSUID7RB.encodeBinaryB64(tps);
    const decoded = TPSUID7RB.decodeBinaryB64(encoded);
    return decoded.tps === tps;
});
test('Unicode in extensions survives roundtrip', () => {
    const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d01;note=تجربة';
    const encoded = TPSUID7RB.encodeBinaryB64(tps);
    const decoded = TPSUID7RB.decodeBinaryB64(encoded);
    return decoded.tps === tps;
});
test('Privacy location types preserved', () => {
    const types = ['unknown', 'hidden', 'redacted'];
    return types.every((type) => {
        const tps = `tps://${type}@T:greg.m3.c1.y26.M01.d01`;
        const decoded = TPSUID7RB.decodeBinaryB64(TPSUID7RB.encodeBinaryB64(tps));
        return decoded.tps.includes(type);
    });
});
console.log();
// ============================================================================
// Summary
// ============================================================================
console.log('=== Test Summary ===\n');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log();
if (failed > 0) {
    console.log('❌ Some tests failed!');
    process.exit(1);
}
else {
    console.log('✅ All tests passed!');
    process.exit(0);
}
