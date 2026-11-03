import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';

describe('frontend static serving', () => {
  test('serves index for the root and client-side routes with no-cache', async () => {
    for (const route of ['/', '/contact']) {
      const response = await request(app).get(route).expect(200).expect('Content-Type', /text\/html/);
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.text).toContain('Frontend fixture');
    }
  });

  test('serves asset files with immutable caching', async () => {
    const response = await request(app).get('/assets/x.js').expect(200);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  test('keeps unknown API routes on the JSON 404 handler', async () => {
    const response = await request(app).get('/api/v1/unknown').expect(404).expect('Content-Type', /application\/json/);
    expect(response.body).toMatchObject({ success: false, message: 'Route not found' });
  });

  test('continues to serve API health', async () => {
    await request(app).get('/api/v1/health').expect(200).expect({ success: true, status: 'ok' });
  });

  test('allows blob document previews and omits HTTPS-only directives in test mode', async () => {
    const response = await request(app).get('/').expect(200);
    expect(response.headers['content-security-policy']).toContain('frame-src https://www.google.com blob:');
    expect(response.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
    expect(response.headers['strict-transport-security']).toBeUndefined();
  });
});
