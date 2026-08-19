require('dotenv').config();

const connectDb = require('./config/db');
const User = require('./models/User');

const DEFAULT_USERNAME = 'Manager User';
const DEFAULT_EMAIL = 'manager@example.com';

async function bootstrapManager() {
  await connectDb();

  const username = process.env.FIRST_MANAGER_USERNAME || DEFAULT_USERNAME;
  const email = (process.env.FIRST_MANAGER_EMAIL || DEFAULT_EMAIL).toLowerCase().trim();
  const password = process.env.FIRST_MANAGER_PASSWORD;

  if (!password || password.length < 6) {
    throw new Error('FIRST_MANAGER_PASSWORD is required and must be at least 6 characters');
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    if (existingUser.role !== 'Manager') {
      existingUser.role = 'Manager';
      existingUser.teamLead = null;
      await existingUser.save();
      console.log(`Updated existing user ${email} to Manager`);
    } else {
      console.log(`Manager already exists for ${email}`);
    }

    return;
  }

  await User.create({
    username,
    email,
    password,
    role: 'Manager',
    teamLead: null
  });

  console.log(`Created first manager: ${email}`);
}

bootstrapManager()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
