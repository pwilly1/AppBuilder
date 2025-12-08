# Apptura

Apptura is a low-code app creation platform that lets users visually design, configure, and deploy mobile apps without writing extensive code.  
It uses a React + Tailwind front end, a Node.js/Express backend, and integrates AI to generate layouts and components.  
A live preview keeps edits visible in real time.

---

## Features

- Visual App Editor – Drag-and-drop layout editing with configurable components  
- Template Library – Start from pre-built app templates such as e-commerce, education, or fitness  
- Live Preview – Real-time view that mirrors a mobile app  
- AI-Assisted Builder – Generate screens and components from prompts  
- Backend Integration – CRUD APIs for projects, templates, and users  
- User Dashboard – Manage projects and template selections  
- Responsive UI – Tailwind CSS for adaptive layouts  

---

## Tech Stack

| Layer     | Technology |
|-----------|-------------|
| Frontend  | React, Vite, Tailwind CSS |
| Backend   | Node.js, Express |
| Database  | MongoDB (Mongoose) |
| Auth      | JWT |
| AI        | OpenAI API |
| Preview   | React Native (live preview) |


---

## Prerequisites

- Node.js (LTS recommended)  
- npm or yarn  
- MongoDB (local or Atlas)  
- OpenAI API key (optional, for AI features)


---

## How It Works

1. User creates a project → stored in MongoDB via Express API  
2. AI service can generate layouts or components  
3. React editor updates a live preview  
4. User exports or deploys the configured app  

---

## API Overview (So Far)

| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/projects` | Get all user projects |
| POST | `/api/projects` | Create new project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/ai/generate` | Generate component or layout (AI) |


---

## Contributing

1. Fork the repository  
2. Create a new branch: `git checkout -b feature/my-feature`  
3. Commit changes: `git commit -m "Add new feature"`  
4. Push to your fork: `git push origin feature/my-feature`  
5. Open a Pull Request  

---

## License

Licensed under the MIT License.  
See the `LICENSE` file for details.

---

## Author

**Preston Willis**  
GitHub: [https://github.com/pwilly1](https://github.com/pwilly1)  
Email: prwillis2@gmail.com
