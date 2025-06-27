function showSection(id) {
  const sections = document.querySelectorAll(".section");
  sections.forEach((section) => section.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function logout() {
  alert("Logged out");
  window.location.href = "login.html"; // Simulate redirection after logout
}

document.addEventListener("DOMContentLoaded", function () {
  // Show the default section
  showSection("home");

  // Add event listeners to navigation links
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      showSection(targetId);
    });
  });

  // Add logout functionality
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }
});

// Smooth scroll for anchor links
const anchorLinks = document.querySelectorAll('a[href^="./login/index"]');
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

// user logout functionality
document.addEventListener("DOMContentLoaded", function () {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      alert("You have been logged out.");
      window.location.href = "login.html"; // Redirect to login page
    });
  }

  // Add event listener for the login button
  const loginButton = document.getElementById("loginButton");
  if (loginButton) {
    loginButton.addEventListener("click", function (e) {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      if (!email || !password) {
        alert("Please fill in all fields.");
        return;
      }
      // Simulate login
      if (email === "user@example.com" && password === "password123") {
        alert("Login successful!");
        window.location.href = "login.html"; // Redirect to dashboard
      } else {
        alert("Invalid email or password.");
      }
    });
  }
});
