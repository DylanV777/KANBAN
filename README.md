# RiwiFlow - Kanban Task Manager

RiwiFlow is a SPA task management app with role-based permissions, a Kanban board and JSON Server persistence.

## Roles

| Role | Permissions |
| --- | --- |
| Admin | Create, edit and delete tasks. Add, edit and delete users. View the full board. |
| Coder | View all tasks. Edit description/status only for assigned tasks. Move assigned tasks on the board. |

## Features

- Login with email and password.
- Session persistence with `localStorage`.
- Internal SPA navigation between Board and Team views.
- Kanban columns: Todo, In Progress, In Review and Done.
- Drag and drop task movement without full page reload.
- Current user name, email and role visible inside the app.
- Task cards show assigned user and task status.
- Admin user management: add, edit and delete users.
- Admin task management: create, edit, delete and assign tasks.
- Coder restriction: no task creation, no deletion and no edits on tasks assigned to other users.

## Project Structure

```bash
kanban-project/
|-- index.html
|-- app.js
|-- db.json
|-- Readme.md
```

## Run the Backend

```bash
npx json-server --watch db.json --port 5000
```

Server URL:

```bash
http://localhost:5000
```

Endpoints:

```bash
/users
/tasks
```

## Run the Frontend

Open `index.html` with Live Server or any static web server.

Example:

```bash
npx live-server
```

## Login Credentials

Admin:

```bash
Email: admin@riwiflow.com
Password: admin123
```

Coder:

```bash
Email: coder01@riwiflow.com
Password: coder123
```

## Database Shape

```json
{
  "users": [
    {
      "id": "1",
      "name": "Jefferson Cacerez",
      "email": "admin@riwiflow.com",
      "password": "admin123",
      "role": "admin"
    }
  ],
  "tasks": [
    {
      "id": "1",
      "title": "Design onboarding flow",
      "description": "Define the first version of the product onboarding experience.",
      "status": "todo",
      "userId": "2"
    }
  ]
}
```

## Acceptance Evidence

- Admin can create, edit and delete users from the Team view.
- Admin can create, edit, delete and assign tasks.
- Coder can only edit or move assigned tasks.
- Moving a task updates the DOM and persists the change with `PATCH` without reloading the page.
- The logged-in user and role badge are visible in the sidebar.
