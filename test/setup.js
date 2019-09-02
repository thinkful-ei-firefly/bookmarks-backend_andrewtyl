const { expect } = require('chai')
const supertest = require('supertest')
require('dotenv').config()
process.env.TZ = 'UTC'
process.env.API_KEY = "cjzz7r2k8000001jw2d9tdu5b";
process.env.SKIP_AUTH = true

global.expect = expect
global.supertest = supertest