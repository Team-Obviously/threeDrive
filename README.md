# ThreeDrive - Decentralized File Storage System

ThreeDrive is a decentralized file storage and collaboration platform built with blockchain technology, offering a familiar Google Drive-like experience with enhanced security and decentralization.

## Project Structure

The project consists of three main components:

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16
- MongoDB
- Python 3.8+
- Yarn or npm

### API Server (Express + MongoDB)

#### Features

- 📁 File & folder management
- 👥 User collaboration
- 🔐 Authentication & authorization
- 🔍 File search functionality
- 📊 File metadata management

#### Environment Variables (.env)

PORT=8007
MONGODB_URI=mongodb://localhost:27017/threedrive
NODE_ENV=development

### Client (Next.js)

bash
cd client/packages/nextjs
yarn install
yarn dev

#### Features

- 🖥 Modern UI with real-time updates
- 📱 Responsive design
- 🔄 Drag & drop file upload
- 📂 Folder navigation
- 🤝 Collaboration tools
- 🔍 File search

#### Environment Variables (.env)

env
NEXT_PUBLIC_API_URL=http://localhost:8007/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

### Socket Server (Python)

bash
cd socket
pip install -r requirements.txt
python main.py

#### Features

- 🔄 Real-time file updates
- 👥 Collaborative editing
- 📡 WebSocket connections
- 🔔 Real-time notifications

## 🔧 Technical Stack

### API

- Express.js
- MongoDB
- TypeScript
- Passport.js
- Morgan for logging

### Client

- Next.js 13+
- TypeScript
- TailwindCSS
- Shadcn UI
- Axios

### Socket

- Python
- WebSocket
- Flask

## 📦 Walrus SDK

Our custom SDK for interacting with the Walrus platform:

### Usage

typescript
import { WalrusSDK } from '@hibernuts/walrus-sdk';
const walrus = new WalrusSDK({
aggregator: "https://aggregator.walrus-testnet.walrus.space",
publisher: "https://publisher.walrus-testnet.walrus.space",
apiUrl: "http://localhost:8007/api"
});

## 🌟 Features

- **File Management**

  - Upload/download files
  - Create folders
  - Move files/folders
  - Search functionality

- **Collaboration**

  - Share files/folders
  - Real-time updates
  - Access control
  - User permissions

- **Security**
  - Encrypted file storage
  - Secure authentication
  - Access control lists

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 👥 Team

- [Arya Nair](https://github.com/Arya-a-nair)
- [Viraj Bhartiya](https://github.com/virajbhartiya)
- [Raghav Jindal](https://github.com/hibernuts)
