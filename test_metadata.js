const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

test('Schema.org WebApplication JSON-LD Metadata Verification', () => {
    const html = fs.readFileSync('index.html', 'utf-8');
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLdMatch, 'JSON-LD script block should exist in index.html');

    const jsonLd = JSON.parse(jsonLdMatch[1]);

    // Verify required Schema.org metadata
    assert.strictEqual(jsonLd['@context'], 'https://schema.org', '@context must be https://schema.org');
    assert.strictEqual(jsonLd['@type'], 'WebApplication', '@type must be WebApplication');

    // Verify other fields
    assert.ok(jsonLd.name, 'name property should exist');
    assert.ok(jsonLd.url, 'url property should exist');
    assert.ok(jsonLd.applicationCategory, 'applicationCategory property should exist');
    assert.ok(jsonLd.description, 'description property should exist');
    assert.ok(jsonLd.operatingSystem, 'operatingSystem property should exist');
    assert.ok(jsonLd.browserRequirements, 'browserRequirements property should exist');
    assert.strictEqual(jsonLd.softwareVersion, '1.0.0', 'softwareVersion property should be 1.0.0');

    console.log("✅ JSON-LD metadata verified successfully.");
});
