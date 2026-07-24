import * as assert from 'assert';
import { HclSourceService } from '../services/orchestrations/hlcSourceService';
import { HclVersionService } from '../services/foundations/hlcVersionService';
import { TerraformRegistryService } from '../services/foundations/terraformRegistryService';
import { TerraformRegistryBroker } from '../brokers/apis/terraformRegistryBroker';
import { SourceTypes } from '../models/sourceTypes';

suite('HclSourceService private registry Test Suite', () => {
	const hclSourceService = new HclSourceService(
		new HclVersionService(new TerraformRegistryService(new TerraformRegistryBroker()))
	);

	test('recognizes a valid terraform.io private registry host', () => {
		assert.strictEqual(hclSourceService.IsPrivateRegistry('app.terraform.io/org/module/aws'), true);
	});

	test('rejects an unrelated host disguised via a terraform.io-like suffix', () => {
		assert.strictEqual(hclSourceService.IsPrivateRegistry('terraform.io.attacker.com/org/module'), false);
	});

	test('rejects embedded-userinfo host confusion tricks', () => {
		assert.strictEqual(hclSourceService.IsPrivateRegistry('user@evil.com@terraform.io/org/module'), false);
	});

	test('rejects non-url garbage', () => {
		assert.strictEqual(hclSourceService.IsPrivateRegistry('not a url at all'), false);
	});

	test('ResolveSource returns a real https url for a valid private registry source', async () => {
		const resolved = await hclSourceService.ResolveSource(
			SourceTypes.privateRegistry,
			'app.terraform.io/org/module/aws',
			'module.example',
			'',
			new URL('https://github.com/example/repo/blob/main/main.tf')
		);
		assert.strictEqual(resolved, 'https://app.terraform.io/org/module/aws');
	});

	test('ResolveSource returns null for an unsafe/invalid private registry source', async () => {
		const resolved = await hclSourceService.ResolveSource(
			SourceTypes.privateRegistry,
			'user@evil.com@terraform.io/org/module',
			'module.example',
			'',
			new URL('https://github.com/example/repo/blob/main/main.tf')
		);
		assert.strictEqual(resolved, null);
	});
});
