/**
 * ShokherSrity - Firebase Integration
 * Realtime Database + Firestore + Authentication
 * Iron-clad admin-only write access
 */

// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCuFEa8Z-FACVQOu8pKN4b37W_cVZ-hZx0",
    authDomain: "shokher-srity.firebaseapp.com",
    databaseURL: "https://shokher-srity-default-rtdb.firebaseio.com",
    projectId: "shokher-srity",
    storageBucket: "shokher-srity.firebasestorage.app",
    messagingSenderId: "207020465987",
    appId: "1:207020465987:web:daa3d48d9897182ce7d9f6",
    measurementId: "G-BY2J01BWY5"
};

// Initialize Firebase
let app, database, firestore, auth, analytics;

try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    
    // Initialize Firestore (if available)
    if (typeof firebase.firestore === 'function') {
        firestore = firebase.firestore();
        console.log('✅ Firestore initialized');
    }
    
    // Initialize Auth (if available)
    if (typeof firebase.auth === 'function') {
        auth = firebase.auth();
        console.log('✅ Firebase Auth initialized');
    }
    
    // Initialize Analytics (optional)
    if (typeof firebase.analytics === 'function') {
        analytics = firebase.analytics();
    }
    
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// ============================================
// AUTHENTICATION HELPERS
// ============================================

/**
 * Sign in with email and password
 */
function adminLogin(email, password) {
    if (!auth) return Promise.reject('Auth not initialized');
    return auth.signInWithEmailAndPassword(email, password);
}

/**
 * Sign out
 */
function adminLogout() {
    if (!auth) return Promise.reject('Auth not initialized');
    return auth.signOut();
}

/**
 * Get current authenticated user
 */
function getCurrentUser() {
    return auth ? auth.currentUser : null;
}

/**
 * Check if current user is an admin (exists in admins/ whitelist)
 */
async function isAdmin(uid) {
    if (!database || !uid) return false;
    try {
        const snapshot = await database.ref('admins/' + uid).once('value');
        return snapshot.exists();
    } catch (error) {
        console.error('Admin check failed:', error);
        return false;
    }
}

/**
 * Listen for auth state changes
 */
function onAuthStateChanged(callback) {
    if (!auth) return;
    return auth.onAuthStateChanged(callback);
}

// ============================================
// ADMIN MANAGEMENT
// ============================================

/**
 * Add a new admin (requires current user to be admin)
 */
async function addAdmin(uid, email) {
    if (!database || !firestore) return Promise.reject('DB not initialized');
    
    const adminData = {
        email: email,
        addedAt: new Date().toISOString(),
        addedBy: getCurrentUser()?.uid || 'system'
    };
    
    // Add to both RTDB and Firestore (mirror)
    await database.ref('admins/' + uid).set(adminData);
    await firestore.collection('admins').doc(uid).set(adminData);
    
    return adminData;
}

/**
 * Remove an admin (requires current user to be admin)
 */
async function removeAdmin(uid) {
    if (!database || !firestore) return Promise.reject('DB not initialized');
    
    await database.ref('admins/' + uid).remove();
    await firestore.collection('admins').doc(uid).delete();
}

/**
 * Get all admins list
 */
async function getAdmins() {
    if (!database) return {};
    const snapshot = await database.ref('admins').once('value');
    return snapshot.val() || {};
}

/**
 * Bootstrap first admin (one-time use)
 * This writes the current user as admin. Only works when admins/ node is empty.
 */
async function bootstrapFirstAdmin() {
    const user = getCurrentUser();
    if (!user) throw new Error('Must be logged in');
    
    // Check if admins already exist
    const snapshot = await database.ref('admins').once('value');
    if (snapshot.exists()) {
        throw new Error('Admins already exist. Cannot bootstrap.');
    }
    
    const adminData = {
        email: user.email,
        addedAt: new Date().toISOString(),
        addedBy: 'bootstrap'
    };
    
    // Write to RTDB
    await database.ref('admins/' + user.uid).set(adminData);
    
    // Write to Firestore
    if (firestore) {
        await firestore.collection('admins').doc(user.uid).set(adminData);
    }
    
    console.log('✅ First admin bootstrapped:', user.email);
    return adminData;
}

// ============================================
// CONTENT MANAGEMENT (Realtime Database)
// ============================================

/**
 * Load all site content from Realtime Database
 */
async function loadSiteContent() {
    if (!database) return null;
    try {
        const snapshot = await database.ref('site_content').once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Failed to load site content:', error);
        return null;
    }
}

/**
 * Load specific content section
 */
async function loadContentSection(section) {
    if (!database) return null;
    try {
        const snapshot = await database.ref('site_content/' + section).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Failed to load section:', section, error);
        return null;
    }
}

/**
 * Save content to a section (admin only)
 */
async function saveContentSection(section, data) {
    if (!database) return Promise.reject('DB not initialized');
    return database.ref('site_content/' + section).set(data);
}

/**
 * Update specific fields in a section
 */
async function updateContentSection(section, updates) {
    if (!database) return Promise.reject('DB not initialized');
    return database.ref('site_content/' + section).update(updates);
}

// ============================================
// IMAGE MANAGEMENT (Firestore)
// ============================================

/**
 * Load all images from Firestore
 */
async function loadImages(category = null) {
    if (!firestore) return [];
    try {
        let query = firestore.collection('images').orderBy('order', 'asc');
        if (category) {
            query = query.where('category', '==', category);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Failed to load images:', error);
        return [];
    }
}

/**
 * Save image to Firestore (admin only)
 */
async function saveImage(imageData) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    imageData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    return firestore.collection('images').add(imageData);
}

/**
 * Update image in Firestore (admin only)
 */
async function updateImage(imageId, updates) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    return firestore.collection('images').doc(imageId).update(updates);
}

/**
 * Delete image from Firestore (admin only)
 */
async function deleteImage(imageId) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    return firestore.collection('images').doc(imageId).delete();
}

/**
 * Compress image to base64 (client-side)
 * @param {File} file - Image file
 * @param {number} maxWidth - Max width in pixels (default 1200)
 * @param {number} quality - JPEG quality 0-1 (default 0.7)
 * @returns {Promise<string>} - base64 data URL
 */
function compressImage(file, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Try WebP first, fall back to JPEG
                let base64 = canvas.toDataURL('image/webp', quality);
                if (!base64.startsWith('data:image/webp')) {
                    base64 = canvas.toDataURL('image/jpeg', quality);
                }
                
                // Check size - Firestore docs max 1MB
                const sizeBytes = Math.round((base64.length * 3) / 4);
                if (sizeBytes > 900000) {
                    // Re-compress with lower quality
                    base64 = canvas.toDataURL('image/jpeg', 0.4);
                }
                
                resolve(base64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Get Firestore storage usage estimate
 */
async function getStorageUsage() {
    if (!firestore) return { count: 0, estimatedSize: 0 };
    try {
        const snapshot = await firestore.collection('images').get();
        let totalSize = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.base64) {
                totalSize += Math.round((data.base64.length * 3) / 4);
            }
            if (data.size) {
                totalSize += data.size;
            }
        });
        return {
            count: snapshot.size,
            estimatedSize: totalSize,
            estimatedMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    } catch (error) {
        console.error('Storage usage check failed:', error);
        return { count: 0, estimatedSize: 0, estimatedMB: '0' };
    }
}

// ============================================
// DATABASE HELPER FUNCTIONS (Legacy - Contact Form)
// ============================================

/**
 * Save data to Firebase Realtime Database
 */
function saveToDatabase(path, data) {
    if (!database) {
        console.error('Database not initialized');
        return Promise.reject('Database not initialized');
    }
    
    data.timestamp = firebase.database.ServerValue.TIMESTAMP;
    data.createdAt = new Date().toISOString();
    
    return database.ref(path).push(data);
}

/**
 * Save contact form submission
 */
function saveContactForm(formData) {
    return saveToDatabase('contact_submissions', {
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || '',
        service: formData.service || '',
        message: formData.message || '',
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        status: 'new'
    });
}

/**
 * Save inquiry card click
 */
function saveInquiry(inquiryType) {
    return saveToDatabase('inquiries', {
        type: inquiryType,
        page: window.location.pathname,
        status: 'new'
    });
}

/**
 * Track page visit
 */
function trackPageVisit() {
    if (!database) return;
    
    const pageData = {
        page: window.location.pathname || 'index.html',
        referrer: document.referrer || 'direct',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toISOString()
    };
    
    database.ref('page_visits').push(pageData).catch(err => {
        console.log('Page visit tracking skipped');
    });
}

// ============================================
// CONTACT FORM HANDLER
// ============================================
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;
    
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = contactForm.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        const successMessage = document.getElementById('form-success');
        const errorMessage = document.getElementById('form-error');
        
        submitBtn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline-flex';
        if (successMessage) successMessage.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'none';
        
        const formData = {
            name: contactForm.querySelector('#contact-name')?.value || '',
            email: contactForm.querySelector('#contact-email')?.value || '',
            phone: contactForm.querySelector('#contact-phone')?.value || '',
            service: contactForm.querySelector('#contact-service')?.value || '',
            message: contactForm.querySelector('#contact-message')?.value || ''
        };
        
        try {
            await saveContactForm(formData);
            
            if (successMessage) {
                successMessage.style.display = 'flex';
                successMessage.classList.add('show');
            }
            
            contactForm.reset();
            
            setTimeout(() => {
                if (successMessage) {
                    successMessage.classList.remove('show');
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                    }, 300);
                }
            }, 5000);
            
        } catch (error) {
            console.error('Form submission error:', error);
            
            if (errorMessage) {
                errorMessage.style.display = 'flex';
                errorMessage.classList.add('show');
            }
            
            setTimeout(() => {
                if (errorMessage) {
                    errorMessage.classList.remove('show');
                    setTimeout(() => {
                        errorMessage.style.display = 'none';
                    }, 300);
                }
            }, 5000);
        } finally {
            submitBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    });
}

// ============================================
// INQUIRY CARDS (with Firebase tracking)
// ============================================
function initFirebaseInquiryTracking() {
    const inquiryCards = document.querySelectorAll('.inquiry-card');
    
    inquiryCards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.inquiry || 'general';
            saveInquiry(type).catch(() => {});
        });
    });
}

// ============================================
// SUBMISSIONS VIEWER (Admin)
// ============================================

/**
 * Load contact submissions (admin only)
 */
async function loadContactSubmissions() {
    if (!database) return [];
    try {
        const snapshot = await database.ref('contact_submissions')
            .orderByChild('timestamp')
            .limitToLast(50)
            .once('value');
        const data = snapshot.val() || {};
        return Object.entries(data).map(([key, val]) => ({ id: key, ...val })).reverse();
    } catch (error) {
        console.error('Failed to load submissions:', error);
        return [];
    }
}

/**
 * Load inquiries (admin only)
 */
async function loadInquiries() {
    if (!database) return [];
    try {
        const snapshot = await database.ref('inquiries')
            .orderByChild('timestamp')
            .limitToLast(50)
            .once('value');
        const data = snapshot.val() || {};
        return Object.entries(data).map(([key, val]) => ({ id: key, ...val })).reverse();
    } catch (error) {
        console.error('Failed to load inquiries:', error);
        return [];
    }
}

/**
 * Load page visits (admin only)
 */
async function loadPageVisits() {
    if (!database) return [];
    try {
        const snapshot = await database.ref('page_visits')
            .orderByChild('timestamp')
            .limitToLast(100)
            .once('value');
        const data = snapshot.val() || {};
        return Object.entries(data).map(([key, val]) => ({ id: key, ...val })).reverse();
    } catch (error) {
        console.error('Failed to load visits:', error);
        return [];
    }
}

/**
 * Delete a submission (admin only)
 */
async function deleteSubmission(id) {
    if (!database) return;
    return database.ref('contact_submissions/' + id).remove();
}

/**
 * Update submission status (admin only)
 */
async function updateSubmissionStatus(id, status) {
    if (!database) return;
    return database.ref('contact_submissions/' + id).update({ status });
}

// ============================================
// INITIALIZE FIREBASE FEATURES
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Track page visit (not on admin page)
    if (!window.location.pathname.includes('admin')) {
        trackPageVisit();
    }
    
    // Initialize contact form (if on contact page)
    initContactForm();
    
    // Track inquiry clicks
    initFirebaseInquiryTracking();
});
