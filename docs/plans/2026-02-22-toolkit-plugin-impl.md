# Toolkit Plugin System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a uTools-compatible plugin runtime in Pandora with plugin marketplace, API shim layer, and enhanced built-in tools.

**Architecture:** iframe sandbox loads uTools plugins' index.html, a JS shim injects `window.utools` API, postMessage bridges to React host, which calls Tauri backend for native ops (db, clipboard, fs, shell). Built-in tools remain React components.

**Tech Stack:** Rust (Tauri backend: asar parsing, plugin DB, HTTP scraping), TypeScript/React (plugin host, marketplace UI, shim), iframe (plugin sandbox)

**Worktree:** `/mnt/d/workspace/pandora/.worktrees/toolkit-plugin`

---

## Phase 1: Rust Backend — Plugin Infrastructure

See: `docs/plans/2026-02-22-phase1-rust-backend.md`

## Phase 2: uTools API Shim + Plugin Runtime

See: `docs/plans/2026-02-22-phase2-utools-shim.md`

## Phase 3: Frontend — Marketplace + Plugin UI

See: `docs/plans/2026-02-22-phase3-frontend-ui.md`

## Phase 4: Built-in Tools Enhancement

See: `docs/plans/2026-02-22-phase4-builtin-tools.md`

## Phase 5: Preload.js Compatibility

See: `docs/plans/2026-02-22-phase5-preload-compat.md`
