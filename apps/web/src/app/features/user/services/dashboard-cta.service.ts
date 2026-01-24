// file: apps/web/src/app/features/user/services/dashboard-cta.service.ts
// author: Kiro
// date: 2026-01-23
// description: Service for generating CTA cards based on user state and role

import { Injectable } from '@angular/core';
import { IUsers } from '../../../core/models/UsersModel';
import { CtaCard, CtaCardCategory } from '../components/dashboard/dashboard.types';

/**
 * Service responsible for generating CTA cards for the dashboard
 * based on user profile completion status and role membership.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardCtaService {

  /**
   * Get all applicable CTA cards for a user, sorted by priority.
   * Health cards appear first, followed by role-specific cards.
   * @param user The current user
   * @returns Array of CTA cards sorted by priority
   */
  getCtaCards(user: IUsers | null): CtaCard[] {
    if (!user) {
      return [];
    }

    const cards: CtaCard[] = [];

    // Always add health cards for incomplete items
    cards.push(...this.getHealthCards(user));

    // Add role-specific cards (mutually exclusive)
    if (this.isCustomerUser(user)) {
      cards.push(...this.getCustomerActionCards(user));
    } else {
      cards.push(...this.getUserBenefitCards());
    }

    // Sort by priority (lower = higher priority)
    return cards.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get health CTA cards for incomplete profile items.
   * Each incomplete item generates exactly one card.
   * @param user The current user
   * @returns Array of health CTA cards
   */
  getHealthCards(user: IUsers | null): CtaCard[] {
    if (!user) {
      return [];
    }

    const cards: CtaCard[] = [];

    // Check for incomplete name
    if (!this.hasValidName(user)) {
      cards.push({
        id: 'health-name',
        icon: 'user',
        title: 'Complete Your Profile',
        description: 'Your profile is missing your name. Adding your first and last name helps personalize your experience and makes it easier for team members to identify you.',
        actionLabel: 'Update Profile',
        actionRoute: '/profile',
        actionQueryParams: { mode: 'setup', startFrom: 'incomplete' },
        priority: 10,
        category: 'health'
      });
    }

    // Check for unverified email
    if (!user.emailVerified) {
      cards.push({
        id: 'health-email',
        icon: 'envelope',
        title: 'Verify Your Email',
        description: 'Your email address has not been verified yet. Confirming your email ensures you receive important notifications and helps secure your account against unauthorized access.',
        actionLabel: 'Verify Email',
        actionRoute: '/authenticate',
        priority: 20,
        category: 'health'
      });
    }

    // Check for unverified phone
    if (!user.phoneVerified) {
      cards.push({
        id: 'health-phone',
        icon: 'phone',
        title: 'Verify Your Phone',
        description: 'Adding and verifying your phone number provides an additional layer of security for account recovery and enables two-factor authentication via SMS.',
        actionLabel: user.phoneNumber ? 'Verify Phone' : 'Add Phone',
        actionRoute: '/profile',
        actionQueryParams: { mode: 'setup', startFrom: 'incomplete' },
        priority: 30,
        category: 'health'
      });
    }

    // Check for incomplete MFA setup
    if (!this.isMfaComplete(user)) {
      cards.push({
        id: 'health-mfa',
        icon: 'shield-alt',
        title: 'Secure Your Account',
        description: 'Multi-factor authentication (MFA) adds an extra layer of protection to your account. Enable MFA to prevent unauthorized access even if your password is compromised.',
        actionLabel: 'Setup MFA',
        actionRoute: '/authenticate',
        priority: 40,
        category: 'health'
      });
    }

    return cards;
  }

  /**
   * Get benefit CTA cards for USER role (non-customers).
   * These cards promote upgrading to CUSTOMER status.
   * @returns Array of benefit CTA cards
   */
  getUserBenefitCards(): CtaCard[] {
    return [
      {
        id: 'benefit-orgs',
        icon: 'building',
        title: 'Manage Organizations',
        description: 'Upgrade to create and manage business entities, invite team members with role-based permissions, and maintain full control over your organization\'s access and settings.',
        actionLabel: 'Upgrade Now',
        actionRoute: '/upgrade', // Placeholder route
        priority: 100,
        category: 'benefit'
      },
      {
        id: 'benefit-integrations',
        icon: 'plug',
        title: 'Connect Integrations',
        description: 'Link your favorite third-party services like Stripe, PayPal, and more. Seamlessly connect payment processors, analytics tools, and business applications to power your workflow.',
        actionLabel: 'Learn More',
        actionRoute: '/upgrade', // Placeholder route
        priority: 110,
        category: 'benefit'
      },
      {
        id: 'benefit-team',
        icon: 'users',
        title: 'Build Your Team',
        description: 'Invite team members to collaborate on projects, assign granular roles and permissions, and work together efficiently with shared access to resources and applications.',
        actionLabel: 'Get Started',
        actionRoute: '/upgrade', // Placeholder route
        priority: 120,
        category: 'benefit'
      }
    ];
  }

  /**
   * Get action CTA cards for CUSTOMER role.
   * Cards are conditional based on user's current state.
   * @param user The current user
   * @returns Array of action CTA cards
   */
  getCustomerActionCards(user: IUsers | null): CtaCard[] {
    if (!user) {
      return [];
    }

    const cards: CtaCard[] = [];

    // For now, we'll show the "Create Organization" card
    // In the future, this would check if user has organizations
    // TODO: Integrate with organizations store/service
    cards.push({
      id: 'action-create-org',
      icon: 'plus-circle',
      title: 'Create Your First Organization',
      description: 'Set up your business entity to get started. Organizations allow you to manage teams, applications, and integrations all in one place with centralized billing and access control.',
      actionLabel: 'Create Organization',
      actionRoute: '/customers/organizations/create',
      priority: 100,
      category: 'action'
    });

    // Always show manage organizations card for customers
    cards.push({
      id: 'action-manage-orgs',
      icon: 'building',
      title: 'Manage Organizations',
      description: 'View and manage your existing organizations, update settings, invite or remove team members, and configure access permissions for your business entities.',
      actionLabel: 'View Organizations',
      actionRoute: '/customers/organizations',
      priority: 110,
      category: 'action'
    });

    // Add application card
    cards.push({
      id: 'action-add-app',
      icon: 'cube',
      title: 'Add Your First Application',
      description: 'Create an application to start integrating services. Applications provide API keys and configuration for connecting your software with our platform\'s powerful features.',
      actionLabel: 'Create Application',
      actionRoute: '/customers/applications/create',
      priority: 120,
      category: 'action'
    });

    return cards;
  }

  /**
   * Check if user has a valid first and last name
   */
  private hasValidName(user: IUsers | null): boolean {
    return !!(user?.firstName?.trim() && user?.lastName?.trim());
  }

  /**
   * Check if user has completed MFA setup
   */
  private isMfaComplete(user: IUsers | null): boolean {
    return !!(user?.mfaEnabled && user?.mfaSetupComplete);
  }

  /**
   * Check if user is a CUSTOMER
   */
  private isCustomerUser(user: IUsers | null): boolean {
    return user?.groups?.includes('CUSTOMER') || false;
  }

  /**
   * Count incomplete health items for a user
   * @param user The current user
   * @returns Number of incomplete health items
   */
  countIncompleteHealthItems(user: IUsers | null): number {
    if (!user) return 4; // All items incomplete if no user

    let count = 0;
    if (!this.hasValidName(user)) count++;
    if (!user.emailVerified) count++;
    if (!user.phoneVerified) count++;
    if (!this.isMfaComplete(user)) count++;
    return count;
  }

  /**
   * Get cards filtered by category
   * @param cards Array of CTA cards
   * @param category Category to filter by
   * @returns Filtered array of cards
   */
  filterByCategory(cards: CtaCard[], category: CtaCardCategory): CtaCard[] {
    return cards.filter(card => card.category === category);
  }
}
