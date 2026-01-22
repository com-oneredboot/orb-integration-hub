// file: apps/web/src/app/shared/components/progress-steps/progress-steps.component.ts
// author: Corey Dale Peters
// date: 2025-01-22
// description: Shared progress steps component for multi-step flows

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProgressStep {
  number: number;
  label: string;
}

@Component({
  selector: 'app-progress-steps',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-steps" 
         role="progressbar" 
         [attr.aria-valuenow]="currentStep"
         [attr.aria-valuemin]="1" 
         [attr.aria-valuemax]="steps.length"
         [attr.aria-label]="'Progress: Step ' + currentStep + ' of ' + steps.length">
      
      <!-- Screen reader announcement -->
      <span class="sr-only">Step {{ currentStep }} of {{ steps.length }}: {{ getCurrentStepLabel() }}</span>
      
      <!-- Progress percentage bar (line between steps) -->
      <div class="progress-steps__bar">
        <div class="progress-steps__bar-fill" 
             [style.width.%]="getProgressPercentage()">
        </div>
      </div>
      
      <!-- Progress steps with labels -->
      <div class="progress-steps__container">
        <div class="progress-steps__step-wrapper"
             *ngFor="let step of steps"
             [ngClass]="{
               'step-active': currentStep === step.number,
               'step-completed': currentStep > step.number,
               'step-pending': currentStep < step.number
             }">
          
          <!-- Step circle/indicator -->
          <div class="progress-steps__step"
               [ngClass]="{
                 'progress-steps__step--active': currentStep === step.number,
                 'progress-steps__step--completed': currentStep > step.number,
                 'progress-steps__step--pending': currentStep < step.number
               }"
               [attr.aria-label]="step.label">
            
            <!-- Step number or check icon -->
            <span class="progress-steps__step-content">
              <i *ngIf="currentStep > step.number" 
                 class="fa fa-check" 
                 aria-hidden="true"></i>
              <span *ngIf="currentStep <= step.number">{{ step.number }}</span>
            </span>
          </div>
          
          <!-- Step label -->
          <div class="progress-steps__step-label">
            {{ step.label }}
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./progress-steps.component.scss']
})
export class ProgressStepsComponent {
  @Input() steps: ProgressStep[] = [];
  @Input() currentStep = 1;

  getProgressPercentage(): number {
    if (this.steps.length <= 1) return 0;
    return ((this.currentStep - 1) / (this.steps.length - 1)) * 100;
  }

  getCurrentStepLabel(): string {
    const step = this.steps.find(s => s.number === this.currentStep);
    return step?.label || '';
  }
}
