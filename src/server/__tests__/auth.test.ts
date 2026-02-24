import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

async function runTests() {
  console.log("Starting Auth Integration Tests...");
  
  // 1. Setup Phase
  console.log("Setting up DB...");
  await prisma.user.deleteMany();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);
  await prisma.user.create({
    data: {
      email: 'test@synctracker.app',
      name: 'Test Setup User',
      passwordHash
    }
  });

  // 2. We import dynamically to avoid Next.js module load issues at the top level
  const { POST: loginRoute } = await import('@/app/api/auth/login/route');

  // Test 1: Successful Login
  console.log("Test 1: should succeed with correct credentials...");
  let req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'test@synctracker.app', password: 'Password123!' })
  });

  let response = await loginRoute(req);
  let data = await response.json();
  
  if (response.status !== 200 || !data.success) throw new Error("Test 1 Failed: Status not 200 or success not true");
  
  const cookies = response.headers.get('set-cookie');
  if (!cookies || !cookies.includes('token=') || !cookies.includes('HttpOnly')) {
    throw new Error(`Test 1 Failed: Missing valid token cookie. Received: ${cookies}`);
  }
  console.log("✅ Test 1 Passed");

  // Test 2: Invalid Login
  console.log("Test 2: should fail drastically with invalid password...");
  req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'test@synctracker.app', password: 'WrongPassword' })
  });

  response = await loginRoute(req);
  data = await response.json();
  
  if (response.status !== 401 || data.error !== 'Invalid credentials') {
    throw new Error("Test 2 Failed: Did not return 401 Invalid credentials");
  }
  console.log("✅ Test 2 Passed");

  // Test 3: JWT Parsing validation
  console.log("Test 3: should correctly verify manually signed JWTs...");
  const payload = { userId: "user-1234", email: "test@synctracker.app" };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const decoded = jwt.verify(token, JWT_SECRET) as any;

  if (decoded.userId !== "user-1234" || decoded.email !== "test@synctracker.app") {
    throw new Error("Test 3 Failed: Invalid JWT Decode");
  }
  console.log("✅ Test 3 Passed");

  console.log("🎉 All Auth Tests Passed Successfully.");
}

runTests()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Test Failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
