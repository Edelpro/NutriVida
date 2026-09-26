import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { FlujoPlanNutricionalComponent } from './flujo-plan-nutricional.component';

describe('FlujoPlanNutricionalComponent', () => {
  const cases = [
    { step: 1, previous: null, next: 'Siguiente: Platos', nextPath: '/platos' },
    {
      step: 2,
      previous: 'Anterior: Catálogo',
      next: 'Siguiente: Menú del paciente',
      nextPath: '/menus',
    },
    {
      step: 3,
      previous: 'Anterior: Platos',
      next: 'Siguiente: Seguimiento',
      nextPath: '/seguimientos',
    },
    {
      step: 4,
      previous: 'Anterior: Menú del paciente',
      next: 'Finalizar: Ver reportes',
      nextPath: '/reportes',
    },
  ] as const;

  for (const testCase of cases) {
    it(`presenta la navegación correcta en el paso ${testCase.step}`, async () => {
      await TestBed.configureTestingModule({
        imports: [FlujoPlanNutricionalComponent],
        providers: [provideRouter([])],
      }).compileComponents();

      const fixture = TestBed.createComponent(FlujoPlanNutricionalComponent);
      fixture.componentRef.setInput('currentStep', testCase.step);
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      const links = Array.from(
        element.querySelectorAll<HTMLAnchorElement>('.flow-actions a'),
      );
      const next = links.at(-1);

      expect(next?.textContent?.replace(/\s+/g, ' ').trim()).toContain(testCase.next);
      expect(next?.getAttribute('href')).toBe(testCase.nextPath);

      if (testCase.previous === null) {
        expect(links).toHaveLength(1);
      } else {
        expect(links).toHaveLength(2);
        expect(links[0].textContent?.replace(/\s+/g, ' ').trim()).toContain(testCase.previous);
      }
    });
  }
});
