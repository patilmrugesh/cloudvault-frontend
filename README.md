# CloudVault Frontend — Modern Secure Cloud Storage & AI Document Assistant

A responsive, high-performance web client for **CloudVault** built with **React 19**, **TypeScript**, and **Vite**. Features end-to-end encrypted chunked uploads, real-time file transfer monitoring, and a fully featured **Document AI & RAG Assistant** with token streaming and conversational history.

---

## 🌟 Key Features

### 1. 🤖 Document AI & RAG Intelligence
- **Real-Time Token Streaming**: Server-Sent Events (SSE) stream parser that renders AI responses token-by-token with zero lag.
- **Rich Markdown Formatting**: Complete Markdown styling with code blocks, bullet points, bold emphasis, and tables via `react-markdown` and `remark-gfm`.
- **Three Dedicated Intelligence Modes**:
  - 📋 **Executive Summary**: Synthesizes long documents into concise overviews.
  - 📝 **Detailed Study Notes**: Structured, formatted breakdown with key takeaways and definitions.
  - 💬 **Interactive Q&A**: Asks any natural-language question grounded directly in the file's indexed chunks.
- **Conversation & Interaction History**:
  - Dedicated **History Tab** inside the AI modal.
  - Displays chronological list of previous prompts, summaries, and responses.
  - One-click copy to clipboard for any AI output.
  - Seamless switching between active prompts and prior interactions.

### 2. ⚡ Resilient File Management & Upload Pipeline
- **Parallel Chunked Transfers**: Breaks large files into chunks and uploads them with real-time percentage indicators.
- **Chunk Deduplication Feedback**: Immediate visual cues when uploaded chunks match existing hashes.
- **Secure File Sharing**: Modal for creating signed, expiration-controlled share links.
- **Search & Sort**: Filter files by name, file size, or date modified in ascending or descending order.

### 3. 🎨 Modern Design System & Component Suite
- **Tailored Component Architecture**: Custom reusable components including `Button`, `IconButton`, `Modal`, `Badge`, `Checkbox`, `Skeleton`, `ConfirmDialog`, `Input`, and `EmptyState`.
- **Toast Notification System**: Global decoupled context for animated success, error, info, and warning notifications.
- **Modern Dark UI Aesthetics**: Clean dark palette, high contrast, smooth transitions, and iconography via `lucide-react`.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | Modern reactive user interface library |
| **TypeScript** | Type safety and developer experience |
| **Vite** | Fast HMR dev server and optimized production bundler |
| **Lucide React** | Modern, consistent icon library |
| **React Markdown & Remark GFM** | Streaming markdown parsing and rendering |
| **Axios & Fetch API** | REST API calls & SSE streaming reader |
| **Docker & Docker Compose** | Multi-stage containerized deployment |

---

## 📁 Directory Structure

```text
src/
├── components/
│   ├── ui/                    # Reusable design system primitives
│   │   ├── Badge.tsx          # Status indicators (e.g. AI Ready, Processing)
│   │   ├── Button.tsx         # Primary, secondary, outline & danger buttons
│   │   ├── Checkbox.tsx       # Custom styled checkbox input
│   │   ├── ConfirmDialog.tsx  # Deletion and critical action modal
│   │   ├── EmptyState.tsx     # Zero-data visual placeholders
│   │   ├── IconButton.tsx     # Accessible icon action buttons
│   │   ├── Input.tsx          # Text and search input controls
│   │   ├── Modal.tsx          # Accessible overlay modal wrapper
│   │   └── Skeleton.tsx       # Shimmer loading placeholders
│   ├── DocumentAiModal.tsx    # RAG assistant, streaming output & history tab
│   ├── FileIcon.tsx           # Contextual file extension icons
│   ├── Layout.tsx             # Navbar, sidebar, and layout shell
│   └── ShareModal.tsx         # File link generator with expiration options
├── context/
│   ├── AuthContext.tsx        # Authentication token and user state
│   ├── ToastContext.tsx       # Global toast notification provider
│   ├── useAuth.ts             # Auth hook shortcut
│   └── useToast.ts            # Toast hook shortcut
├── pages/
│   ├── Dashboard.tsx          # File table, upload panel, and RAG trigger
│   ├── Login.tsx              # User login screen
│   └── Register.tsx           # User registration screen
├── services/
│   ├── api.ts                 # Axios instance with JWT interceptor
│   └── ai.ts                  # Document AI API service wrapper
├── utils/
│   └── formatters.ts          # File size (bytes to MB/GB), dates, string truncate
├── App.tsx                    # Route definitions and provider composition
├── main.tsx                   # Application entry point
└── index.css                  # Global styles, variables, and animations
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js 18+** or **20+**
- **npm** or **pnpm** / **yarn**
- Running **CloudVault Backend** at `http://localhost:8080`

### 2. Installation
```bash
cd cloudvault-frontend
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
npm run preview
```

---

## 🐳 Docker Setup

A multi-stage `Dockerfile` and `compose.yaml` are included for deploying behind Nginx:

```bash
# Build and run with Docker Compose
docker compose up -d --build
```

---

## 👤 Author
**Mrugesh Patil**
- Frontend & Full-Stack Developer | Applied AI & Security Enthusiast
