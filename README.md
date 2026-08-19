# MEAN Task Management Application

A role-aware task management app built with Angular, Express, MongoDB, and JWT authentication.

## Features

- User registration and login with JWT.
- Roles: `Manager`, `Team Lead`, and `Employee`.
- Manager can view all users, update roles/team leads, create tasks, edit tasks, delete tasks, and assign/reassign tasks to anyone.
- Team Lead can view and assign tasks to themself or employees assigned to them.
- Employee can create, edit, complete, and delete their own tasks. New employee tasks are assigned to the employee automatically.
- Task CRUD with status filtering for `pending` and `completed`.
- Responsive Angular interface with modal task forms, confirmation dialogs, form validation, and toast notifications.
- Real-time task/user refresh with Socket.IO. Updates made by an employee are reflected for their team lead and manager through the normal role-scoped API reload.

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The API and Socket.IO server run at `http://localhost:3000` by default.

Set `MONGODB_URI` in `backend/.env` if your MongoDB instance is not running at `mongodb://127.0.0.1:27017/mean-task-manager`.

Optional seed users:

```bash
cd backend
npm run seed
```

Seed credentials:

- `manager@example.com` / `password123`
- `lead@example.com` / `password123`
- `employee@example.com` / `password123`

For a real empty database, create the first manager without deleting existing data:

```bash
cd backend
# set FIRST_MANAGER_USERNAME, FIRST_MANAGER_EMAIL, and FIRST_MANAGER_PASSWORD in .env
npm run bootstrap:manager
```

After the first manager exists, log in as that manager and use the People section to promote users to `Manager`, `Team Lead`, or `Employee`.

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`.

## API Summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/users/assignable`
- `GET /api/users/team-leads-with-tasks`
- `PATCH /api/users/:id`
- `GET /api/tasks`
- `GET /api/tasks/stats`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
