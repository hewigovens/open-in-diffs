"use strict";

const form = document.getElementById("form");
const presets = document.getElementById("presets");
const status = document.getElementById("status");

for (const t of DiffTargets.PRESETS) {
  const label = document.createElement("label");
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "target";
  radio.value = t.id;
  const name = document.createElement("span");
  name.textContent = t.name;
  const host = document.createElement("span");
  host.className = "note";
  host.textContent = new URL(t.origin).host;
  label.append(radio, name, host);
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
    show(`Saved: ${DiffTargets.resolve(settings).name}`);
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
