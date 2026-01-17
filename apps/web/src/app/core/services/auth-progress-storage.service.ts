// file: apps/web/src/app/core/services/auth-progress-storage.service.ts
// author: Corey Dale Peters
// date: 2026-01-17
// description: Service for persisting auth progress to local storage

import { Injectable } from '@angular/core';
import { AuthSteps } from '../../features/user/store/user.state';

/**
 * Auth progress stored in local storage
 */
export interface AuthProgress {
  email: string;
  step: AuthSteps;
  timestamp: number;
  cognitoSub?: string;
  expiresAt: number;
}

const STORAGE_KEY = 'orb_auth_progress';
const EXPIRY_HOURS = 24;

@Injectable({
  providedIn: 'root'
})
export class AuthProgressStorageService {

  /**
   * Save auth progress to local storage
   * @param progress Auth progress to save
   */
  save(progress: Omit<AuthProgress, 'expiresAt'>): void {
    try {
      const progressWithExpiry: AuthProgress = {
        ...progress,
        expiresAt: Date.now() + (EXPIRY_HOURS * 60 * 60 * 1000)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressWithExpiry));
    } catch (error) {
      // localStorage may be unavailable (private browsing, storage full, etc.)
      console.warn('[AuthProgressStorage] Failed to save progress:', error);
    }
  }

  /**
   * Get saved auth progress from local storage
   * @returns AuthProgress or null if not found or expired
   */
  get(): AuthProgress | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const progress: AuthProgress = JSON.parse(stored);
      
      // Check if expired
      if (!this.isValid(progress)) {
        this.clear();
        return null;
      }

      return progress;
    } catch (error) {
      // JSON parse error or localStorage unavailable
      console.warn('[AuthProgressStorage] Failed to get progress:', error);
      return null;
    }
  }

  /**
   * Clear saved auth progress
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[AuthProgressStorage] Failed to clear progress:', error);
    }
  }

  /**
   * Check if saved progress is still valid (not expired)
   * @param progress Auth progress to check
   * @returns true if valid, false if expired or invalid
   */
  isValid(progress: AuthProgress | null): boolean {
    if (!progress) return false;
    if (!progress.email) return false;
    if (!progress.step) return false;
    if (!progress.expiresAt) return false;
    
    return progress.expiresAt > Date.now();
  }

  /**
   * Update just the step in saved progress
   * @param step New auth step
   */
  updateStep(step: AuthSteps): void {
    const current = this.get();
    if (current) {
      this.save({
        ...current,
        step,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Check if there's resumable progress for an email
   * @param email Email to check
   * @returns true if there's valid progress for this email
   */
  hasProgressForEmail(email: string): boolean {
    const progress = this.get();
    if (!progress) return false;
    return progress.email.toLowerCase() === email.toLowerCase();
  }
}
