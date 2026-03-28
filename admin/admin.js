/**
 * ShokherSrity Admin Panel - JavaScript
 * Authentication, Content Management, Gallery, File Management, Submissions
 * Located at /admin/admin.js
 */

// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let isAdminVerified = false;
let pendingUploadFiles = [];
let pendingFileUploads = [];

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };
    
    toast.innerHTML = `
        ${icons[type] || icons.info}
        <span class="toast-text">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// AUTHENTICATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Login form handler
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout handler
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Bootstrap handler
    document.getElementById('bootstrap-btn').addEventListener('click', handleBootstrap);
    
    // Nav tabs
    document.querySelectorAll('.admin-nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchPanel(tab.dataset.panel));
    });
    
    // Content save
    document.getElementById('save-content-btn').addEventListener('click', handleSaveContent);
    
    // Image upload
    setupImageUpload();
    
    // File upload
    setupFileUpload();
    
    // Submissions refresh
    document.getElementById('refresh-submissions-btn').addEventListener('click', loadSubmissionsPanel);
    
    // Files refresh
    document.getElementById('refresh-files-btn').addEventListener('click', loadFilesPanel);
    
    // Add admin
    document.getElementById('add-admin-btn').addEventListener('click', handleAddAdmin);
    
    // Listen for auth state
    onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            const adminStatus = await isAdmin(user.uid);
            
            if (adminStatus) {
                isAdminVerified = true;
                showDashboard(user);
            } else {
                // User is logged in but not admin — check if bootstrap needed
                const admins = await getAdminsCount();
                if (admins === 0) {
                    // No admins exist — allow bootstrap
                    isAdminVerified = false;
                    showDashboard(user);
                    document.getElementById('bootstrap-notice').style.display = 'block';
                } else {
                    // Not authorized
                    showLoginError('You are not authorized as an admin.');
                    await adminLogout();
                }
            }
        } else {
            currentUser = null;
            isAdminVerified = false;
            showLogin();
        }
    });
});

async function getAdminsCount() {
    try {
        const admins = await getAdmins();
        return Object.keys(admins).length;
    } catch {
        return -1; // Couldn't check, maybe rules block it
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-btn');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginSpinner = document.getElementById('login-spinner');
    
    loginBtn.disabled = true;
    loginBtnText.style.display = 'none';
    loginSpinner.style.display = 'block';
    hideLoginError();
    
    try {
        await adminLogin(email, password);
        // Auth state listener will handle the rest
    } catch (error) {
        console.error('Login error:', error);
        let message = 'Invalid credentials. Please try again.';
        if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
        if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
        if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please try again later.';
        if (error.code === 'auth/invalid-credential') message = 'Invalid email or password.';
        showLoginError(message);
    } finally {
        loginBtn.disabled = false;
        loginBtnText.style.display = 'inline';
        loginSpinner.style.display = 'none';
    }
}

async function handleLogout() {
    try {
        await adminLogout();
        showToast('Signed out successfully', 'info');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

async function handleBootstrap() {
    const btn = document.getElementById('bootstrap-btn');
    btn.disabled = true;
    btn.textContent = 'Bootstrapping...';
    
    try {
        await bootstrapFirstAdmin();
        isAdminVerified = true;
        document.getElementById('bootstrap-notice').style.display = 'none';
        showToast('✅ You are now the first admin!', 'success', 5000);
        initDashboardData();
    } catch (error) {
        console.error('Bootstrap error:', error);
        showToast('Bootstrap failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Bootstrap as Admin
        `;
    }
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-dashboard').classList.remove('active');
}

function showDashboard(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').classList.add('active');
    
    // Set user info
    const email = user.email || 'Admin';
    document.getElementById('user-email').textContent = email;
    document.getElementById('user-avatar').textContent = email.charAt(0).toUpperCase();
    
    // Load dashboard data
    if (isAdminVerified) {
        initDashboardData();
    }
}

function showLoginError(message) {
    const errorEl = document.getElementById('login-error');
    document.getElementById('login-error-text').textContent = message;
    errorEl.style.display = 'flex';
}

function hideLoginError() {
    document.getElementById('login-error').style.display = 'none';
}

// ============================================
// NAVIGATION
// ============================================
function switchPanel(panelId) {
    // Update tabs
    document.querySelectorAll('.admin-nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.panel === panelId);
    });
    
    // Update panels
    document.querySelectorAll('.admin-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${panelId}`);
    });
    
    // Load panel-specific data
    if (panelId === 'submissions') loadSubmissionsPanel();
    if (panelId === 'admins') loadAdminsPanel();
    if (panelId === 'gallery') loadGalleryPanel();
    if (panelId === 'content') loadContentPanel();
    if (panelId === 'files') loadFilesPanel();
    if (panelId === 'packages') loadPackagesPanel();
}

// ============================================
// DASHBOARD DATA INITIALIZATION
// ============================================
async function initDashboardData() {
    try {
        // Load stats
        loadOverviewStats();
        
        // Load storage info
        loadStorageInfo();
        
        // Load recent submissions for overview
        loadRecentSubmissions();
    } catch (error) {
        console.error('Dashboard data init error:', error);
    }
}

async function loadOverviewStats() {
    try {
        // Contact submissions count
        const submissions = await loadContactSubmissions();
        document.getElementById('stat-submissions').textContent = submissions.length;
        
        // Page visits count
        const visits = await loadPageVisits();
        document.getElementById('stat-visits').textContent = visits.length;
        
        // Gallery images count
        const storage = await getStorageUsage();
        document.getElementById('stat-images').textContent = storage.count;
        
        // Inquiries count
        const inquiries = await loadInquiries();
        document.getElementById('stat-inquiries').textContent = inquiries.length;
    } catch (error) {
        console.error('Stats load error:', error);
    }
}

async function loadStorageInfo() {
    try {
        const usage = await getStorageUsage();
        const usedMB = parseFloat(usage.estimatedMB);
        const totalMB = 750; // ~750MB effective for base64
        const percentage = Math.min((usedMB / totalMB) * 100, 100);
        
        document.getElementById('storage-used').textContent = `${usage.estimatedMB} MB used`;
        document.getElementById('storage-images-count').textContent = usage.count;
        document.getElementById('storage-remaining').textContent = Math.max(0, (totalMB - usedMB)).toFixed(0);
        
        const fillEl = document.getElementById('storage-bar-fill');
        fillEl.style.width = `${percentage}%`;
        fillEl.className = 'storage-bar-fill';
        if (percentage > 80) fillEl.classList.add('danger');
        else if (percentage > 50) fillEl.classList.add('warning');
    } catch (error) {
        console.error('Storage info error:', error);
    }
}

async function loadRecentSubmissions() {
    try {
        const submissions = await loadContactSubmissions();
        const container = document.getElementById('recent-submissions-list');
        
        if (submissions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <h3>No submissions yet</h3>
                    <p>Contact form submissions will appear here.</p>
                </div>
            `;
            return;
        }
        
        const recent = submissions.slice(0, 5);
        container.innerHTML = recent.map(s => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--admin-border);">
                <div>
                    <div style="font-weight: 500; font-size: 0.9rem;">${escapeHtml(s.name || 'Anonymous')}</div>
                    <div style="font-size: 0.75rem; color: var(--admin-text-dim);">${escapeHtml(s.email || '')}</div>
                </div>
                <div style="text-align: right;">
                    <span class="status-badge ${s.status || 'new'}">${s.status || 'new'}</span>
                    <div style="font-size: 0.7rem; color: var(--admin-text-muted); margin-top: 0.25rem;">${formatDate(s.createdAt)}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Recent submissions error:', error);
    }
}

// ============================================
// CONTENT MANAGEMENT
// ============================================
async function loadContentPanel() {
    try {
        const content = await loadSiteContent();
        if (!content) return;
        
        // Hero
        if (content.hero) {
            setInputValue('content-hero-title', content.hero.title);
            setInputValue('content-hero-tagline', content.hero.tagline);
        }
        
        // About
        if (content.about) {
            setInputValue('content-about-title', content.about.title);
            setInputValue('content-about-p1', content.about.paragraph1);
            setInputValue('content-about-p2', content.about.paragraph2);
            setInputValue('content-about-signature', content.about.signature);
            if (content.about.stats) {
                setInputValue('content-about-years', content.about.stats.years);
                setInputValue('content-about-weddings', content.about.stats.weddings);
                setInputValue('content-about-moments', content.about.stats.moments);
            }
        }
        
        // Contact
        if (content.contact) {
            if (content.contact.phones) {
                setInputValue('content-contact-phone1', content.contact.phones[0]);
                setInputValue('content-contact-phone2', content.contact.phones[1]);
            }
            setInputValue('content-contact-email', content.contact.email);
            setInputValue('content-contact-address', content.contact.address);
        }
        
        // Packages (legacy statics left for fallback, though removed from UI)
        if (content.packages) {
            if(document.getElementById('content-pkg-silver-price')) setInputValue('content-pkg-silver-price', content.packages.silver?.price);
            if(document.getElementById('content-pkg-golden-price')) setInputValue('content-pkg-golden-price', content.packages.golden?.price);
            if(document.getElementById('content-pkg-platinum-price')) setInputValue('content-pkg-platinum-price', content.packages.platinum?.price);
        }

        // Custom Images
        if (content.hero?.backgroundImage) {
            document.getElementById('content-hero-bg').value = content.hero.backgroundImage;
            const preview = document.getElementById('hero-bg-preview');
            if (preview) {
                preview.src = content.hero.backgroundImage;
                preview.style.display = 'block';
                document.getElementById('hero-bg-clear').style.display = 'inline-block';
            }
        }
        if (content.about?.image) {
            document.getElementById('content-about-image').value = content.about.image;
            const preview = document.getElementById('about-img-preview');
            if (preview) {
                preview.src = content.about.image;
                preview.style.display = 'block';
                document.getElementById('about-img-clear').style.display = 'inline-block';
            }
        }
        
        showToast('Content loaded from database', 'info');
    } catch (error) {
        console.error('Content load error:', error);
        showToast('Failed to load content', 'error');
    }
}

async function handleSaveContent() {
    const btn = document.getElementById('save-content-btn');
    btn.disabled = true;
    
    try {
        // Load existing content first to preserve fields we don't edit
        const existing = await loadSiteContent() || {};
        
        const contentData = {
            ...existing,
            hero: {
                ...(existing.hero || {}),
                title: getInputValue('content-hero-title'),
                tagline: getInputValue('content-hero-tagline'),
                backgroundImage: document.getElementById('content-hero-bg').value || ''
            },
            about: {
                ...(existing.about || {}),
                title: getInputValue('content-about-title'),
                image: document.getElementById('content-about-image').value || '',
                paragraph1: getInputValue('content-about-p1'),
                paragraph2: getInputValue('content-about-p2'),
                signature: getInputValue('content-about-signature'),
                stats: {
                    years: getInputValue('content-about-years'),
                    weddings: getInputValue('content-about-weddings'),
                    moments: getInputValue('content-about-moments')
                }
            },
            contact: {
                ...(existing.contact || {}),
                phones: [
                    getInputValue('content-contact-phone1'),
                    getInputValue('content-contact-phone2')
                ],
                email: getInputValue('content-contact-email'),
                address: getInputValue('content-contact-address')
            },
            packages: {
                ...(existing.packages || {}),
                silver: { ...(existing.packages?.silver || {}), price: getInputValue('content-pkg-silver-price') },
                golden: { ...(existing.packages?.golden || {}), price: getInputValue('content-pkg-golden-price') },
                platinum: { ...(existing.packages?.platinum || {}), price: getInputValue('content-pkg-platinum-price') }
            },
            lastUpdated: new Date().toISOString(),
            updatedBy: currentUser?.email || 'unknown'
        };
        
        await saveContentSection('', contentData);
        showToast('✅ Content saved successfully!', 'success');
    } catch (error) {
        console.error('Save content error:', error);
        showToast('Failed to save content: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// ============================================
// GALLERY MANAGEMENT
// ============================================
function setupImageUpload() {
    const zone = document.getElementById('image-upload-zone');
    const input = document.getElementById('image-upload-input');
    
    zone.addEventListener('click', () => input.click());
    
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });
    
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    input.addEventListener('change', () => {
        handleFiles(input.files);
    });
    
    document.getElementById('upload-save-btn').addEventListener('click', handleUploadSave);
    document.getElementById('upload-cancel-btn').addEventListener('click', () => {
        document.getElementById('image-upload-form').style.display = 'none';
        pendingUploadFiles = [];
    });
}

function handleFiles(files) {
    if (!files.length) return;
    
    pendingUploadFiles = Array.from(files);
    document.getElementById('image-upload-form').style.display = 'block';
    
    // Show preview
    const preview = document.getElementById('upload-preview');
    preview.innerHTML = '';
    
    pendingUploadFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = 'width: 100px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 8px;';
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

async function handleUploadSave() {
    const btn = document.getElementById('upload-save-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    
    const title = getInputValue('upload-title');
    const category = document.getElementById('upload-category').value;
    const alt = getInputValue('upload-alt');
    
    try {
        for (let i = 0; i < pendingUploadFiles.length; i++) {
            const file = pendingUploadFiles[i];
            showToast(`Compressing image ${i + 1}/${pendingUploadFiles.length}...`, 'info', 2000);
            
            const base64 = await compressImage(file, 1200, 0.7);
            const sizeBytes = Math.round((base64.length * 3) / 4);
            
            const imageData = {
                name: file.name,
                base64: base64,
                category: category,
                title: title || file.name.split('.')[0],
                alt: alt || title || file.name.split('.')[0],
                order: Date.now(),
                size: sizeBytes
            };
            
            await saveImage(imageData);
            showToast(`✅ Image ${i + 1} uploaded (${(sizeBytes / 1024).toFixed(0)} KB)`, 'success');
        }
        
        pendingUploadFiles = [];
        document.getElementById('image-upload-form').style.display = 'none';
        document.getElementById('image-upload-input').value = '';
        
        loadGalleryPanel();
        loadStorageInfo();
        loadOverviewStats();
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Upload & Save
        `;
    }
}

async function loadGalleryPanel() {
    try {
        const images = await loadImages();
        const grid = document.getElementById('image-grid');
        
        if (images.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <h3>No images yet</h3>
                    <p>Upload your first gallery image using the upload zone above.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = images.map(img => `
            <div class="image-card" data-id="${img.id}">
                <img src="${img.base64}" alt="${escapeHtml(img.alt || img.title || '')}" loading="lazy">
                <div class="image-card-info">
                    <div class="image-card-title">${escapeHtml(img.title || 'Untitled')}</div>
                    <div class="image-card-meta">
                        <span>${img.category || 'uncategorized'}</span>
                        <span>•</span>
                        <span>${img.size ? (img.size / 1024).toFixed(0) + ' KB' : '–'}</span>
                    </div>
                </div>
                <div class="image-card-actions">
                    <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="handleDeleteImage('${img.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Gallery load error:', error);
        showToast('Failed to load gallery', 'error');
    }
}

async function handleDeleteImage(imageId) {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
        await deleteImage(imageId);
        showToast('Image deleted', 'success');
        loadGalleryPanel();
        loadStorageInfo();
        loadOverviewStats();
    } catch (error) {
        console.error('Delete image error:', error);
        showToast('Failed to delete image: ' + error.message, 'error');
    }
}

// ============================================
// FILE MANAGEMENT
// ============================================
function setupFileUpload() {
    const zone = document.getElementById('file-upload-zone');
    const input = document.getElementById('file-upload-input');
    
    zone.addEventListener('click', () => input.click());
    
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });
    
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        handleFileSelection(e.dataTransfer.files);
    });
    
    input.addEventListener('change', () => {
        handleFileSelection(input.files);
    });
    
    document.getElementById('file-save-btn').addEventListener('click', handleFileSave);
    document.getElementById('file-cancel-btn').addEventListener('click', () => {
        document.getElementById('file-upload-form').style.display = 'none';
        pendingFileUploads = [];
    });
}

function handleFileSelection(files) {
    if (!files.length) return;
    
    pendingFileUploads = Array.from(files);
    document.getElementById('file-upload-form').style.display = 'block';
    
    // Auto-detect category
    const firstFile = files[0];
    if (firstFile.type.startsWith('image/')) {
        document.getElementById('file-category').value = 'image';
    } else if (firstFile.type.includes('pdf') || firstFile.type.includes('document')) {
        document.getElementById('file-category').value = 'document';
    }
    
    // Show preview
    const preview = document.getElementById('file-upload-preview');
    preview.innerHTML = '';
    
    pendingFileUploads.forEach(file => {
        const item = document.createElement('div');
        item.style.cssText = 'display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--admin-surface-2); border-radius: 6px; margin-right: 0.5rem; margin-bottom: 0.5rem; font-size: 0.8rem;';
        
        const isImage = file.type.startsWith('image/');
        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = 'width: 40px; height: 40px; object-fit: cover; border-radius: 4px;';
                item.prepend(img);
            };
            reader.readAsDataURL(file);
        }
        
        item.innerHTML += `
            <div>
                <div style="font-weight: 500;">${escapeHtml(file.name)}</div>
                <div style="font-size: 0.7rem; color: var(--admin-text-dim);">${(file.size / 1024).toFixed(1)} KB • ${file.type || 'unknown'}</div>
            </div>
        `;
        preview.appendChild(item);
    });
}

async function handleFileSave() {
    const btn = document.getElementById('file-save-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    
    const description = getInputValue('file-description');
    const category = document.getElementById('file-category').value;
    
    try {
        for (let i = 0; i < pendingFileUploads.length; i++) {
            const file = pendingFileUploads[i];
            const isImage = file.type.startsWith('image/');
            
            showToast(`Processing file ${i + 1}/${pendingFileUploads.length}...`, 'info', 2000);
            
            let base64;
            if (isImage) {
                base64 = await compressImage(file, 1200, 0.7);
            } else {
                base64 = await readFileAsBase64(file);
            }
            
            const sizeBytes = Math.round((base64.length * 3) / 4);
            
            const fileData = {
                name: file.name,
                base64: base64,
                type: file.type,
                category: category,
                description: description || file.name,
                size: sizeBytes,
                originalSize: file.size,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                uploadedBy: currentUser?.email || 'unknown'
            };
            
            await firestore.collection('files').add(fileData);
            showToast(`✅ File "${file.name}" uploaded (${(sizeBytes / 1024).toFixed(0)} KB)`, 'success');
        }
        
        pendingFileUploads = [];
        document.getElementById('file-upload-form').style.display = 'none';
        document.getElementById('file-upload-input').value = '';
        
        loadFilesPanel();
    } catch (error) {
        console.error('File upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Upload Files
        `;
    }
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function loadFilesPanel() {
    // Load static files from database registry
    await loadStaticFilesGrid();
    
    // Load uploaded files from Firestore
    await loadUploadedFilesGrid();
}

async function loadStaticFilesGrid() {
    const grid = document.getElementById('static-files-grid');
    
    try {
        // Try to load gallery items from RTDB (seeded data)
        const content = await loadSiteContent();
        const galleryItems = content?.gallery_items;
        
        if (!galleryItems) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <p>No static file registry found. Run the Database Seeder to register static assets.</p>
                </div>
            `;
            return;
        }
        
        const items = Object.values(galleryItems);
        grid.innerHTML = items.map(item => `
            <div class="image-card" style="min-height: 120px;">
                <img src="../${item.path}" alt="${escapeHtml(item.alt || item.title)}" loading="lazy" style="height: 100px; object-fit: cover;">
                <div class="image-card-info">
                    <div class="image-card-title" style="font-size: 0.7rem;">${escapeHtml(item.title || item.file)}</div>
                    <div class="image-card-meta" style="font-size: 0.6rem;">
                        <span>${item.category}</span>
                        <span>•</span>
                        <span style="color: var(--admin-text-muted);">static</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Static files load error:', error);
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p>Failed to load static files</p></div>`;
    }
}

async function loadUploadedFilesGrid() {
    const grid = document.getElementById('uploaded-files-grid');
    
    try {
        if (!firestore) {
            grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p>Firestore not available</p></div>`;
            return;
        }
        
        const snapshot = await firestore.collection('files').orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin-bottom: 0.5rem;">
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path>
                    </svg>
                    <h3>No uploaded files</h3>
                    <p>Upload files using the upload zone above.</p>
                </div>
            `;
            return;
        }
        
        const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        grid.innerHTML = files.map(file => {
            const isImage = file.type && file.type.startsWith('image/');
            const preview = isImage 
                ? `<img src="${file.base64}" alt="${escapeHtml(file.name)}" loading="lazy" style="height: 100px; object-fit: cover;">`
                : `<div style="height: 100px; display: flex; align-items: center; justify-content: center; background: var(--admin-surface-2);">
                     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-dim)" stroke-width="1.5">
                         <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                         <polyline points="14 2 14 8 20 8"></polyline>
                     </svg>
                   </div>`;
            
            return `
                <div class="image-card" style="min-height: 120px;">
                    ${preview}
                    <div class="image-card-info">
                        <div class="image-card-title" style="font-size: 0.7rem;">${escapeHtml(file.name || 'Untitled')}</div>
                        <div class="image-card-meta" style="font-size: 0.6rem;">
                            <span>${file.category || 'general'}</span>
                            <span>•</span>
                            <span>${file.size ? (file.size / 1024).toFixed(0) + ' KB' : '–'}</span>
                        </div>
                    </div>
                    <div class="image-card-actions">
                        <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="handleDeleteFile('${file.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Uploaded files load error:', error);
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p>Failed to load uploaded files</p></div>`;
    }
}

async function handleDeleteFile(fileId) {
    if (!confirm('Delete this file permanently?')) return;
    
    try {
        await firestore.collection('files').doc(fileId).delete();
        showToast('File deleted', 'success');
        loadFilesPanel();
    } catch (error) {
        console.error('Delete file error:', error);
        showToast('Failed to delete file: ' + error.message, 'error');
    }
}

// ============================================
// SUBMISSIONS PANEL
// ============================================
async function loadSubmissionsPanel() {
    try {
        const submissions = await loadContactSubmissions();
        const tbody = document.getElementById('submissions-tbody');
        
        if (submissions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--admin-text-dim);">
                        No submissions yet.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = submissions.map(s => `
            <tr>
                <td><strong>${escapeHtml(s.name || 'N/A')}</strong></td>
                <td>${escapeHtml(s.email || 'N/A')}</td>
                <td>${escapeHtml(s.service || 'N/A')}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(s.message || '')}">${escapeHtml(s.message || 'N/A')}</td>
                <td style="white-space: nowrap; font-size: 0.75rem;">${formatDate(s.createdAt)}</td>
                <td>
                    <select class="admin-form-select" style="padding: 0.3rem 0.5rem; font-size: 0.7rem; min-width: 100px;" onchange="handleStatusChange('${s.id}', this.value)">
                        <option value="new" ${s.status === 'new' ? 'selected' : ''}>New</option>
                        <option value="read" ${s.status === 'read' ? 'selected' : ''}>Read</option>
                        <option value="responded" ${s.status === 'responded' ? 'selected' : ''}>Responded</option>
                    </select>
                </td>
                <td>
                    <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="handleDeleteSubmission('${s.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Submissions load error:', error);
        showToast('Failed to load submissions', 'error');
    }
}

async function handleStatusChange(id, status) {
    try {
        await updateSubmissionStatus(id, status);
        showToast('Status updated', 'success', 2000);
    } catch (error) {
        showToast('Failed to update status', 'error');
    }
}

async function handleDeleteSubmission(id) {
    if (!confirm('Delete this submission?')) return;
    
    try {
        await deleteSubmission(id);
        showToast('Submission deleted', 'success');
        loadSubmissionsPanel();
        loadOverviewStats();
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
    }
}

// ============================================
// ADMIN MANAGEMENT
// ============================================
async function loadAdminsPanel() {
    try {
        const admins = await getAdmins();
        const list = document.getElementById('admin-list');
        
        const entries = Object.entries(admins);
        
        if (entries.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <p>No admins found. Bootstrap required.</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = entries.map(([uid, data]) => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <div class="admin-list-avatar">${(data.email || 'A').charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="admin-list-email">${escapeHtml(data.email || uid)}</div>
                        <div class="admin-list-added">UID: ${uid.substring(0, 12)}... • Added: ${formatDate(data.addedAt)}</div>
                    </div>
                </div>
                ${uid !== currentUser?.uid ? `
                    <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="handleRemoveAdmin('${uid}', '${escapeHtml(data.email || uid)}')">
                        Remove
                    </button>
                ` : `
                    <span class="status-badge new" style="background: var(--admin-gold-dim); color: var(--admin-gold);">You</span>
                `}
            </div>
        `).join('');
    } catch (error) {
        console.error('Admin list error:', error);
        showToast('Failed to load admins', 'error');
    }
}

async function handleAddAdmin() {
    const uid = getInputValue('new-admin-uid');
    const email = getInputValue('new-admin-email');
    
    if (!uid || !email) {
        showToast('Please enter both UID and email', 'warning');
        return;
    }
    
    try {
        await addAdmin(uid, email);
        showToast(`✅ Admin added: ${email}`, 'success');
        document.getElementById('new-admin-uid').value = '';
        document.getElementById('new-admin-email').value = '';
        loadAdminsPanel();
    } catch (error) {
        console.error('Add admin error:', error);
        showToast('Failed to add admin: ' + error.message, 'error');
    }
}

async function handleRemoveAdmin(uid, email) {
    if (!confirm(`Remove admin: ${email}?\n\nThis will revoke their CMS access.`)) return;
    
    try {
        await removeAdmin(uid);
        showToast(`Admin removed: ${email}`, 'success');
        loadAdminsPanel();
    } catch (error) {
        showToast('Failed to remove admin: ' + error.message, 'error');
    }
}

// ============================================
// UTILITIES
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '–';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
        el.value = value;
    }
}

// ============================================
// IMAGE PICKER MODAL
// ============================================
let activeImagePickerTarget = null;
let activeImagePickerPreview = null;

async function openImagePicker(targetInputId, previewImgId) {
    activeImagePickerTarget = targetInputId;
    activeImagePickerPreview = previewImgId;
    
    document.getElementById('image-picker-modal').style.display = 'flex';
    const grid = document.getElementById('picker-image-grid');
    grid.innerHTML = '<p>Loading images...</p>';
    
    try {
        const images = await loadImages();
        if (images.length === 0) {
            grid.innerHTML = '<p>No images found. Please upload images in the Gallery first.</p>';
            return;
        }
        
        grid.innerHTML = images.map(img => `
            <div class="image-card" style="cursor: pointer;" onclick="selectImageForTarget('${img.base64}')">
                <img src="${img.base64}" alt="${escapeHtml(img.title || '')}" loading="lazy" style="height: 120px;">
                <div class="image-card-info" style="padding: 0.5rem; font-size: 0.75rem;">
                    ${escapeHtml(img.title || 'Untitled')}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load images for picker', error);
        grid.innerHTML = '<p>Error loading images.</p>';
    }
}

function closeImagePicker() {
    document.getElementById('image-picker-modal').style.display = 'none';
    activeImagePickerTarget = null;
    activeImagePickerPreview = null;
}

function selectImageForTarget(base64) {
    if (activeImagePickerTarget) {
        document.getElementById(activeImagePickerTarget).value = base64;
    }
    if (activeImagePickerPreview) {
        const preview = document.getElementById(activeImagePickerPreview);
        preview.src = base64;
        preview.style.display = 'block';
        
        // Find the clear button next to it
        const clearBtn = preview.parentElement.querySelector('button[id$="-clear"]');
        if (clearBtn) clearBtn.style.display = 'inline-block';
    }
    closeImagePicker();
}

function clearImageSelection(inputId, previewId, clearBtnId) {
    document.getElementById(inputId).value = '';
    const preview = document.getElementById(previewId);
    preview.src = '';
    preview.style.display = 'none';
    document.getElementById(clearBtnId).style.display = 'none';
}

// ============================================
// PACKAGES MANAGER MODALS & LOGIC
// ============================================

const SVGIcons = {
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
    drone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 6L18 10L14 6L18 2L22 6Z" /><path d="M10 6L6 10L2 6L6 2L10 6Z" /><path d="M22 18L18 22L14 18L18 14L22 18Z" /><path d="M10 18L6 22L2 18L6 14L10 18Z" /><circle cx="12" cy="12" r="3" /><path d="M18 10V14M6 10V14M10 6H14M10 18H14M17.16 8.84L14.41 11.59M9.59 12.41L6.84 15.16M15.16 6.84L12.41 9.59M8.84 17.16L11.59 14.41" /></svg>',
    album: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="2" x2="12" y2="22"></line><line x1="8" y1="2" x2="8" y2="22"></line></svg>',
    ring: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="14" r="7"></circle><path d="M12 7L14 3L10 3L12 7Z"></path></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
    crown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4L6 14H18L22 4L16 9L12 3L8 9L2 4Z"></path><path d="M4 16H20V20H4V16Z"></path></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>',
    umbrella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12A10.06 10.06 0 0 0 12 2 10.06 10.06 0 0 0 2 12"></path><path d="M12 12v8a2 2 0 0 0 4 0"></path><path d="M12 2v10"></path></svg>',
    aperture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="14.31" y1="8" x2="20.05" y2="17.94"></line><line x1="9.69" y1="8" x2="21.17" y2="8"></line><line x1="7.38" y1="12" x2="13.12" y2="2.06"></line><line x1="9.69" y1="16" x2="3.95" y2="6.06"></line><line x1="14.31" y1="16" x2="2.83" y2="16"></line><line x1="16.62" y1="12" x2="10.88" y2="21.94"></line></svg>',
    diamond: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3h12l4 6-10 13L2 9Z"></path><path d="M11 3L8 9l4 13"></path><path d="M13 3l3 6-4 13"></path><path d="M2 9h20"></path></svg>',
    magic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21l18-18"></path><path d="M8 5l2 2"></path><path d="M17 14l2 2"></path><path d="M14 17l2 2"></path><path d="M5 8l2 2"></path></svg>'
};

function initIconPicker() {
    const grid = document.getElementById('icon-grid');
    grid.innerHTML = Object.entries(SVGIcons).map(([key, svg]) => `
        <div class="icon-choice" data-icon="${key}" onclick="selectPackageIcon('${key}')">
            ${svg}
        </div>
    `).join('');
}

function selectPackageIcon(iconKey) {
    document.getElementById('pkg-icon-value').value = iconKey;
    document.getElementById('pkg-icon-preview').innerHTML = SVGIcons[iconKey];
    document.getElementById('icon-picker-modal').style.display = 'none';
}

function openPackageEditor(pkg = null) {
    document.getElementById('package-editor-modal').style.display = 'flex';
    document.getElementById('pkg-features-container').innerHTML = ''; // Clear features
    
    if (!document.getElementById('icon-grid').innerHTML.trim()) {
        initIconPicker();
    }
    
    if (pkg) {
        document.getElementById('package-modal-title').textContent = 'Edit Package';
        document.getElementById('pkg-edit-id').value = pkg.id;
        document.getElementById('pkg-name').value = pkg.title || '';
        document.getElementById('pkg-category').value = pkg.categoryId || 'essential';
        document.getElementById('pkg-price').value = pkg.price || '';
        document.getElementById('pkg-note').value = pkg.priceNote || '';
        document.getElementById('pkg-featured').checked = !!pkg.isFeatured;
        selectPackageIcon(pkg.icon || 'camera');
        
        if (pkg.features && Array.isArray(pkg.features)) {
            pkg.features.forEach(f => addFeatureInput(typeof f === 'string' ? f : f.text, typeof f === 'object' ? f.highlighted : false));
        }
    } else {
        document.getElementById('package-modal-title').textContent = 'Create New Package';
        document.getElementById('pkg-edit-id').value = '';
        document.getElementById('pkg-name').value = '';
        document.getElementById('pkg-price').value = '';
        document.getElementById('pkg-note').value = '';
        document.getElementById('pkg-featured').checked = false;
        selectPackageIcon('camera');
        addFeatureInput('', false); // Add one empty feature by default
    }
}

function closePackageEditor() {
    document.getElementById('package-editor-modal').style.display = 'none';
}

function addFeatureInput(text = '', highlighted = false) {
    const container = document.getElementById('pkg-features-container');
    const row = document.createElement('div');
    row.className = 'feature-input-row';
    row.innerHTML = `
        <button class="admin-btn admin-btn-sm" style="padding: 0.4rem; background: ${highlighted ? 'var(--admin-gold-dim)' : 'var(--admin-surface-3)'}; color: ${highlighted ? 'var(--admin-gold)' : 'var(--admin-text)'};" onclick="toggleFeatureHighlight(this)" title="Toggle Highlighted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
        <input type="text" class="admin-form-input pkg-feature-text" value="${escapeHtml(text)}" placeholder="Feature description">
        <input type="hidden" class="pkg-feature-highlight" value="${highlighted ? 'true' : 'false'}">
        <button class="admin-btn admin-btn-sm admin-btn-danger" style="padding: 0.4rem;" onclick="this.parentElement.remove()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;
    container.appendChild(row);
}

function toggleFeatureHighlight(btn) {
    const hidden = btn.parentElement.querySelector('.pkg-feature-highlight');
    if (hidden.value === 'true') {
        hidden.value = 'false';
        btn.style.background = 'var(--admin-surface-3)';
        btn.style.color = 'var(--admin-text)';
    } else {
        hidden.value = 'true';
        btn.style.background = 'var(--admin-gold-dim)';
        btn.style.color = 'var(--admin-gold)';
    }
}

async function savePackageData() {
    const id = document.getElementById('pkg-edit-id').value;
    const title = getInputValue('pkg-name');
    const categoryId = document.getElementById('pkg-category').value;
    const price = getInputValue('pkg-price');
    const priceNote = getInputValue('pkg-note');
    const icon = document.getElementById('pkg-icon-value').value;
    const isFeatured = document.getElementById('pkg-featured').checked;
    
    if (!title || !price) {
        showToast('Please provide a package title and price', 'error');
        return;
    }
    
    // Gather features
    const features = [];
    document.querySelectorAll('.feature-input-row').forEach(row => {
        const text = row.querySelector('.pkg-feature-text').value.trim();
        const highlighted = row.querySelector('.pkg-feature-highlight').value === 'true';
        if (text) features.push({ text, highlighted });
    });
    
    const pkgData = {
        title, categoryId, price, priceNote, icon, isFeatured, features,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const btn = document.getElementById('pkg-save-btn');
    btn.disabled = true;
    
    try {
        if (id) {
            await updatePackage(id, pkgData);
            showToast('Package updated successfully', 'success');
        } else {
            pkgData.order = Date.now(); // default order
            await savePackage(pkgData);
            showToast('Package created successfully', 'success');
        }
        closePackageEditor();
        loadPackagesPanel();
    } catch (error) {
        console.error('Save package error', error);
        showToast('Failed to save package', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function deletePackageHandler(id) {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
        await deletePackage(id);
        showToast('Package deleted', 'success');
        loadPackagesPanel();
    } catch (error) {
        console.error('Delete package error', error);
        showToast('Failed to delete package', 'error');
    }
}

async function loadPackagesPanel() {
    try {
        const grouped = await loadPackagesByCategory();
        
        ['essential', 'premium', 'luxury'].forEach(cat => {
            const grid = document.getElementById(`packages-grid-${cat}`);
            const pkgs = grouped[cat] || [];
            
            if (pkgs.length === 0) {
                grid.innerHTML = '<p class="admin-text-dim">No packages added yet.</p>';
            } else {
                grid.innerHTML = pkgs.map(pkg => `
                    <div class="admin-pkg-card ${pkg.isFeatured ? 'featured' : ''}">
                        ${pkg.isFeatured ? '<div style="position:absolute; top:-10px; right: 10px; background:var(--admin-gold); color:#000; font-size:0.65rem; font-weight:bold; padding:0.15rem 0.5rem; border-radius:10px; text-transform:uppercase;">Featured</div>' : ''}
                        <div class="admin-pkg-card-header">
                            <div>
                                <div class="admin-pkg-title">${escapeHtml(pkg.title)}</div>
                                <div class="admin-pkg-price">${escapeHtml(pkg.price)}</div>
                                ${pkg.priceNote ? `<div class="admin-pkg-note">${escapeHtml(pkg.priceNote)}</div>` : ''}
                            </div>
                            <div style="color: var(--admin-gold);">${SVGIcons[pkg.icon] || SVGIcons.camera}</div>
                        </div>
                        <ul class="admin-pkg-features">
                            ${(pkg.features || []).map(f => {
                                const text = typeof f === 'string' ? f : f.text;
                                const hl = typeof f === 'object' && f.highlighted ? 'class="highlight"' : '';
                                return `<li ${hl}>• ${escapeHtml(text)}</li>`;
                            }).join('')}
                        </ul>
                        <div class="admin-pkg-actions">
                            <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick='openPackageEditor(${JSON.stringify(pkg).replace(/'/g, "&#39;")})'>Edit</button>
                            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deletePackageHandler('${pkg.id}')">Delete</button>
                        </div>
                    </div>
                `).join('');
            }
        });
    } catch (error) {
        console.error('Load packages error', error);
        showToast('Failed to load packages', 'error');
    }
}
