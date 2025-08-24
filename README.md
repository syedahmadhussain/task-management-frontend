# Task Management System - Frontend

A modern task management application built with React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd task-management-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file for development:
   ```bash
   # Development Environment
   VITE_API_URL=http://localhost:8000/api
   VITE_REVERB_APP_KEY=local
   VITE_REVERB_HOST=localhost
   VITE_REVERB_PORT=6001
   VITE_REVERB_SCHEME=ws
   ```

   For production, use the existing `.env.production` file or update it with your production URLs.

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # API services and utilities
├── types/              # TypeScript type definitions
├── utils/              # Helper utilities
└── main.tsx           # Application entry point
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Development | Production |
|----------|-------------|-------------|-------------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000/api` | Your production API URL |
| `VITE_REVERB_APP_KEY` | WebSocket app key | `local` | Your production key |
| `VITE_REVERB_HOST` | WebSocket host | `localhost` | Your production host |
| `VITE_REVERB_PORT` | WebSocket port | `6001` | `443` (for HTTPS) |
| `VITE_REVERB_SCHEME` | WebSocket scheme | `ws` | `https` |

### Backend Setup

This frontend requires a Laravel backend API. Make sure your backend is running and accessible at the URL specified in `VITE_API_URL`.

## 🚀 Deployment

### Production Build

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder**
   
   Upload the generated `dist` folder to your web server or hosting platform.

### Popular Deployment Options

- **Vercel**: Connect your repository and deploy automatically
- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **Static hosting**: Upload `dist` folder to any static hosting service

## 🛠️ Development

### Code Quality

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Code linting and formatting
- **Tailwind CSS**: Utility-first CSS framework

### Key Features

- ✅ **User Authentication** - Login/logout functionality
- ✅ **Task Management** - Create, edit, delete, and update tasks
- ✅ **Project Management** - Organize tasks within projects
- ✅ **Real-time Updates** - Live updates via WebSocket
- ✅ **Role-based Access** - Admin, Manager, and Member roles
- ✅ **Responsive Design** - Works on desktop and mobile
- ✅ **Type Safety** - Full TypeScript implementation

## 📱 Usage

1. **Login** with your credentials
2. **Dashboard** - View overview of tasks and projects
3. **Tasks** - Create, edit, and manage tasks
4. **Projects** - Create and manage projects
5. **Real-time** - See updates instantly across all users

## 🔒 User Roles

- **Admin**: Full access to all features
- **Manager**: Manage projects and tasks
- **Member**: View and update assigned tasks

## 🐛 Troubleshooting

### Common Issues

**Build Errors**: Make sure all TypeScript errors are resolved
```bash
npm run build
```

**API Connection Issues**: Check your `.env` file and backend URL
```bash
# Verify your backend is running at the specified URL
curl http://localhost:8000/api/health
```

**WebSocket Issues**: Ensure Reverb/WebSocket server is running and accessible

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support and questions, please contact the development team.

---

**Built with ❤️ using React + TypeScript + Tailwind CSS**
