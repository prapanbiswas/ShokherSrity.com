/**
 * ShokherSrity - Firebase Integration (Firestore-Only)
 * All data stored in Firestore — NO Realtime Database
 * Includes: Auth, Firestore CRUD, FCM Notifications, Image Pipeline
 */

// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCuFEa8Z-FACVQOu8pKN4b37W_cVZ-hZx0",
    authDomain: "shokher-srity.firebaseapp.com",
    projectId: "shokher-srity",
    storageBucket: "shokher-srity.firebasestorage.app",
    messagingSenderId: "207020465987",
    appId: "1:207020465987:web:daa3d48d9897182ce7d9f6",
    measurementId: "G-BY2J01BWY5"
};

// VAPID key for FCM Web Push (generate from Firebase Console → Project Settings → Cloud Messaging)
const FCM_VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

// ============================================
// INITIALIZATION
// ============================================
let app, firestore, auth, messaging, analytics;

const SUPER_ADMIN_UID = 'SpiTXKQbttaRX6qhPhkiXxQGhn32';

try {
    app = firebase.initializeApp(firebaseConfig);

    // Firestore
    if (typeof firebase.firestore === 'function') {
        firestore = firebase.firestore();
        // Enable offline persistence for faster loads
        firestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Firestore persistence: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Firestore persistence: Browser not supported');
            }
        });
        console.log('✅ Firestore initialized');
    }

    // Auth
    if (typeof firebase.auth === 'function') {
        auth = firebase.auth();
        console.log('✅ Firebase Auth initialized');
    }

    // Cloud Messaging
    if (typeof firebase.messaging === 'function') {
        try {
            messaging = firebase.messaging();
            console.log('✅ Firebase Messaging initialized');
        } catch (e) {
            console.warn('⚠️ FCM not available:', e.message);
        }
    }

    // Analytics
    if (typeof firebase.analytics === 'function') {
        analytics = firebase.analytics();
    }

    console.log('✅ Firebase initialized successfully (Firestore-only mode)');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// ============================================
// AUTHENTICATION HELPERS
// ============================================

function adminLogin(email, password) {
    if (!auth) return Promise.reject('Auth not initialized');
    return auth.signInWithEmailAndPassword(email, password);
}

function adminLogout() {
    if (!auth) return Promise.reject('Auth not initialized');
    return auth.signOut();
}

function getCurrentUser() {
    return auth ? auth.currentUser : null;
}

async function isAdmin(uid) {
    if (!uid) return false;
    if (uid === SUPER_ADMIN_UID) return true;
    if (!firestore) return false;
    try {
        const doc = await firestore.collection('admins').doc(uid).get();
        return doc.exists;
    } catch (error) {
        console.error('Admin check failed:', error);
        return false;
    }
}

function onAuthStateChanged(callback) {
    if (!auth) return;
    return auth.onAuthStateChanged(callback);
}

// ============================================
// ADMIN MANAGEMENT (Firestore)
// ============================================

async function addAdmin(uid, email) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    const adminData = {
        email: email,
        addedAt: new Date().toISOString(),
        addedBy: getCurrentUser()?.uid || 'system'
    };
    await firestore.collection('admins').doc(uid).set(adminData);
    return adminData;
}

async function removeAdmin(uid) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    await firestore.collection('admins').doc(uid).delete();
}

async function getAdmins() {
    if (!firestore) return {};
    const snapshot = await firestore.collection('admins').get();
    const admins = {};
    snapshot.docs.forEach(doc => {
        admins[doc.id] = doc.data();
    });
    return admins;
}

async function bootstrapFirstAdmin() {
    const user = getCurrentUser();
    if (!user) throw new Error('Must be logged in');

    // Check if admins already exist
    const snapshot = await firestore.collection('admins').limit(1).get();
    if (!snapshot.empty) {
        throw new Error('Admins already exist. Cannot bootstrap.');
    }

    const adminData = {
        email: user.email,
        addedAt: new Date().toISOString(),
        addedBy: 'bootstrap'
    };

    await firestore.collection('admins').doc(user.uid).set(adminData);
    console.log('✅ First admin bootstrapped:', user.email);
    return adminData;
}

// ============================================
// SITE CONTENT (Firestore — single document)
// ============================================

// Cache to avoid redundant reads
let _siteContentCache = null;
let _siteContentCacheTime = 0;
const CONTENT_CACHE_TTL = 60000; // 1 minute

async function loadSiteContent() {
    if (!firestore) return null;

    // Return cached if fresh
    const now = Date.now();
    if (_siteContentCache && (now - _siteContentCacheTime) < CONTENT_CACHE_TTL) {
        return _siteContentCache;
    }

    try {
        const doc = await firestore.collection('site_content').doc('main').get();
        if (doc.exists) {
            _siteContentCache = doc.data();
            _siteContentCacheTime = now;
            return _siteContentCache;
        }
        return null;
    } catch (error) {
        console.error('Failed to load site content:', error);
        return null;
    }
}

async function loadContentSection(section) {
    const content = await loadSiteContent();
    return content ? content[section] || null : null;
}

async function saveContentSection(section, data) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    if (section === '' || !section) {
        // Save entire content document
        await firestore.collection('site_content').doc('main').set(data, { merge: true });
    } else {
        await firestore.collection('site_content').doc('main').update({
            [section]: data
        });
    }
    // Invalidate cache
    _siteContentCache = null;
    _siteContentCacheTime = 0;
}

async function updateContentSection(section, updates) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    const updateObj = {};
    for (const [key, value] of Object.entries(updates)) {
        updateObj[`${section}.${key}`] = value;
    }
    await firestore.collection('site_content').doc('main').update(updateObj);
    _siteContentCache = null;
    _siteContentCache = null;
    _siteContentCacheTime = 0;
}

// ============================================
// PACKAGES MANAGEMENT (Firestore)
// ============================================

async function savePackage(packageData) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    packageData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    return firestore.collection('packages').add(packageData);
}

async function loadPackages() {
    if (!firestore) return [];
    try {
        const snapshot = await firestore.collection('packages').orderBy('order', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Failed to load packages:', error);
        return [];
    }
}

async function updatePackage(packageId, updates) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    return firestore.collection('packages').doc(packageId).update(updates);
}

async function deletePackage(packageId) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    return firestore.collection('packages').doc(packageId).delete();
}

async function loadPackagesByCategory() {
    const packages = await loadPackages();
    const grouped = { essential: [], premium: [], luxury: [] };
    packages.forEach(pkg => {
        const cat = pkg.categoryId || 'essential';
        if (grouped[cat]) grouped[cat].push(pkg);
    });
    return grouped;
}

// ============================================
// IMAGE MANAGEMENT (Firestore + base64)
// ============================================

// Image cache using sessionStorage
const IMAGE_CACHE_KEY = 'ss_img_cache_';

function getCachedImage(imageId) {
    try {
        return sessionStorage.getItem(IMAGE_CACHE_KEY + imageId);
    } catch {
        return null;
    }
}

function setCachedImage(imageId, base64) {
    try {
        sessionStorage.setItem(IMAGE_CACHE_KEY + imageId, base64);
    } catch {
        // sessionStorage full — clear old entries
        try {
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith(IMAGE_CACHE_KEY)) {
                    keysToRemove.push(key);
                }
            }
            // Remove oldest half
            keysToRemove.slice(0, Math.ceil(keysToRemove.length / 2)).forEach(k => {
                sessionStorage.removeItem(k);
            });
            sessionStorage.setItem(IMAGE_CACHE_KEY + imageId, base64);
        } catch {
            // Give up caching
        }
    }
}

async function loadImages(category = null) {
    if (!firestore) return [];
    try {
        let query = firestore.collection('images').orderBy('order', 'asc');
        if (category) {
            query = query.where('category', '==', category);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            // Try loading from cache first
            const cached = getCachedImage(doc.id);
            if (cached) {
                return { id: doc.id, ...data, base64: cached };
            }
            // Cache for future use
            if (data.base64) {
                setCachedImage(doc.id, data.base64);
            }
            return { id: doc.id, ...data };
        });
    } catch (error) {
        console.error('Failed to load images:', error);
        return [];
    }
}

async function saveImage(imageData) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    imageData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    return firestore.collection('images').add(imageData);
}

async function updateImage(imageId, updates) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    return firestore.collection('images').doc(imageId).update(updates);
}

async function deleteImage(imageId) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    // Clear from cache
    try { sessionStorage.removeItem(IMAGE_CACHE_KEY + imageId); } catch {}
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

                // Check size - Firestore docs max ~1MB
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

async function getStorageUsage() {
    if (!firestore) return { count: 0, estimatedSize: 0, estimatedMB: '0' };
    try {
        const snapshot = await firestore.collection('images').get();
        let totalSize = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.size) {
                totalSize += data.size;
            } else if (data.base64) {
                totalSize += Math.round((data.base64.length * 3) / 4);
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
// CONTACT FORM & SUBMISSIONS (Firestore)
// ============================================

function saveContactForm(formData) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    return firestore.collection('contact_submissions').add({
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || '',
        service: formData.service || '',
        message: formData.message || '',
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        status: 'new',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString()
    });
}

async function loadContactSubmissions() {
    if (!firestore) return [];
    try {
        const snapshot = await firestore.collection('contact_submissions')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Failed to load submissions:', error);
        return [];
    }
}

async function deleteSubmission(id) {
    if (!firestore) return;
    return firestore.collection('contact_submissions').doc(id).delete();
}

async function updateSubmissionStatus(id, status) {
    if (!firestore) return;
    return firestore.collection('contact_submissions').doc(id).update({ status });
}

// ============================================
// INQUIRIES (Firestore)
// ============================================

function saveInquiry(inquiryType) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    return firestore.collection('inquiries').add({
        type: inquiryType,
        page: window.location.pathname,
        status: 'new',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString()
    });
}

async function loadInquiries() {
    if (!firestore) return [];
    try {
        const snapshot = await firestore.collection('inquiries')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Failed to load inquiries:', error);
        return [];
    }
}

// ============================================
// PAGE VISITS (Firestore)
// ============================================

function trackPageVisit() {
    if (!firestore) return;
    firestore.collection('page_visits').add({
        page: window.location.pathname || 'index.html',
        referrer: document.referrer || 'direct',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString()
    }).catch(err => {
        console.log('Page visit tracking skipped');
    });
}

async function loadPageVisits() {
    if (!firestore) return [];
    try {
        const snapshot = await firestore.collection('page_visits')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Failed to load visits:', error);
        return [];
    }
}

// ============================================
// FIREBASE CLOUD MESSAGING (FCM)
// ============================================

/**
 * Request notification permission and register FCM token
 */
async function requestNotificationPermission() {
    if (!messaging) {
        console.warn('FCM not available');
        return null;
    }

    // Check if already denied
    if (Notification.permission === 'denied') {
        console.log('Notifications denied by user');
        return null;
    }

    // Already granted — just get token
    if (Notification.permission === 'granted') {
        return await registerFCMToken();
    }

    // Request permission
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Notification permission granted');
            return await registerFCMToken();
        } else {
            console.log('Notification permission denied');
            return null;
        }
    } catch (error) {
        console.error('Notification permission error:', error);
        return null;
    }
}

/**
 * Register FCM token in Firestore
 */
async function registerFCMToken() {
    if (!messaging || !firestore) return null;

    try {
        const token = await messaging.getToken({
            vapidKey: FCM_VAPID_KEY
        });

        if (token) {
            // Save token to Firestore
            await firestore.collection('fcm_tokens').doc(token).set({
                token: token,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log('✅ FCM token registered');
            return token;
        }
    } catch (error) {
        console.error('FCM token registration failed:', error);
    }
    return null;
}

/**
 * Listen for foreground messages
 */
function onForegroundMessage(callback) {
    if (!messaging) return;
    messaging.onMessage((payload) => {
        console.log('📩 Foreground message:', payload);
        if (callback) callback(payload);
        else showNotificationBanner(payload);
    });
}

/**
 * Show in-page notification banner for foreground messages
 */
function showNotificationBanner(payload) {
    const { title, body } = payload.notification || {};
    if (!title) return;

    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    banner.innerHTML = `
        <div class="notification-banner-content">
            <div class="notification-banner-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 01-3.46 0"></path>
                </svg>
            </div>
            <div>
                <strong>${title}</strong>
                <p>${body || ''}</p>
            </div>
            <button class="notification-banner-close" onclick="this.parentElement.parentElement.remove()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;

    // Style
    banner.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 1px solid rgba(212,175,55,0.3);
        border-radius: 12px; padding: 1rem 1.25rem;
        color: #e0e0e0; font-family: 'Inter', sans-serif;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        animation: slideInRight 0.4s ease;
        max-width: 360px;
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .notification-banner-content {
            display: flex; align-items: flex-start; gap: 0.75rem;
        }
        .notification-banner-content strong {
            color: #D4AF37; font-size: 0.9rem; display: block; margin-bottom: 0.25rem;
        }
        .notification-banner-content p {
            font-size: 0.8rem; color: #aaa; margin: 0;
        }
        .notification-banner-icon {
            flex-shrink: 0; color: #D4AF37;
        }
        .notification-banner-close {
            background: none; border: none; color: #666; cursor: pointer;
            padding: 0; flex-shrink: 0; margin-left: auto;
        }
        .notification-banner-close:hover { color: #fff; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(banner);

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (banner.parentElement) {
            banner.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => banner.remove(), 300);
        }
    }, 8000);
}

// ============================================
// NOTIFICATIONS - Admin (Firestore)
// ============================================

async function saveNotification(notifData) {
    if (!firestore) return Promise.reject('Firestore not initialized');
    return firestore.collection('notifications').add({
        title: notifData.title,
        body: notifData.body,
        link: notifData.link || '',
        sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        sentBy: getCurrentUser()?.email || 'admin',
        status: 'pending'
    });
}

async function loadNotifications() {
    if (!firestore) return [];
    try {
        const snapshot = await firestore.collection('notifications')
            .orderBy('sentAt', 'desc')
            .limit(20)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Failed to load notifications:', error);
        return [];
    }
}

async function getFCMTokenCount() {
    if (!firestore) return 0;
    try {
        const snapshot = await firestore.collection('fcm_tokens').get();
        return snapshot.size;
    } catch {
        return 0;
    }
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
                    setTimeout(() => { successMessage.style.display = 'none'; }, 300);
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
                    setTimeout(() => { errorMessage.style.display = 'none'; }, 300);
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
// INQUIRY CARDS (with Firestore tracking)
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
// DYNAMIC CONTENT LOADING (Public Pages)
// ============================================

async function applySiteContent() {
    if (window.location.pathname.includes('admin')) return;

    try {
        const content = await loadSiteContent();
        if (!content) {
            console.log('ℹ️ No site_content in Firestore — using static HTML');
            return;
        }

        const page = detectCurrentPage();

        // Apply global custom background images
        if (content.hero?.backgroundImage && (page === 'index' || page === 'gallery' || page === 'packages' || page === 'contact')) {
            document.documentElement.style.setProperty('--hero-bg-image', `url(${content.hero.backgroundImage})`);
            const heroEl = document.querySelector('.hero');
            if (heroEl) {
                // If the hero has a hardcoded background-image in inline style, overwrite it
                heroEl.style.backgroundImage = `url(${content.hero.backgroundImage})`;
            }
        }
        
        // Apply hero content (index page)
        if (content.hero && page === 'index') {
            setTextBySelector('.hero-title', content.hero.title);
            setTextBySelector('.hero-tagline', content.hero.tagline);
        }

        // Apply about content (index page)
        if (content.about && page === 'index') {
            if (content.about.image) {
                const aboutImg = document.querySelector('.about-image img');
                if (aboutImg) aboutImg.src = content.about.image;
            }

            const aboutTitle = document.querySelector('.about-content .section-title');
            if (aboutTitle && content.about.title) {
                const parts = content.about.title.split(' ');
                const lastWord = parts.pop();
                aboutTitle.innerHTML = `${parts.join(' ')} <span class="text-gradient">${lastWord}</span>`;
            }

            const paragraphs = document.querySelectorAll('.about-content > p:not(.about-signature)');
            if (paragraphs[0] && content.about.paragraph1) paragraphs[0].textContent = content.about.paragraph1;
            if (paragraphs[1] && content.about.paragraph2) paragraphs[1].textContent = content.about.paragraph2;

            const sig = document.querySelector('.about-signature');
            if (sig && content.about.signature) sig.textContent = `"${content.about.signature}"`;

            if (content.about.stats) {
                const statItems = document.querySelectorAll('.stat-item');
                if (statItems[0] && content.about.stats.years) {
                    const numEl = statItems[0].querySelector('.stat-number');
                    if (numEl) {
                        numEl.textContent = content.about.stats.years;
                        numEl.dataset.count = parseInt(content.about.stats.years) || 5;
                        numEl.dataset.suffix = content.about.stats.years.replace(/[0-9]/g, '');
                    }
                }
                if (statItems[1] && content.about.stats.weddings) {
                    const numEl = statItems[1].querySelector('.stat-number');
                    if (numEl) {
                        numEl.textContent = content.about.stats.weddings;
                        numEl.dataset.count = parseInt(content.about.stats.weddings) || 100;
                        numEl.dataset.suffix = content.about.stats.weddings.replace(/[0-9]/g, '');
                    }
                }
                if (statItems[2] && content.about.stats.moments) {
                    const numEl = statItems[2].querySelector('.stat-number');
                    if (numEl) {
                        numEl.textContent = content.about.stats.moments;
                        numEl.dataset.count = parseInt(content.about.stats.moments) || 5000;
                        numEl.dataset.suffix = content.about.stats.moments.replace(/[0-9]/g, '');
                    }
                }
            }
        }

        // Apply dynamic packages (packages page)
        if (page === 'packages') {
            if (typeof renderDynamicPackages === 'function') {
                await renderDynamicPackages();
            } else {
                // If function not loaded yet, fallback to doing it here
                const container = document.getElementById('dynamic-packages-container');
                if (container) {
                    container.innerHTML = '<div style="text-align:center; width:100%; padding: 4rem;"><div class="spinner"></div><p>Loading Packages...</p></div>';
                    // The actual rendering logic will be in script.js which is loaded after firebase.js
                }
            }
        }

        // Apply contact info (contact page)
        if (content.contact && page === 'contact') {
            if (content.contact.phones) {
                const phoneCard = document.querySelector('.contact-card:first-child .contact-card-info');
                if (phoneCard && content.contact.phones.length >= 2) {
                    const name1 = content.contact.phoneNames?.[0] || 'Kowsik';
                    const name2 = content.contact.phoneNames?.[1] || 'Dip';
                    phoneCard.innerHTML = `
                        <p><a href="tel:${content.contact.phones[0].replace(/[^+0-9]/g, '')}">${name1}: ${content.contact.phones[0]}</a></p>
                        <p><a href="tel:${content.contact.phones[1].replace(/[^+0-9]/g, '')}">${name2}: ${content.contact.phones[1]}</a></p>
                    `;
                }
            }
            if (content.contact.email) {
                const emailCard = document.querySelectorAll('.contact-card')[1];
                if (emailCard) {
                    const emailLink = emailCard.querySelector('.contact-card-info p:first-child a');
                    if (emailLink) {
                        emailLink.href = `mailto:${content.contact.email}`;
                        emailLink.textContent = content.contact.email;
                    }
                }
            }
            if (content.contact.address) {
                const locationCard = document.querySelectorAll('.contact-card')[2];
                if (locationCard) {
                    const addressEl = locationCard.querySelector('.contact-card-info p:first-child');
                    if (addressEl) addressEl.textContent = content.contact.address;
                }
            }
        }

        // Apply testimonials (index page)
        if (content.testimonials && page === 'index') {
            const cards = document.querySelectorAll('.testimonial-card');
            content.testimonials.forEach((t, i) => {
                if (cards[i]) {
                    const textEl = cards[i].querySelector('.testimonial-text');
                    if (textEl && t.text) textEl.textContent = `"${t.text}"`;
                    const nameEl = cards[i].querySelector('.testimonial-name');
                    if (nameEl && t.name) nameEl.textContent = t.name;
                    const roleEl = cards[i].querySelector('.testimonial-role');
                    if (roleEl && t.location) roleEl.textContent = t.location;
                    const avatarEl = cards[i].querySelector('.testimonial-avatar');
                    if (avatarEl && t.initials) avatarEl.textContent = t.initials;
                }
            });
        }

        // Apply footer contact info (all pages)
        if (content.contact) {
            const footerEmailLink = document.querySelector('.footer-links a[href^="mailto:"]');
            if (footerEmailLink && content.contact.email) {
                footerEmailLink.href = `mailto:${content.contact.email}`;
                const svgIcon = footerEmailLink.querySelector('svg');
                if (svgIcon) {
                    footerEmailLink.innerHTML = '';
                    footerEmailLink.appendChild(svgIcon);
                    footerEmailLink.appendChild(document.createTextNode('\n                        ' + content.contact.email + '\n                    '));
                }
            }
            if (content.contact.phones && content.contact.phones[0]) {
                const footerPhoneLink = document.querySelector('.footer-links a[href^="tel:"]');
                if (footerPhoneLink) {
                    footerPhoneLink.href = `tel:${content.contact.phones[0].replace(/[^+0-9]/g, '')}`;
                    const svgIcon = footerPhoneLink.querySelector('svg');
                    if (svgIcon) {
                        footerPhoneLink.innerHTML = '';
                        footerPhoneLink.appendChild(svgIcon);
                        footerPhoneLink.appendChild(document.createTextNode('\n                        ' + content.contact.phones[0] + '\n                    '));
                    }
                }
            }
        }

        console.log('✅ Site content applied from Firestore');
    } catch (error) {
        console.warn('⚠️ Failed to apply site content:', error.message);
    }
}

function detectCurrentPage() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('gallery')) return 'gallery';
    if (path.includes('packages')) return 'packages';
    if (path.includes('contact')) return 'contact';
    if (path.includes('admin')) return 'admin';
    return 'index';
}

function setTextBySelector(selector, value) {
    if (!value) return;
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

// ============================================
// GALLERY — Firestore Images (Public)
// ============================================

async function loadFirestoreGallery() {
    if (!window.location.pathname.toLowerCase().includes('gallery')) return;
    if (!firestore) return;

    try {
        const images = await loadImages();
        if (images.length === 0) return;

        const grid = document.querySelector('.masonry-grid');
        if (!grid) return;

        images.forEach(img => {
            const item = document.createElement('div');
            item.className = 'masonry-item';
            item.dataset.category = img.category || 'ceremony';
            item.innerHTML = `
                <img src="${img.base64}" alt="${img.alt || img.title || 'Gallery Image'}" loading="lazy">
                <div class="masonry-overlay">
                    <span class="masonry-category">${(img.category || 'ceremony').charAt(0).toUpperCase() + (img.category || 'ceremony').slice(1)}</span>
                    <h4 class="masonry-title">${img.title || 'Gallery Image'}</h4>
                </div>
                <div class="masonry-zoom">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                </div>
            `;
            grid.appendChild(item);
        });

        console.log(`✅ ${images.length} Firestore images appended to gallery`);
    } catch (error) {
        console.warn('⚠️ Failed to load Firestore gallery:', error.message);
    }
}

// ============================================
// NOTIFICATION PERMISSION PROMPT (Public Pages)
// ============================================

function initNotificationPrompt() {
    // Don't show on admin pages
    if (window.location.pathname.includes('admin')) return;
    // Don't show if already granted or denied
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    // Don't show if user dismissed it recently
    const dismissed = localStorage.getItem('ss_notif_dismissed');
    if (dismissed && (Date.now() - parseInt(dismissed)) < 7 * 24 * 60 * 60 * 1000) return;

    // Show prompt after user has scrolled a bit (less intrusive)
    let prompted = false;
    const scrollHandler = () => {
        if (prompted) return;
        if (window.scrollY > 400) {
            prompted = true;
            window.removeEventListener('scroll', scrollHandler);
            showNotificationPrompt();
        }
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });
}

function showNotificationPrompt() {
    const prompt = document.createElement('div');
    prompt.id = 'notification-prompt';
    prompt.innerHTML = `
        <div class="notif-prompt-card">
            <div class="notif-prompt-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 01-3.46 0"></path>
                </svg>
            </div>
            <div class="notif-prompt-text">
                <strong>Stay Updated!</strong>
                <p>Get notified about our latest work, special offers & events.</p>
            </div>
            <div class="notif-prompt-actions">
                <button class="notif-prompt-allow" id="notif-allow-btn">Allow</button>
                <button class="notif-prompt-dismiss" id="notif-dismiss-btn">Not Now</button>
            </div>
        </div>
    `;

    prompt.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        z-index: 9999; animation: slideUpPrompt 0.5s ease;
        max-width: 420px; width: calc(100% - 2rem);
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUpPrompt {
            from { transform: translateX(-50%) translateY(100px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .notif-prompt-card {
            background: linear-gradient(135deg, #12121a 0%, #1a1a2e 100%);
            border: 1px solid rgba(212,175,55,0.3);
            border-radius: 16px; padding: 1.25rem;
            display: flex; align-items: center; gap: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            font-family: 'Inter', sans-serif;
        }
        .notif-prompt-icon { flex-shrink: 0; }
        .notif-prompt-text strong { color: #D4AF37; font-size: 0.95rem; display: block; }
        .notif-prompt-text p { color: #999; font-size: 0.8rem; margin: 0.25rem 0 0; }
        .notif-prompt-actions { display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0; }
        .notif-prompt-allow {
            background: #D4AF37; color: #0a0a0f; border: none;
            padding: 0.5rem 1.25rem; border-radius: 8px; font-weight: 600;
            font-size: 0.8rem; cursor: pointer; transition: all 0.2s;
        }
        .notif-prompt-allow:hover { background: #e5c44d; transform: scale(1.02); }
        .notif-prompt-dismiss {
            background: none; color: #666; border: none;
            padding: 0.3rem; font-size: 0.7rem; cursor: pointer;
            text-align: center;
        }
        .notif-prompt-dismiss:hover { color: #999; }
        @media (max-width: 480px) {
            .notif-prompt-card { flex-direction: column; text-align: center; }
            .notif-prompt-actions { flex-direction: row; justify-content: center; }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(prompt);

    document.getElementById('notif-allow-btn').addEventListener('click', async () => {
        prompt.remove();
        await requestNotificationPermission();
    });

    document.getElementById('notif-dismiss-btn').addEventListener('click', () => {
        prompt.remove();
        localStorage.setItem('ss_notif_dismissed', Date.now().toString());
    });
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

    // Apply dynamic content from Firestore (public pages only)
    applySiteContent();

    // Load Firestore gallery images (gallery page only)
    loadFirestoreGallery();

    // FCM notification prompt (after scroll, public pages only)
    initNotificationPrompt();

    // Listen for foreground messages
    onForegroundMessage();
});
