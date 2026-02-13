// Theme toggle
function setTheme(theme) {
    if (theme === 'carbon') {
        document.documentElement.classList.add('carbon');
        document.body.classList.add('carbon');
    } else {
        document.documentElement.classList.remove('carbon');
        document.body.classList.remove('carbon');
    }
    localStorage.setItem('knowledgebase-theme', theme);
    
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
    const savedTheme = localStorage.getItem('knowledgebase-theme') || 'snow';
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
    }
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'search') {
        document.getElementById('searchTab').classList.add('active');
    } else if (tabName === 'upload') {
        document.getElementById('uploadTab').classList.add('active');
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
    if (confirm('Remove ' + displayName + '?\n\nThis will remove all indexed data for this knowledge base. This cannot be undone.')) {
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
    if (confirm('Quit Knowledge Base Manager?\n\nThis will shut down the manager server and close this tab.')) {
        // Call shutdown endpoint
        fetch('/api/shutdown', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
        .then(function() {
            // Try multiple methods to close the tab
            setTimeout(function() {
                // Method 1: Standard window.close()
                window.close();
                
                // Method 2: Try to close via opener
                if (window.opener) {
                    window.opener = null;
                    window.close();
                }
                
                // Method 3: Try opening about:blank and closing
                setTimeout(function() {
                    window.open('', '_self', '');
                    window.close();
                    
                    // If all methods fail, redirect to a blank page with close instruction
                    setTimeout(function() {
                        window.location.href = 'about:blank';
                    }, 100);
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
    
    // Auto-upload if knowledge base is selected
    const knowledgeBase = document.getElementById('uploadKnowledgeBase');
    if (knowledgeBase && knowledgeBase.value && files.length > 0) {
        // Small delay to let the UI update
        setTimeout(function() {
            startUpload();
        }, 100);
    }
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
        
        // Reload page after short delay to show updated KB stats
        setTimeout(() => window.location.reload(), 1000);
        
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


// ===== Document Management Functionality =====

/**
 * Toggle documents list for a knowledge base (inline expansion)
 */
async function toggleDocuments(event, knowledgeBaseName) {
    event.preventDefault();
    event.stopPropagation();
    
    // Use data attribute for more reliable selection
    const kbRow = document.querySelector(`tr.kb-row[data-kb-name="${knowledgeBaseName}"]`);
    if (!kbRow) {
        console.error('Knowledge base row not found:', knowledgeBaseName);
        return;
    }
    
    // Get the next sibling row (documents row)
    const documentsRow = kbRow.nextElementSibling;
    if (!documentsRow || !documentsRow.classList.contains('documents-row')) {
        console.error('Documents row not found for:', knowledgeBaseName);
        return;
    }
    
    const documentsList = documentsRow.querySelector('.documents-list');
    const documentsLoading = documentsRow.querySelector('.documents-loading');
    const expandIcon = kbRow.querySelector('.expand-icon');
    
    if (!documentsList || !documentsLoading || !expandIcon) {
        console.error('Documents elements not found');
        return;
    }
    
    // Toggle visibility
    const isExpanded = documentsRow.style.display === 'table-row';
    
    if (isExpanded) {
        // Collapse
        documentsRow.style.display = 'none';
        expandIcon.style.transform = 'rotate(0deg)';
    } else {
        // Expand
        documentsRow.style.display = 'table-row';
        expandIcon.style.transform = 'rotate(90deg)';
        
        // Load documents if not already loaded
        if (documentsList.innerHTML.trim() === '' || documentsList.innerHTML.includes('<!-- Documents will be loaded here -->')) {
            documentsLoading.style.display = 'block';
            documentsList.innerHTML = '';
            
            try {
                const response = await fetch(`/api/knowledgebases/${encodeURIComponent(knowledgeBaseName)}/documents`);
                
                if (!response.ok) {
                    throw new Error('Failed to load documents');
                }
                
                const data = await response.json();
                
                documentsLoading.style.display = 'none';
                
                if (data.documents.length === 0) {
                    documentsList.innerHTML = '<div class="empty-state" style="padding: 2rem; text-align: center;"><p style="color: var(--text-secondary);">No documents found</p></div>';
                    return;
                }
                
                // Build documents list
                documentsList.innerHTML = data.documents.map(doc => {
                    const ext = '.' + doc.filePath.split('.').pop().toLowerCase();
                    const iconClass = getFileIconClass(ext);
                    const sizeStr = formatFileSize(doc.sizeBytes);
                    const date = new Date(doc.lastIngestion);
                    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                    
                    return `
                        <div class="document-item">
                            <div class="document-item-info">
                                <div class="file-item-icon ${iconClass}">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                </div>
                                <div class="document-item-details">
                                    <div class="document-item-name" title="${doc.filePath}">${doc.filePath}</div>
                                    <div class="document-item-meta">
                                        <span class="badge badge-blue">${doc.chunkCount} chunks</span>
                                        <span class="badge badge-green">${doc.documentType}</span>
                                        <span style="font-size: 0.75rem; color: var(--text-secondary);">${sizeStr}</span>
                                        <span style="font-size: 0.75rem; color: var(--text-secondary);">${dateStr}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="document-item-actions">
                                <button type="button" class="btn btn-ghost btn-sm" onclick="confirmDeleteDocument('${knowledgeBaseName}', '${doc.filePath.replace(/'/g, "\\'")}', this)" title="Delete document">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
                
            } catch (error) {
                console.error('Error loading documents:', error);
                documentsLoading.style.display = 'none';
                documentsList.innerHTML = '<div class="empty-state" style="padding: 2rem; text-align: center;"><p style="color: var(--danger);">Error loading documents</p></div>';
            }
        }
    }
}

/**
 * Confirm and delete document
 */
async function confirmDeleteDocument(knowledgeBaseName, filePath, buttonElement) {
    if (!confirm(`Delete "${filePath}"?\n\nThis will remove all chunks from the knowledge base. This cannot be undone.`)) {
        return;
    }
    
    // Get the document item element
    const documentItem = buttonElement.closest('.document-item');
    
    // Disable button
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10"/></svg>';
    
    try {
        const response = await fetch(`/api/knowledgebases/${encodeURIComponent(knowledgeBaseName)}/documents`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filePath })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete document');
        }
        
        const result = await response.json();
        
        // Remove the document item from the DOM with animation
        if (documentItem) {
            documentItem.style.opacity = '0';
            documentItem.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                documentItem.remove();
                
                // Check if there are any documents left
                const kbRow = document.querySelector(`tr.kb-row[data-kb-name="${knowledgeBaseName}"]`);
                if (kbRow) {
                    const documentsRow = kbRow.nextElementSibling;
                    if (documentsRow) {
                        const documentsList = documentsRow.querySelector('.documents-list');
                        if (documentsList && documentsList.children.length === 0) {
                            documentsList.innerHTML = '<div class="empty-state" style="padding: 2rem; text-align: center;"><p style="color: var(--text-secondary);">No documents found</p></div>';
                        }
                    }
                }
            }, 300);
        }
        
        // Show success message briefly
        const tempMessage = document.createElement('div');
        tempMessage.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(34, 197, 94, 0.9); color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; animation: slideIn 0.3s ease;';
        tempMessage.textContent = `Deleted "${filePath}" (${result.deletedChunks} chunks removed)`;
        document.body.appendChild(tempMessage);
        
        setTimeout(() => {
            tempMessage.style.opacity = '0';
            tempMessage.style.transition = 'opacity 0.3s ease';
            setTimeout(() => tempMessage.remove(), 300);
        }, 3000);
        
        // Reload page after delay to update stats in the table
        setTimeout(() => {
            window.location.href = '/?tab=manage';
        }, 3500);
        
    } catch (error) {
        console.error('Failed to delete document:', error);
        alert(`Failed to delete document: ${error.message}`);
        
        // Re-enable button
        buttonElement.disabled = false;
        buttonElement.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
        `;
    }
}
