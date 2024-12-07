from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from typing import Dict, Set, List
import json

app = FastAPI(port=7000)

# Mount the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

class Document:
    def __init__(self):
        self.content = ""
        self.users: Set[WebSocket] = set()
        self.history: List[dict] = []

class ConnectionManager:
    def __init__(self):
        self.documents: Dict[str, Document] = {}

    def get_or_create_document(self, document_id: str) -> Document:
        if document_id not in self.documents:
            self.documents[document_id] = Document()
        return self.documents[document_id]

    async def connect(self, websocket: WebSocket, document_id: str):
        await websocket.accept()
        document = self.get_or_create_document(document_id)
        document.users.add(websocket)
        
        # Send initial state
        await websocket.send_json({
            "type": "init",
            "content": document.content,
            "userCount": len(document.users)
        })
        
        # Notify others about new user
        await self.broadcast(document_id, {
            "type": "user_joined",
            "userCount": len(document.users)
        }, exclude=websocket)

    def disconnect(self, websocket: WebSocket, document_id: str):
        if document_id in self.documents:
            document = self.documents[document_id]
            document.users.remove(websocket)
            
            if not document.users:
                del self.documents[document_id]
                return 0
            return len(document.users)
        return 0

    async def broadcast(self, document_id: str, message: dict, exclude: WebSocket = None):
        if document_id in self.documents:
            document = self.documents[document_id]
            for connection in document.users:
                if connection != exclude:
                    await connection.send_json(message)

    def update_content(self, document_id: str, content: str):
        if document_id in self.documents:
            self.documents[document_id].content = content
            self.documents[document_id].history.append({
                "type": "content",
                "content": content
            })

manager = ConnectionManager()

@app.get("/")
async def get():
    return {"message": "WebSocket server is running"}

@app.websocket("/ws/{document_id}")
async def websocket_endpoint(websocket: WebSocket, document_id: str):
    await manager.connect(websocket, document_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "content":
                manager.update_content(document_id, data["content"])
                await manager.broadcast(
                    document_id,
                    {
                        "type": "content",
                        "content": data["content"],
                        "userCount": len(manager.documents[document_id].users)
                    },
                    exclude=websocket
                )
                
    except WebSocketDisconnect:
        user_count = manager.disconnect(websocket, document_id)
        if user_count > 0:
            await manager.broadcast(
                document_id,
                {
                    "type": "user_left",
                    "userCount": user_count
                }
            )
