# OFSTED Prep – Backend

This is the backend service for the OFSTED Compliance and Preparation system. It powers audit checklists, staff compliance tracking, document management, and role-based access for admins, staff, and readonly users.

---

## 🚀 Features

- **User Management**
  - Role-based access control (Admin, Staff, Readonly)
  - Staff-specific data including training, employment history, and DBS details

- **Audit Checklist**
  - Create, update, assign, and track checklist items
  - Upload up to 3 evidence documents per item
  - Role-based restrictions (e.g., staff can only upload/view their own)

- **Policy Management**
  - Upload, assign, and manage compliance documents
  - Staff acknowledgment tracking (one acknowledgment per policy per user)

- **Training Certificates & Employment History**
  - Store up to 3 training records and 3 employment history items per staff
  - Editable via API endpoints

- **Document Storage**
  - All uploaded files are stored on the backend (PDF, Word, max 5MB)
  - API to retrieve and serve documents securely

- **Cron & Alerts**
  - Auto-check and alert on upcoming or expired DBS and training deadlines

- **Settings Management**
  - Global application settings stored via API
  - Admins can update policy categories, roles, and checklist categories

- **Activity Logging**
  - Internal logging for user actions, changes, and policy updates (coming soon)

---

## 🛠 Tech Stack

- **Node.js** + **Express.js**
- **Prisma ORM** with PostgreSQL
- **Multer** for file uploads
- **Zod** / validation
- **JWT** for authentication (middleware-based)
- File storage: Local (e.g., `/documents/audit` and `/documents/policies`)

---

## 📦 Installation Instructions

1. **Clone the Project**
   ```bash
   git clone https://github.com/prince-akabari/ofsted-backend.git
   cd ofsted-backend
