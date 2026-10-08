import "./style.css";
import { content, motion } from "./content.js";

for (const node of document.querySelectorAll("[data-copy]")) {
  if (content[node.dataset.copy]) node.innerHTML = content[node.dataset.copy];
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const root = document.documentElement;
const toggle = document.querySelector("#motion-toggle");
let motionEnabled = !reducedMotion.matches;
let manuallyDisabled = false;
let scrollFrame = 0;
let headlineChars = [];
let headlineFrame = 0;

const matrixAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&@*";

function finishHeadline() {
  if (headlineFrame) cancelAnimationFrame(headlineFrame);
  headlineFrame = 0;
  for (const character of headlineChars) {
    character.node.textContent = character.value;
    character.node.classList.add("is-visible", "is-resolved");
  }
}

function startHeadlineMatrix() {
  if (!headlineChars.length || !motionEnabled || reducedMotion.matches) {
    finishHeadline();
    return;
  }
  if (headlineFrame) cancelAnimationFrame(headlineFrame);
  for (const character of headlineChars)
    character.node.classList.remove("is-visible", "is-resolved");
  const startedAt = performance.now();
  const revealDuration = 280;
  const stagger = 34;
  const tick = (now) => {
    let complete = true;
    for (const [index, character] of headlineChars.entries()) {
      const progress = Math.max(
        0,
        Math.min(1, (now - startedAt - index * stagger) / revealDuration),
      );
      if (progress < 1 && character.value !== " ") {
        character.node.textContent =
          matrixAlphabet[Math.floor(Math.random() * matrixAlphabet.length)];
        if (progress > 0) character.node.classList.add("is-visible");
        character.node.classList.remove("is-resolved");
        complete = false;
      } else {
        character.node.textContent = character.value;
        character.node.classList.add("is-visible", "is-resolved");
      }
    }
    if (complete) headlineFrame = 0;
    else headlineFrame = requestAnimationFrame(tick);
  };
  headlineFrame = requestAnimationFrame(tick);
}

function prepareHeadlineMatrix() {
  const headline = document.querySelector("#hero-title");
  if (!headline) return [];
  const reserve = document.createElement("span");
  reserve.className = "headline-reserve";
  reserve.setAttribute("aria-hidden", "true");
  reserve.innerHTML = headline.innerHTML;
  const label = reserve.textContent.replace(/\s+/g, " ").trim();
  headline.setAttribute("aria-label", label);

  const matrix = document.createElement("span");
  matrix.className = "headline-matrix";
  matrix.setAttribute("aria-hidden", "true");
  const fragment = document.createDocumentFragment();
  const characters = [];
  const walk = (nodes, inherited) => {
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        let offset = 0;
        for (const value of node.textContent) {
          const character = document.createElement("span");
          character.className = `matrix-char ${inherited}`.trim();
          character.textContent = value;
          fragment.append(character);
          const range = document.createRange();
          range.setStart(node, offset);
          range.setEnd(node, offset + value.length);
          characters.push({ node: character, value, range });
          offset += value.length;
        }
      } else if (node.nodeName === "BR") {
        // Line breaks are represented by the hidden reserve layer. The
        // animated characters are positioned over that stable layout.
      } else {
        // Keep wrapper classes (e.g. .accent) on the characters they cover.
        walk([...node.childNodes], `${inherited} ${node.className}`.trim());
      }
    }
  };
  walk([...reserve.childNodes], "");
  headline.replaceChildren(reserve, matrix);
  matrix.append(fragment);

  const positionCharacters = () => {
    const headlineRect = headline.getBoundingClientRect();
    for (const character of characters) {
      const rect = character.range.getBoundingClientRect();
      character.node.style.left = `${rect.left - headlineRect.left}px`;
      character.node.style.top = `${rect.top - headlineRect.top}px`;
      character.node.style.width = `${rect.width}px`;
      character.node.style.height = `${rect.height}px`;
    }
  };
  positionCharacters();
  new ResizeObserver(positionCharacters).observe(headline);
  document.fonts?.ready.then(positionCharacters);
  return characters;
}

function setMotion(enabled) {
  motionEnabled = enabled && !reducedMotion.matches;
  root.classList.toggle("motion-off", !motionEnabled);
  root.classList.toggle("js-motion", motionEnabled);
  toggle.setAttribute("aria-pressed", String(motionEnabled));
  document.querySelector("#motion-label").textContent = reducedMotion.matches
    ? "Reduced motion"
    : motionEnabled
      ? "Motion on"
      : "Motion off";
  toggle.disabled = reducedMotion.matches;
  if (motionEnabled) startHeadlineMatrix();
  else finishHeadline();
  updateScroll();
}

toggle.addEventListener("click", () => {
  manuallyDisabled = motionEnabled;
  setMotion(!motionEnabled);
});
reducedMotion.addEventListener("change", () => setMotion(!manuallyDisabled));

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: motion.revealThreshold },
);
document
  .querySelectorAll(".reveal")
  .forEach((node) => revealObserver.observe(node));

const footerDrawing = document.querySelector(".footer-drawing");
const blueprint = document.querySelector(".blueprint");
const sheet = blueprint.querySelector(".blueprint-svg").viewBox.baseVal;

function updateScroll() {
  scrollFrame = 0;
  if (!motionEnabled) return;
  const footerRect = footerDrawing.getBoundingClientRect();
  const progress = Math.max(
    0,
    Math.min(1, (innerHeight - footerRect.top) / (footerRect.height * 0.85)),
  );
  footerDrawing.style.setProperty("--footer-progress", progress.toFixed(3));
  const rect = blueprint.getBoundingClientRect();
  if (rect.bottom > 0 && rect.top < innerHeight) {
    const offset = (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight;
    blueprint.style.setProperty(
      "--scroll-y",
      `${(offset * motion.scrollTravel).toFixed(2)}px`,
    );
  }
}
addEventListener(
  "scroll",
  () => {
    if (motionEnabled && !scrollFrame)
      scrollFrame = requestAnimationFrame(updateScroll);
  },
  { passive: true },
);
addEventListener("resize", updateScroll, { passive: true });

for (const surface of document.querySelectorAll(".motion-surface")) {
  let x = 0;
  let y = 0;
  const move = () => {
    if (!motionEnabled) return;
    surface.style.setProperty("--move-x", `${x * motion.pointerTravel}px`);
    surface.style.setProperty("--move-y", `${y * motion.pointerTravel}px`);
    surface.classList.add("is-active");
    if (surface === blueprint) {
      const circle = surface.querySelector(".pointer-window");
      circle.setAttribute("cx", String(((x + 1) * sheet.width) / 2));
      circle.setAttribute("cy", String(((y + 1) * sheet.height) / 2));
      surface.querySelector(".coordinate").textContent =
        `X ${String(Math.round((x + 1) * 100)).padStart(3, "0")} / Y ${String(Math.round((y + 1) * 100)).padStart(3, "0")}`;
    }
  };
  const reset = () => {
    x = 0;
    y = 0;
    surface.style.setProperty("--move-x", "0px");
    surface.style.setProperty("--move-y", "0px");
    surface.classList.remove("is-active");
    if (surface === blueprint)
      surface.querySelector(".coordinate").textContent = "X 000 / Y 000";
  };
  surface.addEventListener(
    "pointermove",
    (event) => {
      if (!motionEnabled) return;
      const bounds = surface.getBoundingClientRect();
      x = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
      );
      y = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
      );
      move();
    },
    { passive: true },
  );
  surface.addEventListener("pointerleave", reset);
  surface.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") reset();
  });
  surface.addEventListener("pointercancel", reset);
  surface.addEventListener("blur", reset);
  surface.addEventListener("keydown", (event) => {
    if (event.target !== surface || !motionEnabled) return;
    if (event.key === "Escape") {
      reset();
      return;
    }
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    x = Math.max(
      -1,
      Math.min(
        1,
        x +
          (event.key === "ArrowRight"
            ? 0.15
            : event.key === "ArrowLeft"
              ? -0.15
              : 0),
      ),
    );
    y = Math.max(
      -1,
      Math.min(
        1,
        y +
          (event.key === "ArrowDown"
            ? 0.15
            : event.key === "ArrowUp"
              ? -0.15
              : 0),
      ),
    );
    move();
  });
}
headlineChars = prepareHeadlineMatrix();
setMotion(motionEnabled);

const navLinks = [...document.querySelectorAll("nav a")];
const navObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of navLinks) {
        if (link.hash === `#${entry.target.id}`)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    }
  },
  { rootMargin: "-15% 0px -45% 0px", threshold: 0 },
);
for (const link of navLinks)
  navObserver.observe(document.querySelector(link.hash));

const signup = document.querySelector(".launch-signup");
const signupEmail = signup.querySelector("input");
const signupButton = signup.querySelector("button");
const signupStatus = signup.querySelector(".signup-status");
let submitting = false;

signup.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitting || !signup.reportValidity()) return;
  submitting = true;
  signupButton.disabled = true;
  signup.setAttribute("aria-busy", "true");
  signupStatus.textContent = "Saving your place…";

  try {
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: signupEmail.value.trim() }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) {
      throw new Error(response.status === 429
        ? "Please wait a minute and try again."
        : "Couldn’t save your place. Please try again.");
    }
    signupStatus.textContent = "You’re on the list. Thanks for signing up.";
    signup.reset();
  } catch (error) {
    signupStatus.textContent = error instanceof TypeError || error.name === "TimeoutError"
      ? "Couldn’t connect. Please try again."
      : error.message === "Please wait a minute and try again."
        ? error.message
        : "Couldn’t save your place. Please try again.";
  } finally {
    submitting = false;
    signupButton.disabled = false;
    signup.removeAttribute("aria-busy");
  }
});
