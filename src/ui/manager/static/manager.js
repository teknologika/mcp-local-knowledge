// Theme toggle
function setTheme(theme) {
    if (theme === 'carbon') {
        document.documentElement.classList.add('carbon');
        document.body.classList.add('carbon');
    } else {
        document.documentElement.classList.remove('carbon');
        document.body.classList.remove('carbon');
    }
    localStorage.setItem('codebase-theme', theme);
    
    // Update button states
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.theme-btn-${theme}`).classList.add('active');
}

// Copy to clipboard
function copyToClipboard(button, text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = 'rgba(34, 197, 94, 0.1)';
        button.style.color = 'var(--success)';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
            button.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
}

// Auto-dismiss alerts
document.addEventListener('DOMContentLoaded', () => {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
    
    // Set theme on load
    const savedTheme = localStorage.getItem('codebase-theme') || 'snow';
    if (savedTheme === 'carbon') {
        document.querySelector('.theme-btn-carbon')?.classList.add('active');
        document.querySelector('.theme-btn-snow')?.classList.remove('active');
    }
});


// Rename modal functions
function showRenameModal(codebaseName) {
    const modal = document.getElementById('renameModal');
    const oldNameInput = document.getElementById('renameOldName');
    const currentNameInput = document.getElementById('renameCurrentName');
    const newNameInput = document.getElementById('renameNewName');
    
    oldNameInput.value = codebaseName;
    currentNameInput.value = codebaseName;
    newNameInput.value = '';
    newNameInput.focus();
    
    modal.style.display = 'flex';
}

function closeRenameModal() {
    const modal = document.getElementById('renameModal');
    modal.style.display = 'none';
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeRenameModal();
    }
});

// Close modal on background click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('renameModal');
    if (e.target === modal) {
        closeRenameModal();
    }
});


// Folder picker functionality
let currentBrowsePath = null;

async function selectFolder() {
    // Show folder browser modal
    showFolderBrowserModal();
}

async function showFolderBrowserModal() {
    const modal = document.getElementById('folderBrowserModal');
    if (!modal) {
        console.error('Folder browser modal not found');
        return;
    }
    
    modal.style.display = 'flex';
    
    // Load initial directory (home directory)
    await loadFolderList();
}

function closeFolderBrowserModal() {
    const modal = document.getElementById('folderBrowserModal');
    modal.style.display = 'none';
}

async function loadFolderList(path = null) {
    const folderList = document.getElementById('folderList');
    const currentPathDisplay = document.getElementById('currentPathDisplay');
    const loadingIndicator = document.getElementById('folderLoadingIndicator');
    
    try {
        loadingIndicator.style.display = 'block';
        folderList.innerHTML = '';
        
        const url = path ? `/browse-folders?path=${encodeURIComponent(path)}` : '/browse-folders';
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to load folders');
        }
        
        const data = await response.json();
        currentBrowsePath = data.currentPath;
        currentPathDisplay.textContent = data.currentPath;
        
        // Add parent directory option if available
        if (data.parentPath) {
            const parentItem = document.createElement('div');
            parentItem.className = 'folder-item';
            parentItem.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <span>..</span>
            `;
            parentItem.onclick = () => loadFolderList(data.parentPath);
            folderList.appendChild(parentItem);
        }
        
        // Add directories
        data.directories.forEach(dir => {
            const item = document.createElement('div');
            item.className = 'folder-item';
            item.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <span>${dir.name}</span>
            `;
            item.onclick = () => loadFolderList(dir.path);
            folderList.appendChild(item);
        });
        
        if (data.directories.length === 0 && !data.parentPath) {
            folderList.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--text-secondary);">No folders found</p>';
        }
        
    } catch (error) {
        console.error('Error loading folders:', error);
        folderList.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--danger);">Error loading folders</p>';
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function selectCurrentFolder() {
    if (currentBrowsePath) {
        const pathInput = document.getElementById('pathInput');
        pathInput.value = currentBrowsePath;
        closeFolderBrowserModal();
    }
}

// Check if folder picker is supported and update UI
document.addEventListener('DOMContentLoaded', () => {
    const pickerBtn = document.getElementById('folderPickerBtn');
    const helpText = document.getElementById('folderPickerHelp');
    
    // Always show the browse button since we have server-side browsing
    if (pickerBtn) {
        pickerBtn.style.display = 'inline-flex';
        helpText.textContent = 'Click "Browse..." to select a folder, or enter path manually';
    }
});


// Ingest form visibility
function showIngestForm() {
    const container = document.getElementById('ingestFormContainer');
    const codebasesList = document.getElementById('codebasesList');
    const codebasesHeader = document.getElementById('codebasesHeader');
    
    container.style.display = 'block';
    if (codebasesList) {
        codebasesList.style.display = 'none';
    }
    if (codebasesHeader) {
        codebasesHeader.style.display = 'none';
    }
    
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Focus on the name input
    setTimeout(() => {
        document.getElementById('codebaseName').focus();
    }, 300);
}

function hideIngestForm() {
    const container = document.getElementById('ingestFormContainer');
    const codebasesList = document.getElementById('codebasesList');
    const codebasesHeader = document.getElementById('codebasesHeader');
    
    container.style.display = 'none';
    if (codebasesList) {
        codebasesList.style.display = 'block';
    }
    if (codebasesHeader) {
        codebasesHeader.style.display = 'flex';
    }
    
    // Reset form
    document.getElementById('ingestForm').reset();
    
    // Hide progress if showing
    document.getElementById('ingestionProgress').style.display = 'none';
}

// Normalize codebase name (spaces to hyphens, lowercase, alphanumeric only)
function normalizeCodebaseName(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')  // Replace spaces with hyphens
        .replace(/[^a-z0-9-_]/g, '')  // Remove invalid characters
        .replace(/-+/g, '-')  // Replace multiple hyphens with single
        .replace(/^-|-$/g, '');  // Remove leading/trailing hyphens
}

// Display name (hyphens/underscores to spaces, title case)
function displayName(name) {
    return name
        .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Auto-normalize codebase name as user types (removed - let server handle normalization)
document.addEventListener('DOMContentLoaded', () => {
    // Removed auto-normalization to allow users to type freely
    // Server will normalize the name when form is submitted
});

// Ingestion form submission with real-time progress
document.addEventListener('DOMContentLoaded', function() {
    const ingestForm = document.getElementById('ingestForm');
    if (ingestForm) {
        ingestForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(ingestForm);
            const name = formData.get('name');
            const path = formData.get('path');
            
            console.log('Form submission:', { name, path });
            
            if (!name || !path) {
                alert('Please provide both name and path');
                return;
            }
            
            try {
                // Create URLSearchParams properly
                const params = new URLSearchParams();
                params.append('name', String(name));
                params.append('path', String(path));
                
                console.log('Sending request with params:', params.toString());
                
                // Start ingestion and get job ID
                const response = await fetch('/ingest', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params.toString()
                });
                
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    let error;
                    try {
                        error = await response.json();
                    } catch (e) {
                        const text = await response.text();
                        console.error('Server returned non-JSON error:', text);
                        alert('Failed to start ingestion: ' + text);
                        return;
                    }
                    console.error('Server error:', error);
                    alert('Failed to start ingestion: ' + (error.error || 'Unknown error'));
                    return;
                }
                
                let result;
                try {
                    const responseText = await response.text();
                    console.log('Response body:', responseText);
                    result = JSON.parse(responseText);
                } catch (e) {
                    console.error('Failed to parse response as JSON:', e);
                    alert('Server returned invalid response. Check console for details.');
                    return;
                }
                
                console.log('Got job ID:', result.jobId);
                
                // Show progress and connect to SSE
                showIngestionProgress(result.jobId, name);
                
            } catch (error) {
                console.error('Failed to start ingestion:', error);
                alert('Failed to start ingestion: ' + (error instanceof Error ? error.message : String(error)));
            }
        });
    }
});

// Real-time ingestion progress using Server-Sent Events
function showIngestionProgress(jobId, codebaseName) {
    const progressContainer = document.getElementById('ingestionProgress');
    const progressBar = document.getElementById('progressBar');
    const progressPhase = document.getElementById('progressPhase');
    const progressPercent = document.getElementById('progressPercent');
    const progressDetails = document.getElementById('progressDetails');
    
    if (!progressContainer || !progressBar || !progressPhase || !progressPercent || !progressDetails) {
        console.error('Progress elements not found');
        return;
    }
    
    progressContainer.style.display = 'block';
    
    // Disable form
    const ingestForm = document.getElementById('ingestForm');
    if (ingestForm) {
        ingestForm.querySelectorAll('input, button').forEach(function(el) {
            el.disabled = true;
        });
    }
    
    // Connect to SSE endpoint
    const eventSource = new EventSource('/ingest-progress/' + jobId);
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            
            // Update progress UI
            const percent = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
            progressBar.style.width = percent + '%';
            progressPercent.textContent = percent + '%';
            progressPhase.textContent = data.phase;
            progressDetails.textContent = data.phase + ' (' + data.current + '/' + data.total + ')';
            
            // Handle completion
            if (data.status === 'completed') {
                progressBar.style.width = '100%';
                progressPercent.textContent = '100%';
                progressPhase.textContent = 'Complete!';
                progressDetails.textContent = 'Successfully ingested ' + codebaseName;
                
                eventSource.close();
                
                // Reload page after 1.5 seconds
                setTimeout(function() {
                    window.location.href = '/?tab=manage';
                }, 1500);
            } else if (data.status === 'failed') {
                progressPhase.textContent = 'Failed';
                progressDetails.textContent = 'Error: ' + (data.error || 'Unknown error');
                progressBar.style.background = 'var(--danger)';
                
                eventSource.close();
                
                // Re-enable form after 3 seconds
                setTimeout(function() {
                    if (ingestForm) {
                        ingestForm.querySelectorAll('input, button').forEach(function(el) {
                            el.disabled = false;
                        });
                    }
                    progressContainer.style.display = 'none';
                    progressBar.style.background = '';
                }, 3000);
            }
            
        } catch (error) {
            console.error('Failed to parse SSE data:', error);
        }
    };
    
    eventSource.onerror = function(error) {
        console.error('SSE connection error:', error);
        progressPhase.textContent = 'Connection Error';
        progressDetails.textContent = 'Lost connection to server';
        progressBar.style.background = 'var(--danger)';
        eventSource.close();
        
        // Re-enable form after 3 seconds
        setTimeout(function() {
            if (ingestForm) {
                ingestForm.querySelectorAll('input, button').forEach(function(el) {
                    el.disabled = false;
                });
            }
            progressContainer.style.display = 'none';
            progressBar.style.background = '';
        }, 3000);
    };
}


// Tab switching
function switchTab(tabName, clickedButton) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // If called from a button click, mark that button as active
    if (clickedButton) {
        clickedButton.classList.add('active');
    } else {
        // If called programmatically, find the right button based on tabName
        const buttons = document.querySelectorAll('.tab-btn');
        if (tabName === 'search' && buttons[0]) {
            buttons[0].classList.add('active');
        } else if (tabName === 'manage' && buttons[1]) {
            buttons[1].classList.add('active');
        }
    }
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'search') {
        document.getElementById('searchTab').classList.add('active');
    } else if (tabName === 'manage') {
        document.getElementById('manageTab').classList.add('active');
    }
}

// Auto-switch to manage tab if there's a flash message (after add/rename/delete)
// or if tab parameter is in URL
document.addEventListener('DOMContentLoaded', () => {
    // Check URL parameter for tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam === 'manage') {
        switchTab('manage');
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
    } else {
        const alert = document.querySelector('.alert');
        if (alert && !document.querySelector('#searchTab .search-result')) {
            // If there's an alert but no search results, switch to manage tab
            switchTab('manage');
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
        }
    }
});


// Actions menu functions
function toggleActionsMenu(event, codebaseName) {
    event.stopPropagation();
    const menu = document.getElementById('actions-menu-' + codebaseName);
    const isVisible = menu.style.display === 'block';
    
    // Close all other menus
    document.querySelectorAll('.actions-menu').forEach(function(m) {
        m.style.display = 'none';
    });
    
    // Toggle this menu
    menu.style.display = isVisible ? 'none' : 'block';
}

function closeActionsMenu(codebaseName) {
    const menu = document.getElementById('actions-menu-' + codebaseName);
    if (menu) {
        menu.style.display = 'none';
    }
}

// Close menus when clicking outside
document.addEventListener('click', function() {
    document.querySelectorAll('.actions-menu').forEach(function(menu) {
        menu.style.display = 'none';
    });
});

// Confirm remove with better messaging
function confirmRemove(codebaseName, displayName) {
    if (confirm('Remove ' + displayName + '?\n\nThis will remove all indexed data for this codebase. This cannot be undone.')) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/delete';
        
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'name';
        input.value = codebaseName;
        
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
    }
}


// Toggle search result expand/collapse
function toggleSearchResult(element) {
    const isExpanded = element.getAttribute('data-expanded') === 'true';
    element.setAttribute('data-expanded', isExpanded ? 'false' : 'true');
}

// Quit manager with confirmation
function quitManager() {
    if (confirm('Quit Codebase Manager?\n\nThis will shut down the manager server and close this tab.')) {
        // Call shutdown endpoint
        fetch('/api/shutdown', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
        .then(function() {
            // Close the tab after a short delay
            setTimeout(function() {
                window.close();
                // If window.close() doesn't work (some browsers block it), show a message
                setTimeout(function() {
                    document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, -apple-system, sans-serif;"><div style="text-align: center;"><h1 style="font-size: 2rem; margin-bottom: 1rem;">Manager Stopped</h1><p style="color: #666;">You can close this tab now.</p></div></div>';
                }, 100);
            }, 300);
        })
        .catch(function(error) {
            alert('Failed to shut down server: ' + error.message);
        });
    }
}


// ===== File Upload Functionality =====

// Supported file extensions
const SUPPORTED_EXTENSIONS = [
    '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls',
    '.html', '.htm', '.md', '.markdown', '.txt',
    '.mp3', '.wav', '.m4a', '.flac'
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// File queue
let fileQueue = [];

// Upload state
let isUploading = false;

/**
 * Initialize file upload functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    
    if (!dropZone || !fileInput || !folderInput) {
        return;
    }
    
    // Drag and drop events
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    folderInput.addEventListener('change', handleFolderSelect);
    
    // Prevent default drag behavior on document
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('drop', function(e) {
        e.preventDefault();
    });
});

/**
 * Handle drag over event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

/**
 * Handle drag leave event
 */
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

/**
 * Handle drop event
 */
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
}

/**
 * Handle file input selection
 */
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFilesToQueue(files);
    e.target.value = ''; // Reset input
}

/**
 * Handle folder input selection
 */
function handleFolderSelect(e) {
    const files = Array.from(e.target.files);
    addFilesToQueue(files);
    e.target.value = ''; // Reset input
}

/**
 * Add files to upload queue
 */
function addFilesToQueue(files) {
    const validFiles = files.filter(file => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        return SUPPORTED_EXTENSIONS.includes(ext);
    });
    
    if (validFiles.length === 0) {
        showUploadMessage('No supported files found. Please select PDF, Word, PowerPoint, Excel, HTML, Markdown, Text, or Audio files.', 'warning');
        return;
    }
    
    // Add to queue
    validFiles.forEach(file => {
        // Check if file already in queue
        const exists = fileQueue.some(f => f.name === file.name && f.size === file.size);
        if (!exists) {
            fileQueue.push(file);
        }
    });
    
    updateFileList();
    
    // Show message if some files were filtered
    const filteredCount = files.length - validFiles.length;
    if (filteredCount > 0) {
        showUploadMessage(`${filteredCount} file(s) skipped (unsupported format)`, 'warning');
    }
}

/**
 * Update file list display
 */
function updateFileList() {
    const fileListContainer = document.getElementById('fileListContainer');
    const fileList = document.getElementById('fileList');
    const fileCount = document.getElementById('fileCount');
    
    if (!fileListContainer || !fileList || !fileCount) {
        return;
    }
    
    if (fileQueue.length === 0) {
        fileListContainer.style.display = 'none';
        return;
    }
    
    fileListContainer.style.display = 'block';
    fileCount.textContent = fileQueue.length;
    
    // Build file list HTML
    fileList.innerHTML = fileQueue.map((file, index) => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const sizeStr = formatFileSize(file.size);
        const iconClass = getFileIconClass(ext);
        const warning = file.size > MAX_FILE_SIZE ? `<div class="file-item-warning">⚠ File exceeds 10MB limit</div>` : '';
        
        return `
            <div class="file-item">
                <div class="file-item-info">
                    <div class="file-item-icon ${iconClass}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                    </div>
                    <div class="file-item-details">
                        <div class="file-item-name" title="${file.name}">${file.name}</div>
                        <div class="file-item-size">${sizeStr}</div>
                        ${warning}
                    </div>
                </div>
                <div class="file-item-actions">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="removeFileFromQueue(${index})" title="Remove">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Remove file from queue
 */
function removeFileFromQueue(index) {
    fileQueue.splice(index, 1);
    updateFileList();
}

/**
 * Clear file list
 */
function clearFileList() {
    fileQueue = [];
    updateFileList();
    clearUploadMessages();
}

/**
 * Start file upload
 */
async function startUpload() {
    const knowledgeBase = document.getElementById('uploadKnowledgeBase').value;
    
    if (!knowledgeBase) {
        showUploadMessage('Please select a knowledge base', 'error');
        return;
    }
    
    if (fileQueue.length === 0) {
        showUploadMessage('No files selected', 'error');
        return;
    }
    
    if (isUploading) {
        return;
    }
    
    isUploading = true;
    
    // Disable upload button
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
    }
    
    // Show progress container
    const uploadProgress = document.getElementById('uploadProgress');
    if (uploadProgress) {
        uploadProgress.style.display = 'block';
    }
    
    // Clear previous messages
    clearUploadMessages();
    
    // Upload files one by one
    const results = [];
    for (let i = 0; i < fileQueue.length; i++) {
        const file = fileQueue[i];
        const result = await uploadFile(file, knowledgeBase, i);
        results.push(result);
    }
    
    // Show summary
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
        showUploadMessage(`Successfully uploaded ${successCount} file(s)`, 'success');
    }
    
    if (errorCount > 0) {
        showUploadMessage(`Failed to upload ${errorCount} file(s)`, 'error');
    }
    
    // Re-enable upload button
    if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Files
        `;
    }
    
    isUploading = false;
    
    // Clear queue if all successful
    if (errorCount === 0) {
        fileQueue = [];
        updateFileList();
        
        // Reload page after 2 seconds to show updated knowledge base
        setTimeout(function() {
            window.location.href = '/?tab=manage';
        }, 2000);
    }
}

/**
 * Upload single file
 */
async function uploadFile(file, knowledgeBase, index) {
    const progressList = document.getElementById('uploadProgressList');
    
    // Create progress item
    const progressId = `upload-progress-${index}`;
    const progressHTML = `
        <div class="upload-progress-item" id="${progressId}">
            <div class="upload-progress-header">
                <div class="upload-progress-name" title="${file.name}">${file.name}</div>
                <div class="upload-progress-status uploading">Uploading...</div>
            </div>
            <div class="upload-progress-bar-container">
                <div class="upload-progress-bar" id="${progressId}-bar"></div>
            </div>
        </div>
    `;
    
    if (progressList) {
        progressList.insertAdjacentHTML('beforeend', progressHTML);
    }
    
    try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('knowledgeBaseName', knowledgeBase);
        
        // Upload file
        const response = await fetch('/api/upload/file', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        const result = await response.json();
        
        // Update progress to success
        updateUploadProgress(progressId, 'success', 'Complete');
        
        return { success: true, file: file.name };
        
    } catch (error) {
        console.error('Upload failed:', error);
        updateUploadProgress(progressId, 'error', 'Failed');
        return { success: false, file: file.name, error: error.message };
    }
}

/**
 * Update upload progress
 */
function updateUploadProgress(progressId, status, statusText) {
    const progressItem = document.getElementById(progressId);
    if (!progressItem) return;
    
    const statusEl = progressItem.querySelector('.upload-progress-status');
    const barEl = document.getElementById(`${progressId}-bar`);
    
    if (statusEl) {
        statusEl.textContent = statusText;
        statusEl.className = `upload-progress-status ${status}`;
    }
    
    if (barEl) {
        barEl.style.width = '100%';
        barEl.className = `upload-progress-bar ${status}`;
    }
}

/**
 * Show upload message
 */
function showUploadMessage(message, type) {
    const messagesContainer = document.getElementById('uploadMessages');
    if (!messagesContainer) return;
    
    const messageHTML = `
        <div class="upload-message ${type}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : 
                  type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' :
                  '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}
            </svg>
            ${message}
        </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    
    // Auto-remove after 5 seconds
    setTimeout(function() {
        const messages = messagesContainer.querySelectorAll('.upload-message');
        if (messages.length > 0) {
            messages[0].style.opacity = '0';
            setTimeout(function() {
                messages[0].remove();
            }, 300);
        }
    }, 5000);
}

/**
 * Clear upload messages
 */
function clearUploadMessages() {
    const messagesContainer = document.getElementById('uploadMessages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
    
    const progressList = document.getElementById('uploadProgressList');
    if (progressList) {
        progressList.innerHTML = '';
    }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon class based on extension
 */
function getFileIconClass(ext) {
    if (ext === '.pdf') return 'pdf';
    if (['.docx', '.doc'].includes(ext)) return 'docx';
    if (['.pptx', '.ppt'].includes(ext)) return 'pptx';
    if (['.xlsx', '.xls'].includes(ext)) return 'xlsx';
    if (['.mp3', '.wav', '.m4a', '.flac'].includes(ext)) return 'audio';
    return 'default';
}
