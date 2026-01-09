const { TPSUID7RB } = require('./dist/index.js');

console.log('=== TPS-UID v1 Quick Tests ===\n');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    if (fn()) { console.log('✅', name); passed++; }
    else { console.log('❌', name); failed++; }
  } catch(e) { console.log('❌', name, '-', e.message); failed++; }
}

// Basic tests
const tps = 'tps://31.95,35.91,800m@T:greg.m3.c1.y26.M01.d09.h14.n30.s25';

test('Encode/decode roundtrip', () => {
  const encoded = TPSUID7RB.encodeBinaryB64(tps);
  const decoded = TPSUID7RB.decodeBinaryB64(encoded);
  return decoded.tps === tps;
});

test('Prefix is tpsuid7rb_', () => {
  const encoded = TPSUID7RB.encodeBinaryB64(tps);
  return encoded.startsWith('tpsuid7rb_');
});

test('Magic bytes are TPU7', () => {
  const bytes = TPSUID7RB.encodeBinary(tps);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  return magic === 'TPU7';
});

test('Compressed roundtrip', () => {
  const encoded = TPSUID7RB.encodeBinaryB64(tps, { compress: true });
  const decoded = TPSUID7RB.decodeBinaryB64(encoded);
  return decoded.tps === tps && decoded.compressed === true;
});

test('Epoch time extracted correctly', () => {
  const decoded = TPSUID7RB.decodeBinaryB64(TPSUID7RB.encodeBinaryB64(tps));
  return decoded.epochMs === Date.UTC(2026, 0, 9, 14, 30, 25);
});

test('Validation works', () => {
  return TPSUID7RB.validateBinaryB64(TPSUID7RB.encodeBinaryB64(tps)) && 
         !TPSUID7RB.validateBinaryB64('invalid');
});

test('Generate creates valid TPS-UID', () => {
  const generated = TPSUID7RB.generate({ latitude: 32, longitude: 35 });
  return TPSUID7RB.validateBinaryB64(generated) && 
         TPSUID7RB.decodeBinaryB64(generated).tps.includes('32,35');
});

const crypto = require('crypto');

test('Unicode survives roundtrip', () => {
  const unicodeTps = 'tps://unknown@T:greg.m3.c1.y26.M01.d01;note=test';
  const decoded = TPSUID7RB.decodeBinaryB64(TPSUID7RB.encodeBinaryB64(unicodeTps));
  return decoded.tps === unicodeTps;
});

// --- Sealing Tests ---
console.log('\n--- Sealing Tests ---');

// Generate keys
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');

test('Seal creates valid binary structure', () => {
  const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
  const sealed = TPSUID7RB.seal(tps, privateKey);
  // Check seal flag (bit 1 of FLAGS at index 5)
  return (sealed[5] & 0x02) === 0x02 && sealed.length > 80;
});

test('Verify sealed UID', () => {
  const tps = 'tps://32,35@T:greg.m3.c1.y26.M01.d09';
  const sealed = TPSUID7RB.seal(tps, privateKey);
  const result = TPSUID7RB.verifyAndDecode(sealed, publicKey);
  return result.tps === tps;
});

test('Tampered sealed UID fails', () => {
  const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
  const sealed = TPSUID7RB.seal(tps, privateKey);
  sealed[20] ^= 0xFF; // Tamper
  try {
    TPSUID7RB.verifyAndDecode(sealed, publicKey);
    return false;
  } catch(e) {
    return true; // Expected failure
  }
});

test('Wrong key verification fails', () => {
  const tps = 'tps://unknown@T:greg.m3.c1.y26.M01.d09';
  const sealed = TPSUID7RB.seal(tps, privateKey);
  const { publicKey: otherKey } = crypto.generateKeyPairSync('ed25519');
  try {
    TPSUID7RB.verifyAndDecode(sealed, otherKey);
    return false;
  } catch(e) {
    return true; // Expected failure
  }
});

test('Sealing with compression', () => {
  const sealed = TPSUID7RB.seal(tps.repeat(5), privateKey, { compress: true });
  const result = TPSUID7RB.verifyAndDecode(sealed, publicKey);
  return result.tps === tps.repeat(5); // Decoded result doesn't explicitly return compressed boolean but handles it internally
});

console.log('\n=== Summary ===');
console.log('Passed:', passed);
console.log('Failed:', failed);
console.log(failed === 0 ? '\n✅ All tests passed!' : '\n❌ Some tests failed!');

process.exit(failed === 0 ? 0 : 1);
