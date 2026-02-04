/**
 * FontAwesome Icon Configuration
 * 
 * Centralized configuration for all FontAwesome icons used throughout the application.
 * This file should be imported in main.ts to register all icons globally.
 */

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  // Navigation & Actions
  faPlus,
  faPlusCircle,
  faSearch,
  faSortUp,
  faSortDown,
  faSort,
  faEdit,
  faSave,
  faCopy,
  faSyncAlt,
  faRefresh,
  faHome,
  faTrash,
  
  // User & Roles
  faCrown,
  faUser,
  faUsers,
  faShieldAlt,
  faEye,
  faUserEdit,
  
  // Organization & Building
  faBuilding,
  faSignInAlt,
  
  // Application & Technology
  faRocket,
  faServer,
  faCube,
  faCog,
  faCode,
  faKey,
  faTools,
  faGlobe,
  
  // Charts & Analytics
  faChartBar,
  
  // Status & Feedback
  faCheckCircle,
  faExclamationCircle,
  faExclamationTriangle,
  faInfoCircle,
  faSpinner,
  faQuestionCircle,
  
  // Navigation & Movement
  faChevronLeft,
  faChevronRight,
  faArrowLeft,
  faArrowRight,
  
  // Time & History
  faClock,
  faHistory,
  
  // Security & Privacy
  faBolt,
  faHeartbeat,
  faCreditCard,
  
  // Communication
  faEnvelope,
  faMobileAlt
} from '@fortawesome/free-solid-svg-icons';

/**
 * Configure FontAwesome icons globally
 * @param library The FaIconLibrary instance
 */
export function configureFontAwesome(library: FaIconLibrary): void {
  // Register all icons used throughout the application
  library.addIcons(
    // Navigation & Actions
    faPlus,
    faPlusCircle,
    faSearch,
    faSortUp,
    faSortDown,
    faSort,
    faEdit,
    faSave,
    faCopy,
    faSyncAlt,
    faRefresh,
    faHome,
    faTrash,
    
    // User & Roles
    faCrown,
    faUser,
    faUsers,
    faShieldAlt,
    faEye,
    faUserEdit,
    
    // Organization & Building
    faBuilding,
    faSignInAlt,
    
    // Application & Technology
    faRocket,
    faServer,
    faCube,
    faCog,
    faCode,
    faKey,
    faTools,
    faGlobe,
    
    // Charts & Analytics
    faChartBar,
    
    // Status & Feedback
    faCheckCircle,
    faExclamationCircle,
    faExclamationTriangle,
    faInfoCircle,
    faSpinner,
    faQuestionCircle,
    
    // Navigation & Movement
    faChevronLeft,
    faChevronRight,
    faArrowLeft,
    faArrowRight,
    
    // Time & History
    faClock,
    faHistory,
    
    // Security & Privacy
    faBolt,
    faHeartbeat,
    faCreditCard,
    
    // Communication
    faEnvelope,
    faMobileAlt
  );
}

/**
 * List of all registered icons for reference
 * This helps developers know which icons are available
 */
export const registeredIcons = [
  // Navigation & Actions
  'plus',
  'plus-circle',
  'search',
  'sort-up',
  'sort-down',
  'sort',
  'edit',
  'save',
  'copy',
  'sync-alt',
  'refresh',
  'home',
  'trash',
  
  // User & Roles
  'crown',
  'user',
  'users',
  'shield-alt',
  'eye',
  'user-edit',
  
  // Organization & Building
  'building',
  'sign-in-alt',
  
  // Application & Technology
  'rocket',
  'server',
  'cube',
  'cog',
  'code',
  'key',
  'tools',
  'globe',
  
  // Charts & Analytics
  'chart-bar',
  
  // Status & Feedback
  'check-circle',
  'exclamation-circle',
  'exclamation-triangle',
  'info-circle',
  'spinner',
  'question-circle',
  
  // Navigation & Movement
  'chevron-left',
  'chevron-right',
  'arrow-left',
  'arrow-right',
  
  // Time & History
  'clock',
  'history',
  
  // Security & Privacy
  'bolt',
  'heartbeat',
  'credit-card',
  
  // Communication
  'envelope',
  'mobile-alt'
] as const;

export type RegisteredIconName = typeof registeredIcons[number];