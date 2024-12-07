// Generate a random document ID if not provided in URL
const documentId = new URLSearchParams(window.location.search).get('doc') || 
    Math.random().toString(36).substring(2, 15);

// Update the document ID display
document.getElementById('document-id').textContent = documentId;

// Update URL with document ID without reloading
window.history.replaceState({}, '', `?doc=${documentId}`);

// WebSocket setup
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}/ws/${documentId}`);

const editor = document.getElementById('editor');
const statusElement = document.getElementById('connection-status');
let isConnected = false;
let lastReceivedContent = null;

// Debounce function to limit the rate of WebSocket messages
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Send editor content through WebSocket
const sendContent = debounce(() => {
    if (isConnected && editor.value !== lastReceivedContent) {
        const content = editor.value;
        ws.send(JSON.stringify({
            type: 'content',
            content: content
        }));
    }
}, 100);

// WebSocket event handlers
ws.onopen = () => {
    isConnected = true;
    statusElement.textContent = 'Connected';
    statusElement.style.color = '#28a745';
};

ws.onclose = () => {
    isConnected = false;
    statusElement.textContent = 'Disconnected';
    statusElement.style.color = '#dc3545';
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    statusElement.textContent = 'Error';
    statusElement.style.color = '#dc3545';
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'content') {
        lastReceivedContent = data.content;
        const currentCursor = editor.selectionStart;
        editor.value = data.content;
        editor.setSelectionRange(currentCursor, currentCursor);
    } else if (data.type === 'system') {
        console.log('System message:', data.message);
    }
};

// Editor event listeners
editor.addEventListener('input', sendContent);
editor.addEventListener('keyup', sendContent);

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
});
