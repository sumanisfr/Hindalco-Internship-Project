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

// User credentials and their respective redirect pages
const userCredentials = {
  "user@hindalco.com": {
    password: "password",
    redirect: "user.html",
    role: "User",
  },
  // for manager
  "manager@hindalco.com": {
    password: "password",
    redirect: "manager.html",
    role: "Manager",
  },
  "admin@hindalco.com": {
    password: "password",
    redirect: "admin.html",
    role: "Admin",
  },
};

// Authentication function
function authenticateUser(email, password) {
  const user = userCredentials[email];
  if (user && user.password === password) {
    return user;
  }
  return null;
}

// Universal login handler function
function handleLogin() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) {
    alert("Email or password field not found.");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  // Authenticate user
  const authenticatedUser = authenticateUser(email, password);

  if (authenticatedUser) {
    alert(`Login successful! Welcome, ${authenticatedUser.role}.`);

    // Store user session (using sessionStorage instead of localStorage for security)
    sessionStorage.setItem(
      "currentUser",
      JSON.stringify({
        email: email,
        role: authenticatedUser.role,
      })
    );

    // Redirect to appropriate page
    window.location.href = authenticatedUser.redirect;
  } else {
    alert("Invalid email or password. Please try again.");
    // Clear the password field for security
    passwordInput.value = "";
  }
}

// DOM Content Loaded Event
document.addEventListener("DOMContentLoaded", function () {
  // Universal Login Form Handler
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      handleLogin();
    });
  }

  // Individual login button handlers
  const userLoginButton = document.getElementById("userLoginButton");
  const managerLoginButton = document.getElementById("managerLoginButton");
  const adminLoginButton = document.getElementById("adminLoginButton");

  if (userLoginButton) {
    userLoginButton.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogin();
    });
  }

  if (managerLoginButton) {
    managerLoginButton.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogin();
    });
  }

  if (adminLoginButton) {
    adminLoginButton.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogin();
    });
  }

  // Direct redirect buttons (without login)
  const redirectToUser = document.getElementById("redirectToUser");
  const redirectToManager = document.getElementById("redirectToManager");
  const redirectToAdmin = document.getElementById("redirectToAdmin");

  if (redirectToUser) {
    redirectToUser.addEventListener("click", function () {
      window.location.href = "user.html";
    });
  }

  if (redirectToManager) {
    redirectToManager.addEventListener("click", function () {
      window.location.href = "manager.html";
    });
  }

  if (redirectToAdmin) {
    redirectToAdmin.addEventListener("click", function () {
      window.location.href = "admin.html";
    });
  }

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

  // Dark Mode Toggle
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", function () {
      document.body.classList.toggle("dark");
    });
  }

  // Image Slider Initialization
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
    currentIndex =
      (currentIndex - 1 + sliderImages.length) % sliderImages.length;
    showImage(currentIndex);
  }

  if (sliderImages.length > 0) {
    showImage(currentIndex);
    const nextBtn = document.getElementById("nextBtn");
    const prevBtn = document.getElementById("prevBtn");

    if (nextBtn) {
      nextBtn.addEventListener("click", nextImage);
    }
    if (prevBtn) {
      prevBtn.addEventListener("click", prevImage);
    }
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

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert("Please enter a valid email address.");
        return;
      }

      // Simulate form submission
      alert("Form submitted successfully!");
    });
  }

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
});

// Smooth Scroll for Anchor Links
document.addEventListener("DOMContentLoaded", function () {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
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
});

// Check if user is already logged in (for protected pages)
function checkAuthentication(requiredRole = null) {
  const currentUser = sessionStorage.getItem("currentUser");
  if (!currentUser) {
    // Redirect to login page if not authenticated
    window.location.href = "index.html";
    return false;
  }

  const user = JSON.parse(currentUser);
  if (requiredRole && user.role !== requiredRole) {
    alert("Access denied. Insufficient permissions.");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

// Logout function
function logout() {
  sessionStorage.removeItem("currentUser");
  alert("Logged out successfully!");
  window.location.href = "index.html";
}
