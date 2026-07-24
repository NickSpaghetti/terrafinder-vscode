import * as assert from 'assert';
import { isSafeHttpUrl } from '../utils/urlSafety';

suite('urlSafety Test Suite', () => {
	test('accepts http and https urls', () => {
		assert.strictEqual(isSafeHttpUrl('https://app.terraform.io/org/module'), true);
		assert.strictEqual(isSafeHttpUrl('http://example.com'), true);
	});

	test('rejects non-http(s) schemes', () => {
		assert.strictEqual(isSafeHttpUrl('javascript:alert(1)'), false);
		assert.strictEqual(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false);
		assert.strictEqual(isSafeHttpUrl('file:///etc/passwd'), false);
		assert.strictEqual(isSafeHttpUrl('vbscript:msgbox(1)'), false);
	});

	test('rejects malformed input', () => {
		assert.strictEqual(isSafeHttpUrl('not a url'), false);
		assert.strictEqual(isSafeHttpUrl(''), false);
	});
});
