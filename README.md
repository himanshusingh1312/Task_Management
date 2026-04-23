# TaskFlow - Task Management Frontend

TaskFlow is a modern task management web app built with Next.js. It helps teams and individuals organize projects, create tasks, track progress, monitor overdue work, and manage workload with a clean and responsive UI.

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Axios
- MongoDB-backed API routes (inside `app/api`)

## Core Functionality

- User authentication (register, login, logout)
- Protected routes using `PrivateRoute`
- Project management:
  - Create project
  - View all projects
  - Delete project
  - See project-level completion progress
- Task management inside each project:
  - Create task with title, description, priority, and due date
  - Update task status (`todo`, `in-progress`, `completed`)
  - Delete task
  - Search by task title/description
  - Filter by status
  - Paginated task listing
- Task analytics:
  - Total, todo, in-progress, completed, overdue counters
  - Overdue indicator in navbar
- Dark mode toggle

## Project Structure

```text
my-app/
|- app/
|  |- login/
|  |- register/
|  |- dashboard/
|  |- projects/[projectId]/tasks/
|  |- api/
|  |  |- auth/
|  |  |- projects/
|- components/
|  |- Navbar.tsx
|  |- PrivateRoute.tsx
|- context/
|  |- AuthContext.tsx
|  |- ThemeContext.tsx
|- lib/
|  |- axios.ts
|  |- auth.ts
|  |- mongodb.ts
|- models/
|  |- User.ts
|  |- Project.ts
|  |- Task.ts
```

## Prerequisites

- Node.js 18+ (recommended LTS)
- npm (or pnpm/yarn/bun)
- MongoDB connection string
- JWT secret

## Environment Variables

Create a `.env.local` file in `my-app` and configure:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

> `NEXT_PUBLIC_API_URL` should point to your API base path.

## Installation and Run

```bash
cd my-app
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## App Routes

- `/login` - Sign in page
- `/register` - Sign up page
- `/dashboard` - Project overview
- `/projects/[projectId]/tasks` - Task board/list for a single project

`/` redirects to `/login`.

## API Endpoints (Current)

### Auth
- `POST /api/auth/register` - Create user
- `POST /api/auth/login` - Login user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `DELETE /api/projects/[projectId]` - Delete project

### Tasks
- `GET /api/projects/[projectId]/tasks` - List tasks (supports page, limit, status, search)
- `POST /api/projects/[projectId]/tasks` - Create task
- `PUT /api/projects/[projectId]/tasks/[taskId]` - Update task (status/details)
- `DELETE /api/projects/[projectId]/tasks/[taskId]` - Delete task

## UI Notes

- Built with a responsive, card-based layout
- Shared input/button utility classes in `app/globals.css`
- Subtle transitions, hover states, and skeleton placeholders for loading states
- Dark mode support with class-based theme toggling

## Scripts

```bash
npm run dev     # run local development server
npm run build   # production build
npm run start   # start production server
npm run lint    # run lint checks
```

## Future Improvements

- Edit project details
- Full task edit modal
- Drag-and-drop status board
- User profile settings
- Unit and integration test coverage
