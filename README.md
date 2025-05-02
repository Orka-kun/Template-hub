# Template Hub Project

## Overview

Welcome to the Template Hub project! This is a web-based application designed to create, manage, and share customizable templates/forms for various purposes such as quizzes, educational forms, and more. The project leverages a modern tech stack including React and Tailwind CSS for the frontend, Node/Express.js with Prisma for the backend, and PostgreSQL as the database, deployed on Render for scalability and accessibility.

## Features

### Working Features
- **User Authentication**: Log in and out with a secure token-based system after registration.
- **Template Creation**: Create new templates with custom fields (e.g., single-line text, multi-line text, positive integers, checkboxes).
- **Template Viewing**: View public templates or those shared with you on the home page, sorted by latest and most submitted.
- **Template Details**: Access detailed views of templates, including questions, forms submitted, comments, and likes (if accessible).
- **Form Submission**: Submit forms for templates you have access to, or submit forms from the home page (public templates).
- **Template Sharing**: Share templates with other users via their email addresses.

### Partially Working or Commented Features
- **Question Management**: Delete questions (limited to 4 per type); order update is functional but not fully tested.
- **Form Updates**: Update existing form submissions (works but lacks fixed user/date fields currently).
- **Dark Mode**: Working on dark mode/light mode toggle, but it has some issues.
- **Shared Templates**: Fetch templates shared with a user (works but requires valid user ID).

## Prerequisites

- **React**
- **Tailwind CSS**: Version 4.0
- **Node.js**: Version 18.x or later
- **npm**: Version 9.x or later
- **PostgreSQL**: Installed locally or accessible via Render's database URL
- **Git**: For cloning the repository

## Installation

### Clone the Repository
```bash
git clone https://github.com/Orka-kun/Template-hub.git
cd template-hub
```

### Backend Setup
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the `server` directory.
   - Add the following (replace with your values):
     ```
     DATABASE_URL=YOUR_POSTGRESQL_DATABASE_URL
     JWT_SECRET=your-secret-key
     ```
4. Run migrations to set up the database:
   ```bash
   npx prisma migrate dev
   ```
5. Start the backend:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the `client` directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the `client` directory.
   - Add the following (replace with your Render backend URL):
     ```
     VITE_API_URL=https://course-project-backend-el4d.onrender.com
     ```
4. Start the frontend:
   ```bash
   npm run dev
   ```

## Deployment

### Deploying on Render
1. **Fork or Push to GitHub**:
   - Push your code to a GitHub repository.
2. **Create Render Services**:
   - **Backend**: Set up a new Web Service, connect your GitHub repo, and set the build command to `npm install && npx prisma migrate deploy && npm start`. Use the `server` directory and provide the `DATABASE_URL` and `JWT_SECRET` as environment variables.
   - **Frontend**: Set up another Web Service, connect the same repo, and set the build command to `npm install && npm run build`. Use the `client` directory and provide `VITE_API_URL` as an environment variable.
3. **Database**:
   - Provision a PostgreSQL instance on Render, copy the `DATABASE_URL`, and use it in your backend environment variables.
4. **Launch**: Deploy both services and note the frontend URL (e.g., `https://course-project-frontend-wdt3.onrender.com`).

## Usage Instructions

### Accessing the Application
- Visit the deployed frontend URL (e.g., `https://course-project-frontend-wdt3.onrender.com`).
- Log in with credentials (initial setup requires a registered user; contact the developer for a test account if needed).

### Navigating the Interface
- **Home Page**: Displays the latest 6 templates and top 5 by submission count. Click a template title to view details.
- **Template Creation**: Navigate to `/templates/new` (if logged in) to create a new template. Fill in the title, description, topic, and fields.
- **Template Details**: View at `/templates/:id`. Submit forms, add comments, like, or duplicate if you have permission.
- **My Forms**: Go to `/forms` (if logged in) to see and edit your submissions.

### Permissions
- **Public Templates**: Accessible to all users.
- **Private Templates**: Only the creator or shared users can view/edit.

## Troubleshooting
- **401 Unauthorized**: Ensure your JWT token is valid; log out and log back in.
- **404 Not Found**: Check the template or form ID; it may have been deleted.
- **500 Server Error**: Check the server logs on Render or local console for details.
- **Rate Limit (429)**: Wait a few seconds and retry; the app throttles API calls.

## Contributing
- Fork the repository.
- Create a feature branch (`git checkout -b feature-name`).
- Commit changes (`git commit -m "Add feature"`).
- Push and open a pull request.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

## Contact
For issues or questions, open an issue on GitHub or contact the developer at `orkadas@gmail.com`.

## Acknowledgments
- Built with love using React, Node/Express, Prisma, and Render.
