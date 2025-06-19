// Constants
const TOKEN_KEY = 'notenexus_token';
const USER_KEY = 'notenexus_user';
const NOTES_KEY = 'notenexus_notes';

// DOM Elements
const noteEditor = document.getElementById('noteEditor');
const createNewNoteBtn = document.getElementById('createNewNoteBtn');
const notesContainer = document.getElementById('notesContainer');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const summaryContent = document.getElementById('summaryContent');
const recordBtn = document.getElementById('recordBtn');
const recordingStatus = document.getElementById('recordingStatus');
const generateSummaryBtn = document.getElementById('generateSummaryBtn');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const cancelBtn = document.getElementById('cancelBtn');
const confirmDeleteModal = document.getElementById('confirmDeleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userNameDisplay = document.getElementById('userNameDisplay');
const userName = document.getElementById('userName');

// Global variables
let mediaRecorder;
let audioChunks = [];
let currentNoteId = null;
let isRecording = false;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    feather.replace();
    setupEventListeners();
    loadUserNotes();
});

// Authentication check
function checkAuth() {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
    
    if (!token || !user) {
        window.location.href = '/index.html';
        return;
    }

    // Update UI with user information
    userNameDisplay.textContent = user.name;
    userName.textContent = user.name;
}

// Event Listeners
function setupEventListeners() {
    createNewNoteBtn.addEventListener('click', toggleNoteEditor);
    recordBtn.addEventListener('click', toggleRecording);
    generateSummaryBtn.addEventListener('click', generateSummary);
    saveNoteBtn.addEventListener('click', saveNote);
    cancelBtn.addEventListener('click', cancelNote);
    confirmDeleteBtn.addEventListener('click', deleteNote);
    cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    logoutBtn.addEventListener('click', logout);
}

// Load user's notes
function loadUserNotes() {
    try {
        const user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
        const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
        const userNotes = allNotes.filter(note => note.userId === user.id);
        displayNotes(userNotes);
    } catch (error) {
        showNotification('Error loading notes', 'error');
    }
}

// Display notes in grid
function displayNotes(notes) {
    notesContainer.innerHTML = '';

    if (notes.length === 0) {
        notesContainer.innerHTML = `
            <div class="empty-notes">
                <i data-feather="book"></i>
                <p>You don't have any notes yet</p>
                <button class="btn-primary" onclick="toggleNoteEditor()">
                    <i data-feather="plus-circle"></i>
                    Create Your First Note
                </button>
            </div>
        `;
        feather.replace();
        return;
    }

    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.innerHTML = `
            <h3>${note.title}</h3>
            <p>${note.content}</p>
            ${note.summary ? `<div class="note-summary"><strong>Summary:</strong> ${note.summary}</div>` : ''}
            <div class="note-actions">
                <button onclick="editNote('${note.id}')" class="btn-icon">
                    <i data-feather="edit-2"></i>
                </button>
                <button onclick="showDeleteModal('${note.id}')" class="btn-icon danger">
                    <i data-feather="trash-2"></i>
                </button>
            </div>
        `;
        notesContainer.appendChild(noteCard);
    });
    feather.replace();
}

// Toggle note editor
function toggleNoteEditor() {
    noteEditor.style.display = noteEditor.style.display === 'none' ? 'block' : 'none';
    createNewNoteBtn.style.display = noteEditor.style.display === 'none' ? 'block' : 'none';
    resetNoteForm();
}

// Reset note form
function resetNoteForm() {
    currentNoteId = null;
    noteTitle.value = '';
    noteContent.value = '';
    summaryContent.innerHTML = '';
    recordingStatus.innerHTML = '';
}

// Recording functions
async function toggleRecording() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

                // Upload audio blob to backend for transcription
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.wav');

                recordingStatus.innerHTML = 'Uploading audio for transcription...';

                try {
                    const token = localStorage.getItem(TOKEN_KEY);
                    const response = await fetch('/api/notes/upload-audio', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error('Failed to upload audio');
                    }

                    const data = await response.json();

                    // Update note content with transcription
                    noteContent.value += (noteContent.value ? '\n' : '') + data.transcription;

                    // Automatically generate summary from transcription
                    recordingStatus.innerHTML = 'Generating summary...';

                    const summaryResponse = await fetch('/api/notes/summarize', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            text: data.transcription,
                            title: noteTitle.value || 'Untitled'
                        })
                    });

                    if (!summaryResponse.ok) {
                        throw new Error('Failed to generate summary');
                    }

                    const summaryData = await summaryResponse.json();

                    summaryContent.innerHTML = `<strong>Summary:</strong> ${summaryData.summary}`;
                    recordingStatus.innerHTML = 'Transcription and summary completed successfully';
                    showNotification('Audio transcribed and summarized successfully', 'success');
                } catch (error) {
                    recordingStatus.innerHTML = '';
                    showNotification(error.message, 'error');
                }
            };

            mediaRecorder.start();
            isRecording = true;
            recordBtn.innerHTML = '<i data-feather="square"></i> Stop Recording';
            recordingStatus.innerHTML = '<span class="recording">Recording...</span>';
            feather.replace();
        } catch (error) {
            showNotification('Error accessing microphone', 'error');
        }
    } else {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        recordBtn.innerHTML = '<i data-feather="mic"></i> Start Recording';
        // recordingStatus.innerHTML = ''; // Will be updated in onstop
        feather.replace();
    }
}

// Generate summary
function generateSummary() {
    const content = noteContent.value.trim();
    if (!content) {
        showNotification('Please add some content first', 'info');
        return;
    }

    // Simple summarization logic (for demo without API)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const summary = sentences.slice(0, 2).join('. ') + '.';
    summaryContent.innerHTML = `<strong>Summary:</strong> ${summary}`;
    showNotification('Summary generated successfully', 'success');
}

// Save note
function saveNote() {
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    const summary = summaryContent.innerHTML.replace('<strong>Summary:</strong> ', '').trim();

    if (!title || !content) {
        showNotification('Please fill in all required fields', 'info');
        return;
    }

    try {
        const user = JSON.parse(localStorage.getItem(USER_KEY));
        const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
        
        if (currentNoteId) {
            // Update existing note
            const noteIndex = allNotes.findIndex(n => n.id === currentNoteId);
            if (noteIndex !== -1) {
                allNotes[noteIndex] = {
                    ...allNotes[noteIndex],
                    title,
                    content,
                    summary,
                    updatedAt: new Date().toISOString()
                };
            }
        } else {
            // Create new note
            const newNote = {
                id: Date.now().toString(),
                userId: user.id,
                title,
                content,
                summary,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            allNotes.push(newNote);
        }

        localStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
        showNotification('Note saved successfully', 'success');
        toggleNoteEditor();
        loadUserNotes();
    } catch (error) {
        showNotification('Error saving note', 'error');
    }
}

// Edit note
function editNote(noteId) {
    try {
        const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
        const note = allNotes.find(n => n.id === noteId);
        
        if (note) {
            currentNoteId = noteId;
            noteTitle.value = note.title;
            noteContent.value = note.content;
            summaryContent.innerHTML = note.summary ? `<strong>Summary:</strong> ${note.summary}` : '';
            
            noteEditor.style.display = 'block';
            createNewNoteBtn.style.display = 'none';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        showNotification('Error loading note', 'error');
    }
}

// Cancel note
function cancelNote() {
    toggleNoteEditor();
    resetNoteForm();
}

// Show delete modal
function showDeleteModal(noteId) {
    currentNoteId = noteId;
    confirmDeleteModal.style.display = 'flex';
}

// Hide delete modal
function hideDeleteModal() {
    confirmDeleteModal.style.display = 'none';
    currentNoteId = null;
}

// Delete note
function deleteNote() {
    if (!currentNoteId) return;

    try {
        const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
        const updatedNotes = allNotes.filter(note => note.id !== currentNoteId);
        localStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
        
        showNotification('Note deleted successfully', 'success');
        hideDeleteModal();
        loadUserNotes();
    } catch (error) {
        showNotification('Error deleting note', 'error');
    }
}

// Logout function
function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/index.html';
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i data-feather="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    feather.replace();

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
