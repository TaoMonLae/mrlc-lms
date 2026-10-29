import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider, useTheme } from '../../src/components/theme-provider';

function withWindow(value: unknown, run: () => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value });
  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

function readTheme(defaultTheme: 'light' | 'dark' | 'system' = 'light') {
  function ThemeValue() {
    const { theme, resolvedTheme } = useTheme();
    return `${theme}:${resolvedTheme}`;
  }
  return renderToStaticMarkup(createElement(ThemeProvider, {
    defaultTheme,
    children: createElement(ThemeValue),
  }));
}

test('theme provider supports server rendering without browser globals', () => {
  withWindow(undefined, () => {
    assert.equal(readTheme(), 'light:light');
    assert.equal(readTheme('dark'), 'dark:dark');
    assert.equal(readTheme('system'), 'system:light');
  });
});

test('corrupt saved preferences cannot override the application default', () => {
  for (const savedTheme of [null, '', 'invalid', 'dark extra', 'DARK']) {
    withWindow({ localStorage: { getItem: () => savedTheme } }, () => {
      assert.equal(readTheme(), 'light:light');
      assert.equal(readTheme('dark'), 'dark:dark');
    });
  }
});

test('saved system preference resolves to the current operating system theme', () => {
  for (const dark of [false, true]) {
    withWindow({
      localStorage: { getItem: () => 'system' },
      matchMedia: () => ({ matches: dark }),
    }, () => {
      assert.equal(readTheme(), `system:${dark ? 'dark' : 'light'}`);
    });
  }
});

test('an explicit saved preference takes priority over the operating system theme', () => {
  withWindow({
    localStorage: { getItem: () => 'light' },
    matchMedia: () => ({ matches: true }),
  }, () => assert.equal(readTheme('dark'), 'light:light'));
});

test('blocked storage does not prevent rendering or changing the theme', () => {
  const browser = {
    get localStorage(): never { throw new Error('Storage access denied'); },
    matchMedia: () => ({ matches: true }),
  };
  withWindow(browser, () => {
    assert.equal(readTheme(), 'light:light');
    let changeTheme: ReturnType<typeof useTheme>['setTheme'];
    function CaptureTheme() {
      changeTheme = useTheme().setTheme;
      return null;
    }
    renderToStaticMarkup(createElement(ThemeProvider, {
      defaultTheme: 'light',
      children: createElement(CaptureTheme),
    }));
    assert.doesNotThrow(() => changeTheme('dark'));
  });
});
