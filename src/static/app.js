document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const staffLoginForm = document.getElementById("staff-login-form");
  const staffLoginContainer = document.getElementById("staff-login-container");
  const staffPassword = document.getElementById("staff-password");
  const staffStatus = document.getElementById("staff-status");
  const signupContainer = document.getElementById("signup-container");
  const staffLogoutButton = document.getElementById("staff-logout");
  const messageDiv = document.getElementById("message");
  let staffAuthorization = null;
  let activityRequestId = 0;

  function encodeBasicCredentials(username, password) {
    const bytes = new TextEncoder().encode(`${username}:${password}`);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return `Basic ${btoa(binary)}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  async function fetchActivities() {
    const requestId = ++activityRequestId;
    try {
      const endpoint = staffAuthorization ? "/staff/activities" : "/activities";
      const headers = staffAuthorization
        ? { Authorization: staffAuthorization }
        : {};
      const response = await fetch(endpoint, { headers });
      if (requestId !== activityRequestId) {
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load activities");
      }
      const activities = await response.json();
      if (requestId !== activityRequestId) {
        return;
      }
      activitiesList.innerHTML = "";
      activitySelect.replaceChildren(new Option("-- Select an activity --", ""));

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        const participantCount = staffAuthorization
          ? details.participants.length
          : details.participant_count;
        const spotsLeft = details.max_participants - participantCount;
        const participantsHTML = staffAuthorization
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              ${
                details.participants.length > 0
                  ? `<ul class="participants-list">
                      ${details.participants
                        .map(
                          (email) =>
                            `<li><span class="participant-email">${escapeHtml(email)}</span><button class="delete-btn" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(email)}" aria-label="Remove ${escapeHtml(email)} from ${escapeHtml(name)}">Remove</button></li>`
                        )
                        .join("")}
                    </ul>`
                  : "<p><em>No participants yet</em></p>"
              }
            </div>`
          : `<p><strong>Registered:</strong> ${participantCount}</p>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      if (requestId !== activityRequestId) {
        return;
      }
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: staffAuthorization },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { Authorization: staffAuthorization },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  staffLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("staff-username").value;
    const password = staffPassword.value;
    const authorization = encodeBasicCredentials(username, password);

    try {
      const response = await fetch("/staff/session", {
        headers: { Authorization: authorization },
      });
      const result = await response.json();
      if (!response.ok) {
        staffStatus.textContent = result.detail || "Sign in failed.";
        staffStatus.className = "error";
        return;
      }

      staffAuthorization = authorization;
      staffPassword.value = "";
      staffLoginContainer.classList.add("hidden");
      signupContainer.classList.remove("hidden");
      fetchActivities();
    } catch (error) {
      staffStatus.textContent = "Unable to sign in. Please try again.";
      staffStatus.className = "error";
      console.error("Error signing in:", error);
    }
  });

  staffLogoutButton.addEventListener("click", () => {
    staffAuthorization = null;
    signupContainer.classList.add("hidden");
    staffLoginContainer.classList.remove("hidden");
    activitiesList.innerHTML = "<p>Loading activities...</p>";
    staffStatus.textContent = "Signed out. Sign in to manage student registrations.";
    staffStatus.className = "";
    staffLoginForm.reset();
    fetchActivities();
  });

  fetchActivities();
});
