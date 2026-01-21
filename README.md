
# Site Builder

This is a full-stack web application that allows users to create, manage, and publish websites. It features a React-based frontend, a Node.js/Express backend, and a PostgreSQL database. Users can purchase credits to create projects, and the application uses AI to assist in website generation.

## Tech Stack

### Frontend

- **Framework:** React with Vite
- **UI:** Tailwind CSS, Lucide React, Sonner
- **Routing:** React Router DOM
- **HTTP Client:** Axios
- **Authentication:** better-auth
- **TypeScript**

### Backend

- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** better-auth
- **Payments:** Stripe
- **AI:** OpenAI
- **TypeScript**

### Database

- **PostgreSQL**

## Features

- User authentication and authorization
- Create, manage, and publish website projects
- AI-assisted website generation
- Credit-based system for project creation
- Project versioning and rollbacks
- Stripe integration for payments
- Community page to view published projects

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- PostgreSQL

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   ```
2. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   ```
3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```
4. **Set up environment variables**
   - In the `client` directory, create a `.env` file and add the necessary environment variables.
   - In the `server` directory, create a `.env` file and add the following:
     ```
     DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
     DIRECT_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
     TRUSTED_ORIGINS="http://localhost:5173"
     ```
5. **Apply database migrations**
   ```bash
   cd server
   npx prisma migrate dev
   ```

### Running the application

#### Frontend

```bash
cd client
npm run dev
```

#### Backend

```bash
cd server
npm run server
```

## Folder Structure

```
.
├── client
└── server
```

## Available Scripts

### Frontend

- `dev`: Runs the app in the development mode.
- `build`: Builds the app for production.
- `lint`: Lints the code.
- `preview`: Previews the production build.

### Backend

- `start`: Starts the server.
- `server`: Starts the server in development mode with hot-reloading.
- `build`: Compiles the TypeScript code.

## API Endpoints

A brief description of the available API endpoints.

- `GET /`: Server status.
- `POST /api/auth/{*any}`: Authentication endpoint.
- `POST /api/stripe`: Stripe webhook endpoint.

### User Routes (`/api/user`)

- `GET /credits`: Get user credits.
- `POST /project`: Create a new project for the user.
- `GET /project/:projectId`: Get a specific project for the user.
- `GET /projects`: Get all projects for the user.
- `GET /publish-toggle/:projectId`: Toggle the publish status of a project.
- `POST /purchase-credits`: Purchase credits.

### Project Routes (`/api/project`)

- `POST /revision/:projectId`: Make a revision of a project.
- `PUT /save/:projectId`: Save the project code.
- `GET /rollback/:projectId/:versionId`: Rollback to a specific version of a project.
- `DELETE /:projectId`: Delete a project.
- `GET /preview/:projectId`: Get a project preview.
- `GET /published`: Get all published projects.
- `GET /published/:projectId`: Get a published project by its ID.
