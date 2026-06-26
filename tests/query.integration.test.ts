import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('POST /api/query (integration)', () => {
  it('should return 200 with minimum contract and return-policy answer from POL-001', async () => {
    const response = await request(app)
      .post('/api/query')
      .send({ question: 'prazo devolução' });

    expect(response.status).toBe(200);

    expect(response.body).toBeTypeOf('object');
    expect(response.body).toHaveProperty('answer');
    expect(response.body).toHaveProperty('source_document');
    expect(response.body).toHaveProperty('confidence_score');

    expect(response.body.answer).toEqual(expect.any(String));
    expect(response.body.source_document).toBe('POL-001');
    expect(response.body.confidence_score).toEqual(expect.any(Number));
    expect(response.body.confidence_score).toBeGreaterThanOrEqual(0);
    expect(response.body.confidence_score).toBeLessThanOrEqual(1);

    expect(response.body.answer.toLowerCase()).toMatch(/7\s*dias/);
  });
});
