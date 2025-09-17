class TextEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.status = document.getElementById('status');
        this.position = document.getElementById('position');
        this.fileInput = document.getElementById('fileInput');
        
        this.currentFile = null;
        this.undoStack = [];
        this.redoStack = [];
        this.isModified = false;
        
        this.initializeEventListeners();
        this.updateStatus('Ready');
    }
    
    initializeEventListeners() {
        // Toolbar buttons
        document.getElementById('newBtn').addEventListener('click', () => this.newFile());
        document.getElementById('openBtn').addEventListener('click', () => this.openFile());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveFile());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('copyBtn').addEventListener('click', () => this.copy());
        document.getElementById('pasteBtn').addEventListener('click', () => this.paste());
        
        // File input
        this.fileInput.addEventListener('change', (e) => this.handleFileLoad(e));
        
        // Editor events
        this.editor.addEventListener('input', () => this.handleInput());
        this.editor.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.editor.addEventListener('click', () => this.updatePosition());
        this.editor.addEventListener('keyup', () => this.updatePosition());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    newFile() {
        if (this.isModified && !confirm('You have unsaved changes. Continue?')) {
            return;
        }
        
        this.editor.value = '';
        this.currentFile = null;
        this.isModified = false;
        this.undoStack = [];
        this.redoStack = [];
        this.updateStatus('New file created');
        this.updatePosition();
    }
    
    openFile() {
        if (this.isModified && !confirm('You have unsaved changes. Continue?')) {
            return;
        }
        
        this.fileInput.click();
    }
    
    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.editor.value = e.target.result;
            this.currentFile = file.name;
            this.isModified = false;
            this.undoStack = [];
            this.redoStack = [];
            this.updateStatus(`Opened: ${file.name}`);
            this.updatePosition();
        };
        reader.readAsText(file);
    }
    
    saveFile() {
        const content = this.editor.value;
        const filename = this.currentFile || 'untitled.txt';
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.isModified = false;
        this.updateStatus(`Saved: ${filename}`);
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        const currentState = this.editor.value;
        const previousState = this.undoStack.pop();
        
        this.redoStack.push(currentState);
        this.editor.value = previousState;
        this.updateStatus('Undo');
        this.updatePosition();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        const currentState = this.editor.value;
        const nextState = this.redoStack.pop();
        
        this.undoStack.push(currentState);
        this.editor.value = nextState;
        this.updateStatus('Redo');
        this.updatePosition();
    }
    
    copy() {
        const selectedText = this.editor.value.substring(
            this.editor.selectionStart,
            this.editor.selectionEnd
        );
        
        if (selectedText) {
            navigator.clipboard.writeText(selectedText).then(() => {
                this.updateStatus('Copied to clipboard');
            }).catch(() => {
                this.updateStatus('Copy failed');
            });
        } else {
            this.updateStatus('No text selected');
        }
    }
    
    paste() {
        navigator.clipboard.readText().then(text => {
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const value = this.editor.value;
            
            this.saveToUndoStack();
            this.editor.value = value.substring(0, start) + text + value.substring(end);
            this.editor.setSelectionRange(start + text.length, start + text.length);
            
            this.isModified = true;
            this.updateStatus('Pasted from clipboard');
            this.updatePosition();
        }).catch(() => {
            this.updateStatus('Paste failed');
        });
    }
    
    handleInput() {
        this.saveToUndoStack();
        this.isModified = true;
        this.updateStatus('Modified');
    }
    
    handleKeydown(event) {
        // Save state before potentially destructive operations
        if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Enter') {
            this.saveToUndoStack();
        }
    }
    
    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'n':
                    event.preventDefault();
                    this.newFile();
                    break;
                case 'o':
                    event.preventDefault();
                    this.openFile();
                    break;
                case 's':
                    event.preventDefault();
                    this.saveFile();
                    break;
                case 'z':
                    event.preventDefault();
                    if (event.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 'y':
                    event.preventDefault();
                    this.redo();
                    break;
                case 'c':
                    if (this.editor === document.activeElement) {
                        // Let default copy behavior work
                        this.updateStatus('Copied');
                    }
                    break;
                case 'v':
                    if (this.editor === document.activeElement) {
                        // Let default paste behavior work
                        setTimeout(() => {
                            this.isModified = true;
                            this.updateStatus('Pasted');
                        }, 10);
                    }
                    break;
            }
        }
    }
    
    saveToUndoStack() {
        const currentState = this.editor.value;
        
        // Don't save duplicate states
        if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== currentState) {
            this.undoStack.push(currentState);
            
            // Limit undo stack size
            if (this.undoStack.length > 50) {
                this.undoStack.shift();
            }
            
            // Clear redo stack when new changes are made
            this.redoStack = [];
        }
    }
    
    updateStatus(message) {
        this.status.textContent = message;
        
        // Clear status after 3 seconds
        setTimeout(() => {
            if (this.status.textContent === message) {
                this.status.textContent = this.isModified ? 'Modified' : 'Ready';
            }
        }, 3000);
    }
    
    updatePosition() {
        const textarea = this.editor;
        const value = textarea.value;
        const selectionStart = textarea.selectionStart;
        
        // Calculate line and column
        const lines = value.substring(0, selectionStart).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        this.position.textContent = `Line ${line}, Column ${column}`;
    }
}

// Initialize the editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TextEditor();
});