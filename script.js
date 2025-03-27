document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS animation library with enhanced settings and mobile optimization
    AOS.init({
        duration: 800, // Slightly faster animations
        once: true,
        offset: 100, // Reduced offset for mobile
        easing: 'ease-out',
        disable: 'phone', // Disable on very small screens to prevent performance issues
        startEvent: 'DOMContentLoaded', // Start animations when DOM is fully loaded
        mirror: false // No mirror animations on scroll up
    });
    
    // Check if we're on mobile and adjust animation settings if needed
    if (window.innerWidth <= 768) {
        // Further optimize for mobile
        AOS.refresh();
    }

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Header scroll effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Handle image loading
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
        }
    });

    // Page transitions
    const pageContent = document.querySelector('main');
    if (pageContent) {
        pageContent.classList.add('page-transition');
        setTimeout(() => {
            pageContent.classList.add('visible');
        }, 100);
    }

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.page-transition').forEach(element => {
        observer.observe(element);
    });
});

// Contact form handling
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic form validation
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            
            if (!name || !email || !subject || !message) {
                alert('Please fill in all fields');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <h3>Thank You!</h3>
                <p>Your message has been sent successfully.</p>
                <button class="reset-btn" onclick="this.parentElement.remove(); contactForm.reset();">Send Another Message</button>
            `;
            
            contactForm.style.opacity = '0';
            setTimeout(() => {
                contactForm.parentElement.appendChild(successMessage);
                setTimeout(() => {
                    successMessage.style.opacity = '1';
                }, 100);
            }, 300);
        });
    }
});

// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileMenuBtn.classList.remove('active');
            navLinks.classList.remove('active');
        }
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// Add mobile menu styles
const style = document.createElement('style');
style.textContent = `
    .mobile-menu-btn {
        display: none;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
    }
    
    @media (max-width: 768px) {
        .mobile-menu-btn {
            display: block;
            position: absolute;
            right: 1rem;
            top: 1rem;
        }
        
        nav ul {
            display: none;
            width: 100%;
            flex-direction: column;
            text-align: center;
            padding: 1rem 0;
        }
        
        nav ul.show {
            display: flex;
        }
    }
`;
document.head.appendChild(style);
