import assert from 'node:assert/strict'
import test from 'node:test'
import type { Request, Response } from 'express'
import { AuthController } from '../src/controllers/authController.js'
import type { AuthService } from '../src/services/AuthService.js'
import { AuthConflictError, InvalidCredentialsError } from '../src/auth/AuthContracts.js'

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

test('login does not reveal whether the username or password was wrong', async () => {
  const controller = new AuthController({
    login: async () => { throw new InvalidCredentialsError() },
  } as unknown as AuthService)
  const result = createJsonResponse()

  await controller.login({ body: { username: 'missing', password: 'wrong' } } as Request, result.response)

  assert.equal(result.getStatusCode(), 401)
  assert.deepEqual(result.getBody(), { error: 'Invalid username or password.' })
})

test('signup duplicate errors do not identify the conflicting field', async () => {
  const controller = new AuthController({
    signup: async () => { throw new AuthConflictError() },
  } as unknown as AuthService)
  const result = createJsonResponse()

  await controller.signup({ body: { username: 'existing', email: 'existing@example.com', password: 'password-123' } } as Request, result.response)

  assert.equal(result.getStatusCode(), 400)
  assert.deepEqual(result.getBody(), { error: 'Unable to create account with those details.' })
})

test('unexpected authentication errors are not exposed to clients', async () => {
  const controller = new AuthController({
    login: async () => { throw new Error('MongoNetworkError: private connection details') },
  } as unknown as AuthService)
  const result = createJsonResponse()
  const originalConsoleError = console.error
  console.error = () => undefined

  try {
    await controller.login({ body: { username: 'person', password: 'password-123' } } as Request, result.response)
  } finally {
    console.error = originalConsoleError
  }

  assert.equal(result.getStatusCode(), 500)
  assert.deepEqual(result.getBody(), { error: 'Unable to sign in right now.' })
})
