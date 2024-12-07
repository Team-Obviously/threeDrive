from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from typing import Dict, Set
import json

app = FastAPI()

# Mount the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Store active connections and document state
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.document_contents: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, document_id: str):
        await websocket.accept()
        if document_id not in self.active_connections:
            self.active_connections[document_id] = set()
            self.document_contents[document_id] = ""
        self.active_connections[document_id].add(websocket)
        # Send current document state to new connection
        await websocket.send_text(json.dumps({
            "type": "content",
            "content": self.document_contents[document_id]
        }))

    def disconnect(self, websocket: WebSocket, document_id: str):
        self.active_connections[document_id].remove(websocket)
        if not self.active_connections[document_id]:
            del self.active_connections[document_id]
            del self.document_contents[document_id]

    async def broadcast(self, message: str, document_id: str):
        if document_id in self.active_connections:
            for connection in self.active_connections[document_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@app.get("/")
async def get():
    return {"message": "WebSocket server is running"}

@app.websocket("/ws/{document_id}")
async def websocket_endpoint(websocket: WebSocket, document_id: str):
    await manager.connect(websocket, document_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Update document content
            if message["type"] == "content":
                manager.document_contents[document_id] = message["content"]
                # Broadcast to all clients except sender
                for connection in manager.active_connections[document_id]:
                    if connection != websocket:
                        await connection.send_text(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, document_id)
        if document_id in manager.active_connections:
            await manager.broadcast(
                json.dumps({
                    "type": "system",
                    "message": "A user has left the document"
                }),
                document_id
            )
