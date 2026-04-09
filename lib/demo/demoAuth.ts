"use client";

const DEMO_KEY = "campus_demo_authed";

export function enableDemoAuthed() {
  try {
    window.localStorage.setItem(DEMO_KEY, "1");
  } catch {
    // ignore
  }
}

export function isDemoAuthed() {
  try {
    return window.localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}

