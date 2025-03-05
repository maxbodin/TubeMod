document.addEventListener("DOMContentLoaded", initPopup);

function initPopup() {
  loadSettings();
  setupEventListeners();
}

function setupEventListeners() {
  document.getElementById("reset-settings")?.addEventListener("click", resetSettings);
  document.getElementById("save-settings")?.addEventListener("click", saveSettings);
  document.getElementById("import-settings")?.addEventListener("change", importSettings);

  setupPickerMode();
  setupCollapsibleSections();
  setupInputChangeListeners();
  setupSearch();
}

chrome.runtime.onMessage.addListener(function (message) {
  if (message.type === "popup") {
    chrome.storage.local.set({ elements: JSON.stringify(message.data) });
  }
});

/**
 *
 */
function resetSettings() {
  chrome.storage.local.clear(() => console.info("Settings cleared."));
  sendMessageToActiveTab({action: "clearLocalStorage"});
  window.close();
}

/**
 *
 */
function saveSettings() {
  sendMessageToActiveTab({action: "saveSettings"});
}

/**
 *
 * @param event
 * @returns {Promise<void>}
 */
async function importSettings(event) {
  const file = event.target.files.item(0);
  if (!file) return;

  const text = await file.text();
  sendMessageToActiveTab({action: "importSettings", content: text});
}

/**
 * Handles Picker Mode switch toggle
 */
function setupPickerMode() {
  const pickerModeSwitch = document.getElementById("picker-mode");
  if (!pickerModeSwitch) return;

  // Restore switch state from storage.
  chrome.storage.local.get(["tubemod_pickerMode"], (result) => {
    pickerModeSwitch.checked = result.tubemod_pickerMode || false;
  });

  pickerModeSwitch.addEventListener("change", (event) => {
    const enabled = event.target.checked;
    chrome.storage.local.set({tubemod_pickerMode: enabled});
    sendMessageToActiveTab({action: "togglePickerMode", enabled});
  });
}

/**
 * Loads saved settings from Chrome's local storage and applies them to the UI.
 */
function loadSettings() {
  chrome.storage.local.get(["tubemod_elements"], (result) => {
    const elements = result.tubemod_elements ? JSON.parse(result.tubemod_elements) : null;
    if (!elements) return;

    elements.forEach(({id, checked}) => {
      const el = document.getElementById(id);
      if (el) el.checked = checked;
    });
  });
}

/**
 * Initializes collapsible sections with event listeners.
 * Toggles the visibility of the associated content when clicked.
 */
function setupCollapsibleSections() {
  document.querySelectorAll(".collapsible").forEach((element) => {
    element.addEventListener("click", () => {
      element.classList.toggle("active");
      const content = element.nextElementSibling;
      if (content) {
        content.style.display = content.style.display === "block" ? "none" : "block";
      }
    });
  });
}

/**
 * Listens for changes in input fields and syncs them to the active tab.
 */
function setupInputChangeListeners() {
  document.querySelectorAll("input").forEach((element) => {
    element.addEventListener("change", () => {
      sendMessageToActiveTab({
        action: {
          target: element.id,
          hide: element.checked,
        },
      });
    });
  });
}

/**
 * Sets up the search settings functionality.
 */
function setupSearch() {
  const searchInput = document.getElementById("search-input");
  if (!searchInput) return;

  const containers = document.querySelectorAll(".container");
  const collapsibles = document.querySelectorAll(".collapsible");

  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();

    // Open all collapsible containers when searching, close them otherwise.
    collapsibles.forEach((collapsible) => {
      const content = collapsible.nextElementSibling;

      if (content) {
        content.style.display = searchTerm ? "block" : "none";
      }
    });

    containers.forEach((container) => {
      const labels = container.querySelectorAll("label");

      labels.forEach((label) => {
        const labelText = label.textContent.trim().toLowerCase();
        if (!labelText || labelText === "" || labelText === " ") return;

        const checkboxContainer = label.closest(".checkbox-container");
        if (checkboxContainer) {
          checkboxContainer.style.display = labelText.includes(searchTerm) ? "flex" : "none";
        }
      });
    });
  });
}

/**
 * Sends a message to the active tab in the current window.
 * @param {Object} message - The message object to send.
 */
function sendMessageToActiveTab(message) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}

// [...document.querySelectorAll('#sidebar input')].every(checkbox => checkbox.checked) -> if all the checkboxes are checked, we may want to collapse the sidebar or simply remove the left margin