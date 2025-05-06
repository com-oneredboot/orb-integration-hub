// file: frontend/src/app/features/user/components/test/test.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: Test component to verify our code is working

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test',
  template: `
    <div>
      <h1>Test Component</h1>
      <p>If you can see this, the basic component functionality is working!</p>
    </div>
  `,
  styles: [`
    h1 { color: blue; }
    p { color: green; }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class TestComponent {
  constructor() {
    console.log('TestComponent initialized');
  }
} 