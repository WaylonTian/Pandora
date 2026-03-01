# API Tester Optimization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade API Tester to Postman-level functionality: resizable layouts, nested collections, template variables, enhanced scripts, cookie manager, Swagger URL import.

**Architecture:** Extract shared resizable layout components, enhance existing API Tester with new features incrementally. Backend changes minimal (cookie store + swagger fetch).

**Tech Stack:** React, Zustand, Tauri (Rust), js-yaml (new dep for YAML swagger)

**Worktree:** `/mnt/d/workspace/pandora/.worktrees/api-tester-opt`

---

## Phase 1: Resizable Layout Components (Task 1-3)
See: `docs/plans/2026-02-22-api-opt-phase1.md`

## Phase 2: Collection Nesting + Swagger Import (Task 4-6)
See: `docs/plans/2026-02-22-api-opt-phase2.md`

## Phase 3: Template Variables + Scripts + Cookies (Task 7-10)
See: `docs/plans/2026-02-22-api-opt-phase3.md`
