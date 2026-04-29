# 🛡️ Sentinel-Pass — Secure Authentication & Attack Prevention System

Sentinel-Pass is a production-ready, security-first authentication system built with Node.js and Express. It implements industry-standard protection against common web vulnerabilities, including brute-force attacks, credential stuffing, and session hijacking.

![Sentinel-Pass Preview](./shield_auth_preview.png)

## 🌟 Overview

Sentinel-Pass provides a robust foundation for applications requiring high-security authentication. It combines a sleek, modern frontend with a hardened backend that prioritizes user data protection and system integrity.

## 🔐 Security Features

- **🚀 Brute-Force Protection**: 
  - Implementation of `express-rate-limit` to prevent automated login attempts.
  - Exponential backoff strategy for failed login attempts.
- **🔒 Account Lockout Policy**: 
  - Automatically locks accounts after 5 consecutive failed attempts for 15 minutes.
  - Protects against credential stuffing and distributed brute-force attacks.
- **🔑 Secure Password Hashing**: 
  - Uses `bcryptjs` with a cost factor of 12.
  - Ensures passwords are never stored in plain text and are resistant to rainbow table attacks.
- **🎫 JWT Authentication**: 
  - Stateless authentication using JSON Web Tokens.
  - Short-lived tokens with secure signing keys.
- **🛡️ XSS & Security Headers**: 
  - Integrated with `Helmet.js` to set 15+ secure HTTP headers (HSTS, CSP, etc.).
  - Protects against Cross-Site Scripting (XSS) and Clickjacking.
- **✅ Input Validation**: 
  - Strict sanitization and validation of all user inputs using `validator.js`.
  - Prevents SQL Injection (via SQLite parameterized queries) and other injection attacks.
- **🌐 CORS Protection**: 
  - Restricted resource sharing to authorized origins only.

## 🛠️ Technical Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (Lightweight, zero-config, high performance)
- **Security**: 
  - `bcryptjs` (Hashing)
  - `jsonwebtoken` (Auth)
  - `express-rate-limit` (Throttling)
  - `helmet` (Hardening)
- **Frontend**: Vanilla JS, Modern CSS (Glassmorphism), Responsive Design.

## 📂 Project Structure

```text
Sentinel-Pass/
├── src/
│   ├── app.js           # Main Entry Point & Middleware Config
│   ├── middleware/      # Rate-limiting, Auth guards, & Error Handlers
│   ├── routes/          # API Route Definitions
│   ├── services/        # Business Logic & DB Interaction
│   └── config/          # Environment & Database Config
├── public/              # Frontend Assets (HTML, CSS, JS)
├── .env                 # Sensitive Configurations (JWT Secret, Port)
├── auth.db              # SQLite Database File
└── package.json         # Project Dependencies & Scripts
```

## 💻 Quick Start & Commands

Follow these steps to get the project running locally:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v16+) installed.

### 2. Setup
Clone the repository and install dependencies:
```bash
git clone https://github.com/yourusername/Sentinel-Pass.git
cd Sentinel-Pass
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
JWT_SECRET=your_super_long_random_secret_key_here
NODE_ENV=development
```

### 4. Running the Application
**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

## 📈 API Documentation

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login and receive JWT | No |
| GET | `/api/auth/profile` | Access user dashboard | Yes (Bearer Token) |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Developed by [Your Name/Github]*
