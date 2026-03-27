# ShokherSrity — Complete Project Documentation

> **Last Updated:** March 27, 2026
> **Purpose:** This file documents the entire ShokherSrity project so any developer or AI can fully understand and continue development.

---

## 1. PROJECT OVERVIEW

**ShokherSrity** is a premium wedding photography website for a Bangladesh-based studio run by **Kowsik Saha** and **Dip Pal**. The site is a **static HTML/CSS/JS website** enhanced with **Firebase backend services** for content management, contact forms, analytics, and an admin CMS panel.

### Business Info
- **Brand:** ShokherSrity (শখের স্মৃতি)
- **Location:** Dhaka, Bangladesh (available nationwide)
- **Contact:** Kowsik: +880 1799-334656 | Dip: +880 1700-504456
- **Email:** shokhersrity@gmail.com
- **Social:** Facebook & Instagram: @shokhersrity
- **WhatsApp:** +8801799334656

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| **Fonts** | Google Fonts: Cormorant Garamond, Inter, Great Vibes |
| **Animations** | AOS (Animate On Scroll) library v2.3.1 |
| **Backend** | Firebase (no server) |
| **Database** | Firebase Realtime Database (text content, submissions) |
| **Image Storage** | Firebase Firestore (base64 encoded images) |
| **Auth** | Firebase Authentication (Email/Password) |
| **Analytics** | Firebase Analytics |
| **CLI** | Firebase CLI v15.11.0 (installed globally via npm) |
| **Hosting** | Static files (currently local, can deploy to Firebase Hosting) |

### Firebase SDK
All pages use **Firebase CDN (compat mode v10.14.1)**:
```html
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics-compat.js"></script>
```

---

## 3. FIREBASE PROJECT CONFIGURATION

```javascript
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
```

- **Firebase Console:** https://console.firebase.google.com/project/shokher-srity
- **Firebase CLI Project:** `shokher-srity` (configured in `.firebaserc`)

---

## 4. FILE STRUCTURE

```
Shokher Srity web site/
│
├── index.html              # Homepage (hero, about, featured work, testimonials, CTA)
├── gallery.html            # Gallery page (masonry grid, 19 images, lightbox, filters)
├── packages.html           # Packages page (Silver ৳15K, Golden ৳20K, Platinum ৳25K)
├── contact.html            # Contact page (form, FAQ, business hours, map, inquiry cards)
├── admin.html              # Admin CMS panel (auth-gated, dark theme)
│
├── style.css               # Main stylesheet (68KB, all pages share this)
├── admin.css               # Admin panel styles (23KB, dark glassmorphism theme)
├── script.js               # Main JS (24KB, animations, cursor, preloader, gallery, etc.)
├── firebase.js             # Firebase integration (17KB, auth, DB, Firestore, CRUD)
├── admin.js                # Admin panel logic (30KB, auth flow, content editor, gallery mgr)
│
├── firebase.json           # Firebase deploy config (database + firestore rules)
├── .firebaserc             # Firebase project alias → "shokher-srity"
├── database.rules.json     # Realtime Database security rules (DEPLOYED)
├── firestore.rules         # Firestore security rules (DEPLOYED)
│
├── attached_assets/        # Static image assets
│   ├── logo.webp           # Site favicon/logo (6KB)
│   ├── 0.webp              # Hero background image (299KB)
│   └── 1.webp - 19.webp    # Gallery images (80KB - 1MB each, 21 total)
│
├── .gitignore              # Git ignore rules
├── LICENSE.md              # License file
├── DESIGN_IMPROVEMENTS_SUMMARY.md  # Previous UI/UX improvement log
└── PROJECT_DOCUMENTATION.md        # THIS FILE
```

---

## 5. PAGE DESCRIPTIONS

### index.html (Homepage)
- **Preloader** with ShokherSrity logo animation
- **Custom cursor** (golden dot + ring that follows mouse)
- **Scroll progress bar** at top
- **Sticky header** with nav: Home, Gallery, Packages, Contact
- **Hero section:** Full-screen background image (0.webp), title "ShokherSrity", tagline "Capture your best moment", CTAs: View Gallery + Book Now
- **About section:** 2-column layout with image + text, stats (5+ years, 100+ weddings, 5000+ moments)
- **Featured work:** 4-image grid with category overlays
- **Testimonials:** 3 cards (Sarah & Rahul, Nadia & Asif, Farah & Adil)
- **CTA section:** "Ready to Capture Your Special Day?" with Book a Consultation button
- **Footer:** 4-column (brand, quick links, services, contact), social links, copyright
- **Floating WhatsApp button** (bottom-right)
- **Back to Top button** with scroll progress ring

### gallery.html (Gallery)
- **Gallery header** with "Our Gallery" title
- **Filter buttons:** All, Ceremony, Portraits, Reception, Details
- **Masonry grid:** 19 images with category overlays, hover zoom icons
- **Lightbox:** Full-screen image viewer with prev/next navigation
- Same footer, WhatsApp, back-to-top as homepage

### packages.html (Packages)
- **3 package cards:** Silver (৳15,000), Golden (৳20,000 - "Most Popular"), Platinum (৳25,000)
- Each card has: icon, price, feature list with checkmarks, "Book Now" button
- **Additional info bar:** Quick Delivery, Secure Backup, 24/7 Support
- **Custom package CTA:** dark section with "Discuss Your Requirements" link

### contact.html (Contact)
- **Contact cards:** Phone, Email, Location (3 cards)
- **Business hours** with grid layout
- **Quick inquiry cards:** Wedding Photography, Portrait Session, Event Coverage (WhatsApp links)
- **Contact form:** Name*, Email*, Phone, Service dropdown, Message*, Submit button
  - Form saves to Firebase: `contact_submissions/`
  - Success/error messages with animations
- **Social proof stats:** 100% satisfaction, 5+ years, 100+ weddings
- **FAQ accordion:** 5 questions with expand/collapse
- **Google Maps embed** showing Dhaka

### admin.html (Admin Panel)
- **Login screen:** Email/password auth gate, ShokherSrity branding
- **Dashboard** (visible only after auth + admin verification):
  - **Top bar:** Logo, CMS badge, user info, View Site link, Logout button
  - **Tab navigation:** Overview, Content, Gallery, Submissions, Admins
  - **Overview tab:** Stats cards (submissions, visits, images, inquiries), storage usage bar, recent submissions
  - **Content tab:** Editable fields for hero, about, contact, packages content → saves to RTDB `site_content/`
  - **Gallery tab:** Drag-and-drop image upload zone, auto-compression, image grid with delete
  - **Submissions tab:** Table of contact form submissions, status dropdowns (new/read/responded), delete
  - **Admins tab:** Admin list with UIDs, add new admin form, remove admin button
  - **Bootstrap notice:** Shown when no admins exist, allows first admin self-registration

---

## 6. FIREBASE DATABASE STRUCTURE

### Realtime Database (Text Content)

```
shokher-srity-default-rtdb/
│
├── admins/                          # Admin whitelist (UID-keyed)
│   └── {firebase_auth_uid}/
│       ├── email: "admin@example.com"
│       ├── addedAt: "2026-03-27T..."
│       └── addedBy: "bootstrap" | {uid}
│
├── site_content/                    # All editable website content
│   ├── hero/
│   │   ├── title: "ShokherSrity"
│   │   └── tagline: "Capture your best moment"
│   ├── about/
│   │   ├── title: "Where Every Moment Becomes Art"
│   │   ├── paragraph1: "..."
│   │   ├── paragraph2: "..."
│   │   ├── signature: "Capturing the essence of love..."
│   │   └── stats/
│   │       ├── years: "5+"
│   │       ├── weddings: "100+"
│   │       └── moments: "5000+"
│   ├── contact/
│   │   ├── phones: ["+880 1799-334656", "+880 1700-504456"]
│   │   ├── email: "shokhersrity@gmail.com"
│   │   └── address: "Dhaka, Bangladesh"
│   ├── packages/
│   │   ├── silver/  { price: "৳15,000" }
│   │   ├── golden/  { price: "৳20,000" }
│   │   └── platinum/ { price: "৳25,000" }
│   ├── lastUpdated: "2026-03-27T..."
│   └── updatedBy: "admin@example.com"
│
├── contact_submissions/             # Form submissions (public write)
│   └── {push_id}/
│       ├── name, email, phone, service, message
│       ├── page, userAgent, status ("new"/"read"/"responded")
│       ├── timestamp: ServerValue.TIMESTAMP
│       └── createdAt: ISO string
│
├── inquiries/                       # Inquiry card clicks (public write)
│   └── {push_id}/
│       ├── type: "wedding"/"portrait"/"event"
│       ├── page, status
│       └── timestamp
│
└── page_visits/                     # Page view tracking (public write)
    └── {push_id}/
        ├── page, referrer
        ├── timestamp
        └── date: ISO string
```

### Firestore (Images + Admin Mirror)

```
shokher-srity (Firestore)/
│
├── admins/                          # Admin whitelist mirror
│   └── {firebase_auth_uid}/         # Doc ID = UID
│       ├── email: "admin@example.com"
│       ├── addedAt: "2026-03-27T..."
│       └── addedBy: "bootstrap" | {uid}
│
└── images/                          # Gallery images as base64
    └── {auto_id}/
        ├── name: "photo.webp"
        ├── base64: "data:image/webp;base64,..."  (compressed, <1MB)
        ├── category: "ceremony" | "portraits" | "reception" | "details"
        ├── title: "Sacred Beginnings"
        ├── alt: "Wedding Ceremony"
        ├── order: 1774596000000  (timestamp for sorting)
        ├── size: 45000  (bytes)
        └── createdAt: Firestore Timestamp
```

---

## 7. SECURITY RULES (DEPLOYED)

### Realtime Database Rules (database.rules.json)

| Path | Read | Write | Notes |
|------|------|-------|-------|
| `admins/` | Auth + is admin OR no admins exist | Auth + is admin OR no admins exist | Bootstrap condition allows first admin |
| `admins/$uid` | (inherited) | (inherited) | Validated: must have `email` + `addedAt` |
| `site_content/` | **Public** ✅ | Auth + is admin 🔒 | Website content |
| `contact_submissions/` | Auth + is admin 🔒 | **Public** ✅ | Validated: needs `name`, `email`, `message`, `timestamp` |
| `inquiries/` | Auth + is admin 🔒 | **Public** ✅ | Validated: needs `type`, `timestamp` |
| `page_visits/` | Auth + is admin 🔒 | **Public** ✅ | Validated: needs `page`, `timestamp` |
| `$other` (everything else) | **DENIED** 🚫 | **DENIED** 🚫 | Iron-clad deny-all default |

**"is admin" check:** `auth != null && root.child('admins').child(auth.uid).exists()`
**Bootstrap check:** `!root.child('admins').exists()` (allows first write when admins/ is empty)

### Firestore Rules (firestore.rules)

| Collection | Read | Create | Update/Delete | Notes |
|-----------|------|--------|---------------|-------|
| `admins/{uid}` | Auth + is admin 🔒 | Auth + (is admin OR uid == self) | Auth + is admin 🔒 | Self-create for bootstrap |
| `images/{id}` | **Public** ✅ | Auth + is admin 🔒 | Auth + is admin 🔒 | Gallery images |
| `{anything else}` | **DENIED** 🚫 | **DENIED** 🚫 | **DENIED** 🚫 | Iron-clad deny-all |

**"is admin" check:** `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`

### Deploy Commands
```bash
firebase deploy --only database --project shokher-srity
firebase deploy --only firestore:rules --project shokher-srity
```

---

## 8. JAVASCRIPT API REFERENCE

### firebase.js — Global Functions

**Authentication:**
| Function | Returns | Description |
|----------|---------|-------------|
| `adminLogin(email, password)` | Promise | Sign in with Firebase Auth |
| `adminLogout()` | Promise | Sign out |
| `getCurrentUser()` | User\|null | Get current auth user |
| `isAdmin(uid)` | Promise\<boolean\> | Check if UID exists in admins/ whitelist |
| `onAuthStateChanged(callback)` | unsubscribe | Listen for auth state changes |

**Admin Management:**
| Function | Returns | Description |
|----------|---------|-------------|
| `addAdmin(uid, email)` | Promise | Add admin to RTDB + Firestore |
| `removeAdmin(uid)` | Promise | Remove admin from RTDB + Firestore |
| `getAdmins()` | Promise\<object\> | Get all admins (keyed by UID) |
| `bootstrapFirstAdmin()` | Promise | Register current user as first admin (one-time) |

**Content Management (Realtime Database):**
| Function | Returns | Description |
|----------|---------|-------------|
| `loadSiteContent()` | Promise\<object\|null\> | Load all site_content/ |
| `loadContentSection(section)` | Promise\<any\> | Load specific section |
| `saveContentSection(section, data)` | Promise | Save content (admin only) |
| `updateContentSection(section, updates)` | Promise | Partial update (admin only) |

**Image Management (Firestore):**
| Function | Returns | Description |
|----------|---------|-------------|
| `loadImages(category?)` | Promise\<array\> | Load images, optionally filtered |
| `saveImage(imageData)` | Promise | Save image doc (admin only) |
| `updateImage(imageId, updates)` | Promise | Update image doc (admin only) |
| `deleteImage(imageId)` | Promise | Delete image doc (admin only) |
| `compressImage(file, maxWidth?, quality?)` | Promise\<string\> | Compress to base64 (client-side) |
| `getStorageUsage()` | Promise\<{count, estimatedSize, estimatedMB}\> | Estimate Firestore storage used |

**Form & Tracking (Public):**
| Function | Returns | Description |
|----------|---------|-------------|
| `saveContactForm(formData)` | Promise | Save contact submission |
| `saveInquiry(inquiryType)` | Promise | Track inquiry click |
| `trackPageVisit()` | void | Track page view |
| `saveToDatabase(path, data)` | Promise | Generic push to any RTDB path |

**Submissions (Admin):**
| Function | Returns | Description |
|----------|---------|-------------|
| `loadContactSubmissions()` | Promise\<array\> | Last 50 submissions |
| `loadInquiries()` | Promise\<array\> | Last 50 inquiries |
| `loadPageVisits()` | Promise\<array\> | Last 100 page visits |
| `deleteSubmission(id)` | Promise | Delete a submission |
| `updateSubmissionStatus(id, status)` | Promise | Update status (new/read/responded) |

### Global Variables (firebase.js)
```javascript
let app;        // Firebase App instance
let database;   // Realtime Database instance
let firestore;  // Firestore instance
let auth;       // Firebase Auth instance
let analytics;  // Firebase Analytics instance
```

### admin.js — Admin Panel Functions

**UI/Navigation:** `showToast(msg, type, duration)`, `switchPanel(panelId)`, `showLogin()`, `showDashboard(user)`, `showLoginError(msg)`, `hideLoginError()`

**Auth Flow:** `handleLogin(e)`, `handleLogout()`, `handleBootstrap()`

**Data Loading:** `initDashboardData()`, `loadOverviewStats()`, `loadStorageInfo()`, `loadRecentSubmissions()`, `loadContentPanel()`, `loadGalleryPanel()`, `loadSubmissionsPanel()`, `loadAdminsPanel()`

**CRUD:** `handleSaveContent()`, `handleUploadSave()`, `handleDeleteImage(id)`, `handleStatusChange(id, status)`, `handleDeleteSubmission(id)`, `handleAddAdmin()`, `handleRemoveAdmin(uid, email)`

**Utilities:** `escapeHtml(str)`, `formatDate(dateStr)`, `getInputValue(id)`, `setInputValue(id, value)`, `handleFiles(files)`, `setupImageUpload()`

---

## 9. CSS ARCHITECTURE

### style.css (Main Site — 68KB)
- **CSS Variables** defined in `:root`: `--color-black`, `--color-charcoal`, `--color-white`, `--color-cream`, `--color-gold (#D4AF37)`, `--color-text`, `--font-display` (Cormorant Garamond), `--font-body` (Inter), `--font-script` (Great Vibes)
- **Preloader** animation (fade out after page load)
- **Custom cursor** (dot + ring, enlarged on hover over interactive elements)
- **Scroll progress bar** (gold gradient at top)
- **Header/Nav** (transparent → solid on scroll, mobile hamburger menu)
- **Hero section** (full-viewport, parallax-like, golden particles)
- **About section** (2-column responsive, image frame effect, counter animation)
- **Featured grid** (4-column on desktop, responsive)
- **Testimonials** (3-column cards, quote marks, star ratings)
- **Package cards** (3-column, featured card elevated, pricing, checkmark lists)
- **Contact form** (input groups with icons, validation styling, submit loading state)
- **FAQ accordion** (expand/collapse with chevron rotation)
- **Gallery masonry** (CSS columns, lightbox overlay)
- **Footer** (4-column, social icons, copyright)
- **Floating WhatsApp** button (bouncing animation)
- **Back-to-top** button (SVG progress circle)
- **Responsive breakpoints:** 768px, 480px

### admin.css (Admin Panel — 23KB)
- **Dark theme** variables: `--admin-bg: #0a0a0f`, `--admin-surface: #12121a`, `--admin-gold: #D4AF37`
- **Login card** with glassmorphism, gold top border
- **Dashboard layout:** sticky topbar → tab nav → scrollable content
- **Components:** stat cards, form elements, data tables, image grid, toast notifications, storage bars, status badges, admin list items, upload zones, empty states
- **Responsive** at 768px and 480px

---

## 10. SCRIPT.JS OVERVIEW (Main Site JS — 24KB)

Key functionality in `script.js`:
- **Preloader:** Fades out after 1.5s, reveals page
- **Custom cursor:** Tracks mouse movement, enlarges on hover over links/buttons
- **Scroll progress bar:** Updates width based on scroll position
- **Header scroll effect:** Adds `.scrolled` class to header after 50px scroll
- **Mobile menu:** Hamburger toggle with slide animation
- **AOS initialization:** `AOS.init()` for scroll animations
- **Counter animation:** Counts up stat numbers when they enter viewport
- **Gallery filters:** Category filtering with CSS transitions
- **Gallery lightbox:** Full-screen image viewer with keyboard navigation (arrow keys, Escape)
- **FAQ accordion:** Click to expand/collapse answers
- **WhatsApp inquiry cards:** Click handler → opens WhatsApp with pre-filled message
- **Back to top:** Scroll progress ring + click to scroll top
- **Copyright year:** Auto-updates year in footer

---

## 11. SETUP INSTRUCTIONS (FOR NEW DEVELOPERS)

### Prerequisites
- Node.js installed
- Firebase CLI: `npm install -g firebase-tools` (already installed v15.11.0)
- Firebase account with access to project `shokher-srity`

### Initial Setup
```bash
# 1. Login to Firebase CLI
firebase login

# 2. Verify project access
firebase projects:list

# 3. Deploy security rules (if changed)
firebase deploy --only database --project shokher-srity
firebase deploy --only firestore:rules --project shokher-srity
```

### First-Time Admin Setup
1. **Enable Auth:** Firebase Console → Authentication → Sign-in method → Enable Email/Password
2. **Create user:** Authentication → Users → Add user (email + password)
3. **Bootstrap:** Open `admin.html` → login → click "Bootstrap as Admin"
4. This writes your UID to `admins/` in both RTDB and Firestore

### Running Locally
```bash
# Simple static server
npx serve "c:\Users\user\Desktop\Shokher Srity web site" -l 3000

# Then open http://localhost:3000
```

---

## 12. DESIGN PRINCIPLES

- **Color palette:** Black (#0a0a0a), Charcoal (#1a1a2e), Cream (#FAF3E0), Gold (#D4AF37), White (#FFFFFF)
- **Typography:** Cormorant Garamond (headings), Inter (body), Great Vibes (script/brand)
- **Design style:** Premium, elegant, dark backgrounds with gold accents
- **Animations:** Subtle micro-animations (AOS library), custom cursor, preloader, hover effects
- **Mobile-first responsive** with breakpoints at 768px and 480px
- **Admin panel:** Dark glassmorphism theme, consistent with brand but clearly different from public site

---

## 13. KNOWN STATE & PENDING ITEMS

### Completed ✅
- All 5 public pages fully built and styled
- Firebase Realtime Database integration (contact form, inquiries, page visits)
- Firebase CLI installed and authenticated
- Iron-clad security rules deployed (RTDB + Firestore)
- Admin panel built (auth gate, content editor, gallery manager, submissions viewer, admin management)
- Enhanced firebase.js with Auth + Firestore + full CRUD API
- All public pages updated with Auth + Firestore CDN scripts

### Pending / Not Yet Done ⏳
- **Firebase Auth Email/Password not yet enabled** in Firebase Console (user must do manually)
- **No admin account created yet** (user must create in Firebase Console → Auth → Users)
- **Bootstrap not yet performed** (first admin login needed)
- **Site content not yet seeded** in database (currently static HTML, admin can populate via CMS)
- **Gallery images not yet uploaded to Firestore** (currently static from attached_assets/ folder)
- **Public pages don't yet READ from database** (content is still hardcoded HTML — need to add JS to dynamically load from `site_content/` and replace DOM elements)
- **Firebase Hosting not configured** (site can be deployed with `firebase init hosting`)
- **No service worker / PWA** setup
- **No email notifications** for new contact submissions

### Important Notes
- The site currently works as a **static site** — Firebase is used for form submissions, tracking, and the admin CMS
- The admin panel is **functional** but requires Firebase Auth to be enabled first
- Images in the gallery are currently served from `attached_assets/` folder, not from Firestore
- The `site_content/` database node is empty until an admin populates it via the Content Editor tab
- Firebase free tier limits: 1GB Firestore storage, 50K daily reads, 20K daily writes

---

## 14. COMMAND REFERENCE

```bash
# Firebase CLI
firebase login                                              # Authenticate
firebase logout                                             # Sign out
firebase projects:list                                      # List all projects
firebase use shokher-srity                                  # Set active project
firebase deploy --only database                             # Deploy RTDB rules
firebase deploy --only firestore:rules                      # Deploy Firestore rules
firebase deploy --only database,firestore:rules             # Deploy both
firebase database:instances:list --project shokher-srity    # List RTDB instances

# Local development
npx serve . -l 3000                                         # Serve static files on port 3000
```

---

*This documentation was generated to enable seamless project handoff. Any AI or developer reading this file should have complete context to continue development on the ShokherSrity project.*
