const socket = io('http://localhost:8000');

const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.querySelector('.container');

const audio = new Audio('tone.mp3'); // Notification sound
let typingTimeout; // For typing indicator

// Function to Append Messages to Chat
const append = (message, position, timestamp = '') => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', position);

    // Add timestamp if provided
    messageElement.innerHTML = `<span>${message}</span> <small>${timestamp}</small>`;
    messageContainer.appendChild(messageElement);

    // Play notification sound only for incoming messages
    if (position === 'left') {
        audio.play().catch(error => console.log("Autoplay blocked:", error));
    }

    // Auto-scroll to the latest message
    messageContainer.scrollTop = messageContainer.scrollHeight;
};

// Ensure a valid username before joining
let userName;
while (!userName || userName.trim() === "") {
    userName = prompt("Enter Your Name to Join");
}
socket.emit('new-user-joined', userName);

// Load chat history from MongoDB when user joins
socket.on("chat-history", (messages) => {
    messages.forEach(msg => {
        append(`${msg.name}: ${msg.message}`, 'left', formatTimestamp(msg.timestamp));
    });
});

// Handle Message Sending
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message !== "") {
        const timestamp = new Date().toLocaleTimeString();  // Generate timestamp
        append(`You: ${message}`, 'right', timestamp);
        socket.emit('send', { message, timestamp });  // ✅ Send message with timestamp
        messageInput.value = ''; // Clear input
    }
});

// Typing Indicator
messageInput.addEventListener('input', () => {
    socket.emit('typing', userName);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop-typing', userName);
    }, 1000);
});

socket.on('display-typing', (name) => {
    document.getElementById('typing-indicator').innerText = `${name} is typing...`;
});

socket.on('remove-typing', () => {
    document.getElementById('typing-indicator').innerText = '';
});

// When a New User Joins
socket.on('user-joined', name => {
    append(`${name} joined the chat`, 'left');
});

// When Receiving a Message
socket.on('receive', data => {
    append(`${data.name}: ${data.message}`, 'left', formatTimestamp(data.timestamp));
});

// When a User Leaves
socket.on('user-left', name => {
    append(`${name} left the chat`, 'left');
});

// Function to Format Timestamp
// Function to Format Timestamp Properly
function formatTimestamp(timestamp) {
    if (!timestamp) return ''; // If timestamp is empty, return blank
    const dateObj = new Date(timestamp);

    // ✅ If `dateObj` is not a valid date, return `timestamp` directly
    if (isNaN(dateObj.getTime())) {
        return timestamp;  
    }

    return dateObj.toLocaleTimeString(); // ✅ Returns properly formatted time
}
