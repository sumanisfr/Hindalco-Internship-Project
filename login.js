// Tailwind CSS Configuration
tailwind.config = {
  theme: {
    extend: {
      colors: {
        "hindalco-purple": "#6B46C1",
        "hindalco-purple-dark": "#553C9A",
        "hindalco-gold": "#FFD700",
        "hindalco-blue": "#1e3a8a",
      },
      animation: {
        flicker: "flicker 2s infinite alternate",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        flicker: {
          "0%": { opacity: "0.8" },
          "100%": { opacity: "1" },
        },
      },
      backgroundImage: {
        industrial:
          "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('./images/bg_img.png')",
      },
    },
  },
};

// DOM Content Loaded Event
document.addEventListener("DOMContentLoaded", function () {
  // Login Form Handler
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      // Basic validation
      if (!email || !password) {
        alert("Please fill in all fields.");
        return;
      }
      // Redirect to user.html after successful login
      if (email === "user@hindalco.com" && password === "password") {
        alert("Login successful!");
        window.location.href = "user.html";
        return;
      }
      // Simulate login
      if (email === "user@hindalco.com" && password === "password") {
        alert("Login successful!");
      } else {
        alert("Invalid email or password.");
      }
    });
  }
});

// Responsive Navbar Toggle
const navbarToggle = document.getElementById("navbarToggle");
if (navbarToggle) {
  navbarToggle.addEventListener("click", function () {
    const navbarMenu = document.getElementById("navbarMenu");
    if (navbarMenu) {
      navbarMenu.classList.toggle("hidden");
    }
  });
}
// Smooth Scroll for Anchor Links

const anchorLinks = document.querySelectorAll('a[href^="user.html"]');
anchorLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href").substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});
// Dark Mode Toggle
const darkModeToggle = document.getElementById("darkModeToggle");
if (darkModeToggle) {
  darkModeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark");
  });
}

// Form Validation

const form = document.getElementById("contactForm");

if (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;

    // Basic validation
    if (!name || !email || !message) {
      alert("Please fill in all fields.");
      return;
    }

    // Simulate form submission
    alert("Form submitted successfully!");
  });
}

// Image Slider

const sliderImages = document.querySelectorAll(".slider-image");
let currentIndex = 0;
function showImage(index) {
  sliderImages.forEach((img, i) => {
    img.style.display = i === index ? "block" : "none";
  });
}
function nextImage() {
  currentIndex = (currentIndex + 1) % sliderImages.length;
  showImage(currentIndex);
}
function prevImage() {
  currentIndex = (currentIndex - 1 + sliderImages.length) % sliderImages.length;
  showImage(currentIndex);
}
document.addEventListener("DOMContentLoaded", function () {
  showImage(currentIndex);
  document.getElementById("nextBtn").addEventListener("click", nextImage);
  document.getElementById("prevBtn").addEventListener("click", prevImage);
});
// Scroll to Top Button
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

if (scrollToTopBtn) {
  scrollToTopBtn.addEventListener("click", function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}
