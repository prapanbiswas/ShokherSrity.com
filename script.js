/**
 * ShokherSrity - Premium Wedding Photography
 * Main JavaScript File
 */

// ============================================
// DYNAMIC COPYRIGHT YEAR
// ============================================
function updateCopyrightYear() {
    const currentYear = new Date().getFullYear();
    const copyrightElements = document.querySelectorAll('[data-copyright-year], .copyright-year');
    
    copyrightElements.forEach(element => {
        element.textContent = currentYear;
    });
}

// ============================================
// HEADER SCROLL EFFECT
// ============================================
function initHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    }, { passive: true });
}

// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (!menuBtn || !navLinks) return;
    
    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });
    
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
            menuBtn.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }
    });
}

// ============================================
// SCROLL REVEAL ANIMATION
// ============================================
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    
    if (revealElements.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    revealElements.forEach(el => observer.observe(el));
}

// ============================================
// STAGGER ANIMATION
// ============================================
function initStaggerAnimation() {
    const staggerContainers = document.querySelectorAll('.stagger-children');
    
    if (staggerContainers.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    staggerContainers.forEach(el => observer.observe(el));
}

// ============================================
// STATS COUNTER ANIMATION
// ============================================
function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number[data-count]');
    
    if (statNumbers.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.count);
                const suffix = entry.target.dataset.suffix || '';
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;
                
                const timer = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        entry.target.textContent = target + suffix;
                        clearInterval(timer);
                    } else {
                        entry.target.textContent = Math.floor(current) + suffix;
                    }
                }, 16);
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => observer.observe(stat));
}

// ============================================
// GALLERY FILTER
// ============================================
function initGalleryFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    if (filterBtns.length === 0 || galleryItems.length === 0) return;
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            
            // Filter items
            galleryItems.forEach(item => {
                const category = item.dataset.category;
                
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                    item.style.visibility = 'visible';
                    item.style.opacity = '1';
                    item.style.transform = 'scale(1)';
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.9)';
                    item.style.visibility = 'hidden';
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

// ============================================
// LIGHTBOX
// ============================================
function initLightbox() {
    const lightbox = document.querySelector('.lightbox');
    if (!lightbox) return;
    
    const lightboxImg = lightbox.querySelector('.lightbox-img');
    const lightboxCaption = lightbox.querySelector('.lightbox-caption');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    const lightboxPrev = lightbox.querySelector('.lightbox-prev');
    const lightboxNext = lightbox.querySelector('.lightbox-next');
    
    const galleryItems = document.querySelectorAll('.gallery-item, .featured-item');
    let currentIndex = 0;
    let visibleItems = [];
    
    // Open lightbox
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            // Get currently visible items only
            visibleItems = Array.from(galleryItems).filter(i => i.style.display !== 'none');
            currentIndex = visibleItems.indexOf(item);
            
            updateLightbox();
            lightbox.classList.add('active');
            document.body.classList.add('no-scroll');
        });
    });
    
    // Close lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
    
    lightboxClose.addEventListener('click', closeLightbox);
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
    
    // Navigation
    function updateLightbox() {
        if (visibleItems.length === 0) return;
        
        const currentItem = visibleItems[currentIndex];
        const img = currentItem.querySelector('img');
        const caption = currentItem.querySelector('.masonry-title, .featured-title')?.textContent || '';
        
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxCaption.textContent = caption;
    }
    
    function prevImage() {
        currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
        updateLightbox();
    }
    
    function nextImage() {
        currentIndex = (currentIndex + 1) % visibleItems.length;
        updateLightbox();
    }
    
    lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        prevImage();
    });
    
    lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        nextImage();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                prevImage();
                break;
            case 'ArrowRight':
                nextImage();
                break;
        }
    });
}

// ============================================
// PARALLAX EFFECT
// ============================================
function initParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    // Check if device supports hover (not touch)
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * 0.4;
        
        if (scrolled < window.innerHeight) {
            hero.style.backgroundPositionY = `${rate}px`;
        }
    }, { passive: true });
}

// ============================================
// SMOOTH SCROLL
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// IMAGE LAZY LOADING
// ============================================
function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    if (lazyImages.length === 0) return;
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '100px 0px'
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));
}

// ============================================
// AOS INITIALIZATION
// ============================================
function initAOS() {
    if (typeof AOS === 'undefined') return;
    
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 100,
        disable: window.matchMedia('(pointer: coarse)').matches ? true : false
    });
}

// ============================================
// WHATSAPP BUTTON
// ============================================
function initWhatsAppButton() {
    const whatsappBtns = document.querySelectorAll('.whatsapp-btn, [data-whatsapp]');
    
    whatsappBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const phone = btn.dataset.whatsapp || '8801799334656';
            const message = btn.dataset.message || 'Hello! I would like to inquire about your wedding photography services.';
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        });
    });
}

// ============================================
// INQUIRY CARDS
// ============================================
function initInquiryCards() {
    const inquiryCards = document.querySelectorAll('.inquiry-card');
    
    inquiryCards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.inquiry || 'general';
            const phone = '8801799334656';
            let message = '';
            
            switch(type) {
                case 'wedding':
                    message = 'Hello! I am interested in booking your wedding photography package. Could you please provide more information?';
                    break;
                case 'portrait':
                    message = 'Hello! I would like to book a portrait photography session. What are your availability and rates?';
                    break;
                case 'event':
                    message = 'Hello! I am interested in event photography services. Could you share your package details?';
                    break;
                default:
                    message = 'Hello! I would like to inquire about your photography services.';
            }
            
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        });
    });
}

// ============================================
// NOISE TEXTURE OVERLAY
// ============================================
function addNoiseTexture() {
    const sections = document.querySelectorAll('.hero, .testimonials, .cta-section');
    
    sections.forEach(section => {
        const noise = document.createElement('div');
        noise.className = 'noise-overlay';
        noise.style.cssText = `
            position: absolute;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            opacity: 0.03;
            pointer-events: none;
            z-index: 1;
        `;
        section.style.position = 'relative';
        section.appendChild(noise);
    });
}

// ============================================
// PREFERS REDUCED MOTION
// ============================================
function respectReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
        document.documentElement.style.setProperty('--transition-fast', 'none');
        document.documentElement.style.setProperty('--transition-base', 'none');
        document.documentElement.style.setProperty('--transition-slow', 'none');
    }
}

// ============================================
// PERFORMANCE OPTIMIZATION
// ============================================
function optimizePerformance() {
    // Disable complex animations on low-power devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
        document.body.classList.add('reduce-motion');
    }
    
    // Disable animations on battery save mode
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            if (battery.saveMode) {
                document.body.classList.add('reduce-motion');
            }
        });
    }
}

// ============================================
// INITIALIZE ALL
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Core functionality
    updateCopyrightYear();
    initHeaderScroll();
    initMobileMenu();
    initSmoothScroll();
    
    // Animations
    initScrollReveal();
    initStaggerAnimation();
    initStatsCounter();
    initParallax();
    
    // Gallery
    initGalleryFilter();
    initLightbox();
    initLazyLoading();
    
    // Third-party
    initAOS();
    
    // Interactive elements
    initWhatsAppButton();
    initInquiryCards();
    
    // Enhancements
    addNoiseTexture();
    respectReducedMotion();
    optimizePerformance();
    
    // Page load animation
    document.body.classList.add('loaded');
});

// ============================================
// SERVICE WORKER UNREGISTRATION
// ============================================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
            registration.unregister();
        });
    });
}
