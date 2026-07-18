import assert from 'node:assert/strict'
import test from 'node:test'
import type { Request, Response } from 'express'
import { AuthController } from '../src/controllers/authController.js'
import type { AuthService } from '../src/services/AuthService.js'

function createJsonResponse() {
  let statusCode = 200
  let body: unknown
  const response = {
    status(code: number) {
      statusCode = code
      return response
    },
    json(value: unknown) {
      body = value
      return response
    },
  } as unknown as Response

  return {
    response,
    getStatusCode: () => statusCode,
    getBody: () => body,
  }
}

test('current-user response exposes only allowlisted profile fields', () => {
  const controller = new AuthController({} as AuthService)
  const req = {
    userId: 'user-123',
    user: {
      _id: 'mongo-user-id',
      username: 'reviewer',
      email: 'reviewer@example.com',
      passwordHash: 'never-return-this',
      isGuest: false,
      createdAt: '2026-07-18T12:00:00.000Z',
      updatedAt: '2026-07-18T12:30:00.000Z',
    },
  } as unknown as Request
  const result = createJsonResponse()

  controller.me(req, result.response)

  assert.equal(result.getStatusCode(), 200)
  assert.deepEqual(result.getBody(), {
    user: {
      id: 'user-123',
      username: 'reviewer',
      email: 'reviewer@example.com',
      isGuest: false,
      createdAt: '2026-07-18T12:00:00.000Z',
    },
  })
  assert.equal('passwordHash' in ((result.getBody() as { user: object }).user), false)
})

test('current-user response fails closed without authenticated identity', () => {
  const controller = new AuthController({} as AuthService)
  const result = createJsonResponse()

  controller.me({} as Request, result.response)

  assert.equal(result.getStatusCode(), 401)
  assert.deepEqual(result.getBody(), { error: 'Missing authenticated user' })
})
