import { readFile } from 'node:fs/promises';

const endpoint = process.env.INTAKE_SMOKE_URL || 'http://localhost:3000/api/v1/intakes';
const body = JSON.parse(await readFile(new URL('../tests/fixtures/intake-valid.json', import.meta.url), 'utf8'));

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const responseText = await response.text();
  process.stdout.write(`HTTP ${response.status}\n${responseText}\n`);
  if (!response.ok) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`Could not reach ${endpoint}: ${error.message}\n`);
  process.exitCode = 1;
}
