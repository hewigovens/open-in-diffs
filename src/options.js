"use strict";

const form = document.getElementById("form");
const presets = document.getElementById("presets");
const status = document.getElementById("status");

for (const t of DiffTargets.PRESETS) {
  const label = document.createElement("label");
  label.className = "option";
  const icon = document.createElement("img");
  icon.src = "data:image/svg+xml," + encodeURIComponent(t.icon);
  icon.alt = "";
  const text = document.createElement("span");
  text.className = "text";
  const title = document.createElement("span");
  title.className = "title";
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = t.name;
  const host = document.createElement("span");
  host.className = "host";
  host.textContent = new URL(t.origin).host;
  title.append(name, host);
  const detail = document.createElement("span");
  detail.className = "detail";
  detail.textContent = t.privateRepos ? "Private repositories too, with a GitHub token" : "Public repositories only";
  text.append(title, detail);
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "target";
  radio.value = t.id;
  label.append(icon, text, radio);
  presets.appendChild(label);
}

function show(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function save() {
  const settings = { targetId: form.elements.target.value };
  try {
    await chrome.storage.sync.set(settings);
    show(`Saved — diffs open in ${DiffTargets.resolve(settings).name}`);
  } catch (err) {
    show(`Couldn't save: ${err.message}`, true);
  }
}

// load() never rejects; it falls back to the default viewer.
async function init() {
  form.elements.target.value = (await DiffTargets.load()).id;
}

form.addEventListener("change", save);
chrome.storage.onChanged.addListener(init);
init();
