import { describe, expect, it } from 'vitest'
import request from 'supertest'

const app = require('../app')

describe('Health API', () => {
  it('should return server health status', async () => {
    const response = await request(app)
      .get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      message: 'Server is running',
    })
  })
})

describe('Authentication middleware', () => {
  it('should reject request when token is missing', async () => {
    const response = await request(app)
      .get('/api/auth/me')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      message: 'No token, authorization denied',
    })
  })

  it('should reject request when token is invalid', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      message: 'Token is not valid',
    })
  })
})

describe('Registration validation', () => {
  it('should reject registration when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nasir',
        email: 'nasir@example.com',
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      message: 'All fields are required',
    })
  })

  it('should reject registration when passwords do not match', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nasir',
        email: 'nasir@example.com',
        password: 'password123',
        confirmPassword: 'different123',
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      message: 'Passwords do not match',
    })
  })

  it('should reject registration when password is too short', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nasir',
        email: 'nasir@example.com',
        password: '12345',
        confirmPassword: '12345',
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      message: 'Password must be at least 6 characters',
    })
  })
})

describe('Login validation', () => {
  it('should reject login when email or password is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nasir@example.com',
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      message: 'Email and password are required',
    })
  })
})
