/**
 * ShokherSrity Admin Panel - JavaScript
 * Authentication, Content Management, Gallery, Submissions
 */

// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let isAdminVerified = false;
let pendingUploadFiles = [];

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
    
    // Submissions refresh
    document.getElementById('refresh-submissions-btn').addEventListener('click', loadSubmissionsPanel);
    
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
        
        // Packages
        if (content.packages) {
            setInputValue('content-pkg-silver-price', content.packages.silver?.price);
            setInputValue('content-pkg-golden-price', content.packages.golden?.price);
            setInputValue('content-pkg-platinum-price', content.packages.platinum?.price);
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
        const contentData = {
            hero: {
                title: getInputValue('content-hero-title'),
                tagline: getInputValue('content-hero-tagline')
            },
            about: {
                title: getInputValue('content-about-title'),
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
                phones: [
                    getInputValue('content-contact-phone1'),
                    getInputValue('content-contact-phone2')
                ],
                email: getInputValue('content-contact-email'),
                address: getInputValue('content-contact-address')
            },
            packages: {
                silver: { price: getInputValue('content-pkg-silver-price') },
                golden: { price: getInputValue('content-pkg-golden-price') },
                platinum: { price: getInputValue('content-pkg-platinum-price') }
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
