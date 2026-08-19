require('dotenv').config();

const connectDb = require('./config/db');
const User = require('./models/User');
const Task = require('./models/Task');

async function seed() {
  await connectDb();
  await Promise.all([User.deleteMany({}), Task.deleteMany({})]);

  const [manager, lead, employee] = await User.create([
    {
      username: 'Manager User',
      email: 'manager@example.com',
      password: 'password123',
      role: 'Manager'
    },
    {
      username: 'Team Lead User',
      email: 'lead@example.com',
      password: 'password123',
      role: 'Team Lead'
    },
    {
      username: 'Employee User',
      email: 'employee@example.com',
      password: 'password123',
      role: 'Employee'
    }
  ]);

  employee.teamLead = lead._id;
  await employee.save();

  await Task.create([
    {
      title: 'Prepare sprint board',
      description: 'Review open work and organize upcoming sprint tasks.',
      status: 'pending',
      createdBy: manager._id,
      assignedTo: lead._id
    },
    {
      title: 'Update task API',
      description: 'Add role-scoped task filters and assignment checks.',
      status: 'completed',
      createdBy: lead._id,
      assignedTo: employee._id
    }
  ]);

  console.log('Seed complete');
  console.log('manager@example.com / password123');
  console.log('lead@example.com / password123');
  console.log('employee@example.com / password123');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
